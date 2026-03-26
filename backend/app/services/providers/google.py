"""Google AI Provider (Imagen 4, Veo 3 / 3.1)"""

import base64
import logging
from typing import Optional

import httpx

from app.config import settings
from app.services.providers.base import BaseProvider, GenerationResult

logger = logging.getLogger(__name__)


class GoogleProvider(BaseProvider):
    """Google AI (Vertex AI) Provider"""

    BASE_URL = "https://generativelanguage.googleapis.com/v1beta"

    def __init__(self):
        self.api_key = settings.GOOGLE_AI_API_KEY

    async def generate_image(
        self,
        prompt: str,
        negative_prompt: Optional[str] = None,
        **params,
    ) -> GenerationResult:
        """Imagen 4로 이미지 생성 (동기 — 즉시 결과 반환)"""
        aspect_ratio = params.get("aspect_ratio", "1:1")
        body = {
            "instances": [{"prompt": prompt}],
            "parameters": {
                "sampleCount": 1,
                "aspectRatio": aspect_ratio,
                "personGeneration": "allow_all",
            },
        }
        # Imagen 4는 negativePrompt 미지원 (Imagen 3.0 이하만 지원)

        async with httpx.AsyncClient(timeout=120) as client:
            resp = await client.post(
                f"{self.BASE_URL}/models/imagen-4.0-generate-001:predict",
                params={"key": self.api_key},
                json=body,
            )

        if resp.status_code != 200:
            error_code = "PROVIDER_ERROR"
            error_message = f"Google API 오류: {resp.status_code}"
            try:
                err_data = resp.json()
                err_detail = err_data.get("error", {})
                error_message = err_detail.get("message", error_message)
                if err_detail.get("code") == 400 and "safety" in error_message.lower():
                    error_code = "CONTENT_POLICY"
            except Exception:
                pass
            return GenerationResult(
                status="failed",
                error_code=error_code,
                error_message=error_message,
            )

        data = resp.json()
        predictions = data.get("predictions", [])
        if not predictions:
            return GenerationResult(
                status="failed",
                error_code="CONTENT_POLICY",
                error_message="이미지 생성 결과가 없습니다. 안전 필터에 의해 차단되었을 수 있습니다.",
            )

        prediction = predictions[0]
        b64 = prediction.get("bytesBase64Encoded", "")
        mime = prediction.get("mimeType", "image/png")
        result_url = f"data:{mime};base64,{b64}"
        return GenerationResult(status="completed", result_url=result_url, progress=100)

    async def generate_video(
        self,
        prompt: str,
        input_image_url: Optional[str] = None,
        **params,
    ) -> GenerationResult:
        """Veo 모델로 비디오 생성 (비동기 — polling 필요)"""
        # model_id에 따라 API 모델명 결정
        model_id = params.get("model_id", "veo-3")
        api_model = {
            "veo-3": "veo-3.0-generate-001",
            "veo-3.1": "veo-3.1-generate-preview",
            "veo-3.1-fast": "veo-3.1-fast-generate-preview",
        }.get(model_id, "veo-3.0-generate-001")

        # duration 값을 숫자로 변환하고 Veo 범위(4-8) 내로 클램핑
        raw_duration = params.get("duration", 5)
        try:
            duration_sec = int(raw_duration)
        except (ValueError, TypeError):
            duration_sec = 5
        duration_sec = max(4, min(8, duration_sec))

        parameters = {
            "aspectRatio": params.get("aspect_ratio", "16:9"),
        }
        # image-to-video 모드에서는 durationSeconds 미지원일 수 있음
        if not input_image_url:
            parameters["durationSeconds"] = duration_sec

        logger.info("Veo request: model=%s, duration=%s, has_image=%s", api_model, duration_sec, bool(input_image_url))

        body = {
            "instances": [{"prompt": prompt}],
            "parameters": parameters,
        }
        if input_image_url:
            # Veo 3.1은 uri를 지원하지 않으므로 base64로 변환
            try:
                async with httpx.AsyncClient(timeout=60, follow_redirects=True) as dl:
                    img_resp = await dl.get(input_image_url)
                    img_resp.raise_for_status()
                img_b64 = base64.b64encode(img_resp.content).decode()
                mime_type = img_resp.headers.get("content-type", "image/png")
                body["instances"][0]["image"] = {
                    "bytesBase64Encoded": img_b64,
                    "mimeType": mime_type,
                }
            except Exception as e:
                logger.error("이미지 다운로드 실패: %s", e)
                body["instances"][0]["image"] = {"uri": input_image_url}

        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                f"{self.BASE_URL}/models/{api_model}:predictLongRunning",
                params={"key": self.api_key},
                json=body,
            )

        if resp.status_code != 200:
            detail = ""
            try:
                err_body = resp.json()
                detail = err_body.get("error", {}).get("message", resp.text[:200])
            except Exception:
                detail = resp.text[:200]
            logger.error("Google Veo API error %s: %s", resp.status_code, detail)
            return GenerationResult(
                status="failed",
                error_code="PROVIDER_ERROR",
                error_message=f"Google API 오류: {resp.status_code} - {detail}",
            )

        data = resp.json()
        operation_name = data.get("name", "")
        return GenerationResult(
            status="processing",
            provider_job_id=operation_name,
            progress=0,
        )

    async def check_status(self, provider_job_id: str) -> GenerationResult:
        """Long-running operation 상태 확인"""
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(
                f"{self.BASE_URL}/{provider_job_id}",
                params={"key": self.api_key},
            )

        if resp.status_code != 200:
            return GenerationResult(
                status="failed",
                error_code="PROVIDER_ERROR",
                error_message=f"상태 확인 실패: {resp.status_code}",
            )

        data = resp.json()
        if data.get("done"):
            result = data.get("response", {})
            video_url = ""

            # Veo 3.1 응답: generateVideoResponse.generatedSamples[].video.uri
            samples = (
                result.get("generateVideoResponse", {})
                .get("generatedSamples", [])
            )
            if samples:
                video_url = samples[0].get("video", {}).get("uri", "")

            # Veo 3 레거시 응답: predictions[].uri
            if not video_url:
                predictions = result.get("predictions", [])
                if predictions:
                    video_url = predictions[0].get("uri", "")

            # Google API URL은 API 키가 필요하므로 키를 붙여 다운로드 가능하게 처리
            if video_url and "generativelanguage.googleapis.com" in video_url:
                separator = "&" if "?" in video_url else "?"
                video_url = f"{video_url}{separator}key={self.api_key}"

            if not video_url:
                error = data.get("error", {})
                error_msg = error.get("message", "") if isinstance(error, dict) else ""
                return GenerationResult(
                    status="failed",
                    error_code="CONTENT_POLICY",
                    error_message=error_msg or "콘텐츠 정책에 의해 비디오가 차단되었습니다.",
                )

            if not video_url:
                # done=true인데 결과 URL이 없으면 콘텐츠 정책 등으로 차단된 것
                error = data.get("error", {})
                error_msg = error.get("message", "") if error else ""
                return GenerationResult(
                    status="failed",
                    error_code="CONTENT_POLICY",
                    error_message=error_msg or "비디오가 생성되었으나 결과를 받지 못했습니다. 콘텐츠 정책에 의해 차단되었을 수 있습니다.",
                )

            return GenerationResult(
                status="completed",
                result_url=video_url,
                progress=100,
            )

        # 아직 처리 중
        metadata = data.get("metadata", {})
        progress = metadata.get("progressPercent", 0)
        return GenerationResult(
            status="processing",
            provider_job_id=provider_job_id,
            progress=progress,
        )
