"""fal.ai Provider (Flux 2 Pro, Kling)"""

from typing import Optional

import httpx

from app.config import settings
from app.services.providers.base import BaseProvider, GenerationResult


class FalProvider(BaseProvider):
    """fal.ai Provider"""

    BASE_URL = "https://queue.fal.run"

    def __init__(self):
        self.api_key = settings.FAL_API_KEY
        self.headers = {
            "Authorization": f"Key {self.api_key}",
            "Content-Type": "application/json",
        }

    async def generate_image(
        self,
        prompt: str,
        negative_prompt: Optional[str] = None,
        **params,
    ) -> GenerationResult:
        """Flux 2 Pro로 이미지 생성 (비동기 — queue 방식)"""
        body = {
            "prompt": prompt,
            "image_size": self._aspect_to_size(params.get("aspect_ratio", "1:1")),
            "num_inference_steps": params.get("num_steps", 28),
            "guidance_scale": params.get("guidance_scale", 3.5),
            "num_images": 1,
        }
        if negative_prompt:
            body["negative_prompt"] = negative_prompt

        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                f"{self.BASE_URL}/fal-ai/flux-pro/v2",
                headers=self.headers,
                json=body,
            )

        if resp.status_code not in (200, 201, 202):
            return GenerationResult(
                status="failed",
                error_code="PROVIDER_ERROR",
                error_message=f"fal.ai API 오류: {resp.status_code}",
            )

        data = resp.json()
        request_id = data.get("request_id", "")
        return GenerationResult(
            status="processing",
            provider_job_id=f"flux-pro/v2:{request_id}",
            progress=0,
        )

    async def generate_video(
        self,
        prompt: str,
        input_image_url: Optional[str] = None,
        **params,
    ) -> GenerationResult:
        """Kling으로 비디오 생성 (비동기 — queue 방식)"""
        body = {
            "prompt": prompt,
            "duration": str(params.get("duration", 5)),
            "aspect_ratio": params.get("aspect_ratio", "16:9"),
        }
        if input_image_url:
            body["image_url"] = input_image_url

        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                f"{self.BASE_URL}/fal-ai/kling-video/v2/master",
                headers=self.headers,
                json=body,
            )

        if resp.status_code not in (200, 201, 202):
            return GenerationResult(
                status="failed",
                error_code="PROVIDER_ERROR",
                error_message=f"fal.ai API 오류: {resp.status_code}",
            )

        data = resp.json()
        request_id = data.get("request_id", "")
        return GenerationResult(
            status="processing",
            provider_job_id=f"kling-video/v2/master:{request_id}",
            progress=0,
        )

    async def check_status(self, provider_job_id: str) -> GenerationResult:
        """fal.ai queue 상태 확인"""
        # provider_job_id 형식: "model_path:request_id"
        parts = provider_job_id.rsplit(":", 1)
        if len(parts) != 2:
            return GenerationResult(
                status="failed",
                error_code="PROVIDER_ERROR",
                error_message="잘못된 작업 ID 형식",
            )

        model_path, request_id = parts

        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(
                f"{self.BASE_URL}/fal-ai/{model_path}/requests/{request_id}/status",
                headers=self.headers,
            )

        if resp.status_code != 200:
            return GenerationResult(
                status="failed",
                error_code="PROVIDER_ERROR",
                error_message=f"상태 확인 실패: {resp.status_code}",
            )

        data = resp.json()
        queue_status = data.get("status", "")

        if queue_status == "COMPLETED":
            # 결과 가져오기
            result_resp = await self._fetch_result(model_path, request_id)
            return result_resp
        elif queue_status in ("IN_QUEUE", "IN_PROGRESS"):
            return GenerationResult(
                status="processing",
                provider_job_id=provider_job_id,
                progress=data.get("progress", 0),
            )

        return GenerationResult(
            status="failed",
            error_code="PROVIDER_ERROR",
            error_message=f"알 수 없는 상태: {queue_status}",
        )

    async def _fetch_result(self, model_path: str, request_id: str) -> GenerationResult:
        """완료된 작업의 결과물을 가져온다."""
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(
                f"{self.BASE_URL}/fal-ai/{model_path}/requests/{request_id}",
                headers=self.headers,
            )

        if resp.status_code != 200:
            return GenerationResult(
                status="failed",
                error_code="PROVIDER_ERROR",
                error_message="결과 조회 실패",
            )

        data = resp.json()
        # Flux: data.images[0].url / Kling: data.video.url
        images = data.get("images", [])
        video = data.get("video", {})

        result_url = ""
        if images:
            result_url = images[0].get("url", "")
        elif video:
            result_url = video.get("url", "")

        return GenerationResult(
            status="completed",
            result_url=result_url,
            progress=100,
        )

    @staticmethod
    def _aspect_to_size(aspect: str) -> str:
        size_map = {
            "1:1": "square_hd",
            "16:9": "landscape_16_9",
            "9:16": "portrait_16_9",
            "4:3": "landscape_4_3",
            "3:4": "portrait_4_3",
        }
        return size_map.get(aspect, "square_hd")
