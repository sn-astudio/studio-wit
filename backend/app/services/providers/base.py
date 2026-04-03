"""AI Provider 추상 베이스 클래스"""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Optional


@dataclass
class GenerationResult:
    """Provider가 반환하는 생성 결과"""

    status: str  # "completed" | "processing" | "failed"
    result_url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    progress: Optional[int] = None
    provider_job_id: Optional[str] = None
    error_code: Optional[str] = None
    error_message: Optional[str] = None


class BaseProvider(ABC):
    """모든 AI Provider가 구현해야 하는 인터페이스"""

    @abstractmethod
    async def generate_image(
        self,
        prompt: str,
        negative_prompt: Optional[str] = None,
        input_image_url: Optional[str] = None,
        **params,
    ) -> GenerationResult:
        """이미지 생성 요청"""
        ...

    @abstractmethod
    async def generate_video(
        self,
        prompt: str,
        input_image_url: Optional[str] = None,
        **params,
    ) -> GenerationResult:
        """비디오 생성 요청"""
        ...

    @abstractmethod
    async def check_status(self, provider_job_id: str) -> GenerationResult:
        """비동기 모델의 생성 상태 확인"""
        ...

    async def compose_images(
        self,
        base_image_url: str,
        reference_image_url: str,
        prompt: str,
    ) -> GenerationResult:
        """이미지 합성 (기본: 미지원)"""
        return GenerationResult(
            status="failed",
            error_code="PROVIDER_ERROR",
            error_message="이 Provider는 이미지 합성을 지원하지 않습니다.",
        )
