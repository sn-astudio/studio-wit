"""OpenAI Provider (GPT Image, Sora 2)"""

import base64
import logging
from typing import Optional

import httpx

from app.config import settings

logger = logging.getLogger(__name__)
from app.services.providers.base import BaseProvider, GenerationResult


class OpenAIProvider(BaseProvider):
    """OpenAI Provider"""

    BASE_URL = "https://api.openai.com/v1"

    def __init__(self):
        self.api_key = settings.OPENAI_API_KEY
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

    async def generate_image(
        self,
        prompt: str,
        negative_prompt: Optional[str] = None,
        input_image_url: Optional[str] = None,
        **params,
    ) -> GenerationResult:
        """GPT Image로 이미지 생성/편집 (동기)"""
        # aspect_ratio → size 변환
        size_map = {
            "1:1": "1024x1024",
            "16:9": "1792x1024",
            "9:16": "1024x1792",
        }
        aspect = params.get("aspect_ratio", "1:1")
        size = size_map.get(aspect, "1024x1024")
        quality = {"standard": "auto", "high": "high"}.get(params.get("quality", "standard"), "auto")

        if input_image_url:
            # img2img: /v1/images/edits 엔드포인트 사용
            return await self._edit_image(prompt, input_image_url, size, quality)

        body = {
            "model": "gpt-image-1",
            "prompt": prompt,
            "n": 1,
            "size": size,
            "quality": quality,
            "output_format": "png",
        }

        async with httpx.AsyncClient(timeout=120) as client:
            resp = await client.post(
                f"{self.BASE_URL}/images/generations",
                headers=self.headers,
                json=body,
            )

        return self._parse_image_response(resp)

    async def _edit_image(
        self, prompt: str, image_url: str, size: str, quality: str
    ) -> GenerationResult:
        """소스 이미지를 기반으로 이미지 편집 (/v1/images/edits)"""
        # 이미지 다운로드
        try:
            async with httpx.AsyncClient(timeout=60, follow_redirects=True) as dl:
                img_resp = await dl.get(image_url)
                img_resp.raise_for_status()
        except Exception as e:
            logger.error("OpenAI img2img 이미지 다운로드 실패: %s", e)
            return GenerationResult(
                status="failed",
                error_code="PROVIDER_ERROR",
                error_message=f"입력 이미지 다운로드 실패: {e}",
            )

        mime_type = img_resp.headers.get("content-type", "image/png")
        ext = mime_type.split("/")[-1] if "/" in mime_type else "png"

        # multipart/form-data로 전송
        files = [
            ("image", (f"input.{ext}", img_resp.content, mime_type)),
            ("model", (None, "gpt-image-1")),
            ("prompt", (None, prompt)),
            ("size", (None, size)),
            ("quality", (None, quality)),
        ]

        headers_no_ct = {"Authorization": f"Bearer {self.api_key}"}
        async with httpx.AsyncClient(timeout=120) as client:
            resp = await client.post(
                f"{self.BASE_URL}/images/edits",
                headers=headers_no_ct,
                files=files,
            )

        return self._parse_image_response(resp)

    @staticmethod
    def _parse_image_response(resp: httpx.Response) -> GenerationResult:
        """OpenAI 이미지 API 응답을 파싱하여 GenerationResult 반환"""
        if resp.status_code != 200:
            return GenerationResult(
                status="failed",
                error_code="PROVIDER_ERROR",
                error_message=f"OpenAI API 오류: {resp.status_code}",
            )

        data = resp.json()
        images = data.get("data", [])
        if not images:
            return GenerationResult(
                status="failed",
                error_code="PROVIDER_ERROR",
                error_message="이미지 생성 결과가 없습니다.",
            )

        image = images[0]
        # gpt-image-1은 기본적으로 b64_json으로 응답
        result_url = image.get("url", "")
        if not result_url and image.get("b64_json"):
            result_url = f"data:image/png;base64,{image['b64_json']}"

        return GenerationResult(
            status="completed",
            result_url=result_url,
            progress=100,
        )

    async def generate_video(
        self,
        prompt: str,
        input_image_url: Optional[str] = None,
        **params,
    ) -> GenerationResult:
        """Sora 2로 비디오 생성 (비동기)"""
        # aspect_ratio → size 변환
        size_map = {
            "16:9": "1280x720",
            "9:16": "720x1280",
        }
        aspect = params.get("aspect_ratio", "16:9")
        size = size_map.get(aspect, "1280x720")

        # multipart/form-data 형식으로 전송 (OpenAI /v1/videos 요구사항)
        # httpx에서 multipart/form-data를 보내려면 files 파라미터 사용
        model_id = params.get("model_id", "sora-2")
        seconds = str(int(params.get("duration", 5)))

        files = [
            ("model", (None, model_id)),
            ("prompt", (None, prompt)),
            ("seconds", (None, seconds)),
            ("size", (None, size)),
        ]

        # img2vid: 이미지 다운로드 → multipart에 추가
        if input_image_url:
            try:
                async with httpx.AsyncClient(timeout=60, follow_redirects=True) as dl:
                    img_resp = await dl.get(input_image_url)
                    img_resp.raise_for_status()
                mime_type = img_resp.headers.get("content-type", "image/png")
                ext = mime_type.split("/")[-1] if "/" in mime_type else "png"
                files.append(("input_image", (f"input.{ext}", img_resp.content, mime_type)))
            except Exception as e:
                logger.error("Sora img2vid 이미지 다운로드 실패: %s", e)
                return GenerationResult(
                    status="failed",
                    error_code="PROVIDER_ERROR",
                    error_message=f"입력 이미지 다운로드 실패: {e}",
                )

        headers_no_ct = {"Authorization": f"Bearer {self.api_key}"}

        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post(
                f"{self.BASE_URL}/videos",
                headers=headers_no_ct,
                files=files,
            )

        if resp.status_code not in (200, 201, 202):
            error_body = resp.text[:500] if resp.text else ""
            return GenerationResult(
                status="failed",
                error_code="PROVIDER_ERROR",
                error_message=f"OpenAI API 오류: {resp.status_code} - {error_body}",
            )

        data = resp.json()
        job_id = data.get("id", "")
        return GenerationResult(
            status="processing",
            provider_job_id=job_id,
            progress=0,
        )

    async def check_status(self, provider_job_id: str) -> GenerationResult:
        """Sora 작업 상태 확인"""
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(
                f"{self.BASE_URL}/videos/{provider_job_id}",
                headers=self.headers,
            )

        if resp.status_code != 200:
            return GenerationResult(
                status="failed",
                error_code="PROVIDER_ERROR",
                error_message=f"상태 확인 실패: {resp.status_code}",
            )

        data = resp.json()
        status = data.get("status", "")
        logger.info("Sora check_status response: %s", data)

        if status == "completed":
            # Sora는 별도의 /content 엔드포인트에서 비디오를 가져와야 함
            video_url = await self._fetch_video_content_url(provider_job_id)
            return GenerationResult(
                status="completed",
                result_url=video_url,
                progress=100,
            )
        elif status == "failed":
            return GenerationResult(
                status="failed",
                error_code="PROVIDER_ERROR",
                error_message=data.get("error", {}).get("message", "비디오 생성 실패"),
            )

        # queued 또는 in_progress
        return GenerationResult(
            status="processing",
            provider_job_id=provider_job_id,
            progress=data.get("progress", 0),
        )

    async def _fetch_video_content_url(self, video_id: str) -> str:
        """완료된 비디오의 다운로드 URL을 가져온다.

        GET /v1/videos/{id}/content 는 보통 CDN으로 302 리다이렉트한다.
        리다이렉트 URL을 그대로 반환하고, 바이너리 응답이면 S3에 업로드한다.
        """
        headers_auth = {"Authorization": f"Bearer {self.api_key}"}

        # 리다이렉트를 따라가지 않고 Location 헤더 확인
        async with httpx.AsyncClient(timeout=120, follow_redirects=False) as client:
            resp = await client.get(
                f"{self.BASE_URL}/videos/{video_id}/content",
                headers=headers_auth,
            )

        # 302 리다이렉트 → 임시 CDN URL
        if resp.status_code in (301, 302, 303, 307, 308):
            return resp.headers.get("location", "")

        # 200 바이너리 응답 → S3 업로드
        if resp.status_code == 200:
            ct = resp.headers.get("content-type", "")
            if "video" in ct or "octet-stream" in ct:
                from app.services.storage import upload_generation_video

                return await upload_generation_video(video_id, resp.content)

        return ""
