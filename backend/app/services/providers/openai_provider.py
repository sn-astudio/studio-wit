"""OpenAI Provider (GPT Image, Sora 2)"""

import base64
from typing import Optional

import httpx

from app.config import settings
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
        **params,
    ) -> GenerationResult:
        """GPT Image로 이미지 생성 (동기)"""
        # aspect_ratio → size 변환
        size_map = {
            "1:1": "1024x1024",
            "16:9": "1792x1024",
            "9:16": "1024x1792",
        }
        aspect = params.get("aspect_ratio", "1:1")
        size = size_map.get(aspect, "1024x1024")

        body = {
            "model": "gpt-image-1",
            "prompt": prompt,
            "n": 1,
            "size": size,
            "quality": {"standard": "auto", "high": "high"}.get(params.get("quality", "standard"), "auto"),
            "output_format": "png",
        }

        async with httpx.AsyncClient(timeout=120) as client:
            resp = await client.post(
                f"{self.BASE_URL}/images/generations",
                headers=self.headers,
                json=body,
            )

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
        body = {
            "model": "sora-2",
            "prompt": prompt,
            "duration": params.get("duration", 5),
            "aspect_ratio": params.get("aspect_ratio", "16:9"),
        }
        if input_image_url:
            body["image_url"] = input_image_url

        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                f"{self.BASE_URL}/videos/generations",
                headers=self.headers,
                json=body,
            )

        if resp.status_code not in (200, 201, 202):
            return GenerationResult(
                status="failed",
                error_code="PROVIDER_ERROR",
                error_message=f"OpenAI API 오류: {resp.status_code}",
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
                f"{self.BASE_URL}/videos/generations/{provider_job_id}",
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

        if status == "completed":
            return GenerationResult(
                status="completed",
                result_url=data.get("video_url", ""),
                progress=100,
            )
        elif status == "failed":
            return GenerationResult(
                status="failed",
                error_code="PROVIDER_ERROR",
                error_message=data.get("error", {}).get("message", "비디오 생성 실패"),
            )

        return GenerationResult(
            status="processing",
            provider_job_id=provider_job_id,
            progress=data.get("progress", 0),
        )
