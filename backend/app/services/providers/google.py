"""Google AI Provider (Imagen 4, Veo 3)"""

from typing import Optional

import httpx

from app.config import settings
from app.services.providers.base import BaseProvider, GenerationResult


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
            },
        }
        if negative_prompt:
            body["parameters"]["negativePrompt"] = negative_prompt

        async with httpx.AsyncClient(timeout=120) as client:
            resp = await client.post(
                f"{self.BASE_URL}/models/imagen-4:predict",
                params={"key": self.api_key},
                json=body,
            )

        if resp.status_code != 200:
            return GenerationResult(
                status="failed",
                error_code="PROVIDER_ERROR",
                error_message=f"Google API 오류: {resp.status_code}",
            )

        data = resp.json()
        # Imagen 4는 base64 이미지를 반환하거나 GCS URL을 반환
        predictions = data.get("predictions", [])
        if not predictions:
            return GenerationResult(
                status="failed",
                error_code="PROVIDER_ERROR",
                error_message="이미지 생성 결과가 없습니다.",
            )

        result_url = predictions[0].get("uri") or predictions[0].get("bytesBase64Encoded", "")
        return GenerationResult(status="completed", result_url=result_url, progress=100)

    async def generate_video(
        self,
        prompt: str,
        input_image_url: Optional[str] = None,
        **params,
    ) -> GenerationResult:
        """Veo 3로 비디오 생성 (비동기 — polling 필요)"""
        body = {
            "instances": [{"prompt": prompt}],
            "parameters": {
                "aspectRatio": params.get("aspect_ratio", "16:9"),
                "durationSeconds": params.get("duration", 5),
            },
        }
        if input_image_url:
            body["instances"][0]["image"] = {"uri": input_image_url}

        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                f"{self.BASE_URL}/models/veo-3:predict",
                params={"key": self.api_key},
                json=body,
            )

        if resp.status_code != 200:
            return GenerationResult(
                status="failed",
                error_code="PROVIDER_ERROR",
                error_message=f"Google API 오류: {resp.status_code}",
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
                f"{self.BASE_URL}/operations/{provider_job_id}",
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
            predictions = result.get("predictions", [])
            video_url = predictions[0].get("uri", "") if predictions else ""
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
