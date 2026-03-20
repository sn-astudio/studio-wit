"""Google Gemini Provider (이미지 생성 — generateContent API)"""

from typing import Optional

import httpx

from app.config import settings
from app.services.providers.base import BaseProvider, GenerationResult


class GeminiProvider(BaseProvider):
    """Google Gemini generateContent API를 사용하는 Provider"""

    BASE_URL = "https://generativelanguage.googleapis.com/v1beta"

    def __init__(self):
        self.api_key = settings.GOOGLE_AI_API_KEY

    async def generate_image(
        self,
        prompt: str,
        negative_prompt: Optional[str] = None,
        **params,
    ) -> GenerationResult:
        """Gemini generateContent API로 이미지 생성 (동기 — 즉시 결과 반환)"""
        aspect_ratio = params.get("aspect_ratio", "1:1")
        body = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "responseModalities": ["IMAGE"],
                "imageConfig": {"aspectRatio": aspect_ratio},
            },
        }

        async with httpx.AsyncClient(timeout=120) as client:
            resp = await client.post(
                f"{self.BASE_URL}/models/gemini-3.1-flash-image-preview:generateContent",
                headers={"x-goog-api-key": self.api_key},
                json=body,
            )

        if resp.status_code != 200:
            error_code = "PROVIDER_ERROR"
            error_message = f"Gemini API 오류: {resp.status_code}"
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
        candidates = data.get("candidates", [])
        if not candidates:
            return GenerationResult(
                status="failed",
                error_code="CONTENT_POLICY",
                error_message="이미지 생성 결과가 없습니다. 안전 필터에 의해 차단되었을 수 있습니다.",
            )

        # candidates[0].content.parts 에서 inline_data 찾기
        parts = candidates[0].get("content", {}).get("parts", [])
        for part in parts:
            inline_data = part.get("inlineData") or part.get("inline_data")
            if inline_data:
                mime = inline_data.get("mimeType") or inline_data.get("mime_type", "image/png")
                b64 = inline_data.get("data", "")
                result_url = f"data:{mime};base64,{b64}"
                return GenerationResult(status="completed", result_url=result_url, progress=100)

        return GenerationResult(
            status="failed",
            error_code="PROVIDER_ERROR",
            error_message="응답에서 이미지 데이터를 찾을 수 없습니다.",
        )

    async def generate_video(
        self,
        prompt: str,
        input_image_url: Optional[str] = None,
        **params,
    ) -> GenerationResult:
        """Gemini는 비디오 생성을 지원하지 않음"""
        return GenerationResult(
            status="failed",
            error_code="PROVIDER_ERROR",
            error_message="Gemini Provider는 비디오 생성을 지원하지 않습니다.",
        )

    async def check_status(self, provider_job_id: str) -> GenerationResult:
        """동기 모델이므로 사용하지 않음"""
        return GenerationResult(
            status="failed",
            error_code="PROVIDER_ERROR",
            error_message="Gemini Provider는 동기 모델이므로 상태 확인이 필요하지 않습니다.",
        )
