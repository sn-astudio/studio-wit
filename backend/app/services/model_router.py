"""모델 ID → Provider 인스턴스 라우팅"""

from typing import Dict

from app.core.exceptions import ModelNotFoundException
from app.services.providers.base import BaseProvider
from app.services.providers.fal import FalProvider
from app.services.providers.gemini import GeminiProvider
from app.services.providers.google import GoogleProvider
from app.services.providers.openai_provider import OpenAIProvider

# 모델 메타 정보
MODEL_INFO: Dict[str, dict] = {
    "imagen-4": {"provider": "google", "type": "image", "name": "Imagen 4", "is_async": False},
    "veo-3": {"provider": "google", "type": "video", "name": "Veo 3", "is_async": True},
    "nano-banana-pro": {"provider": "gemini", "type": "image", "name": "Nano Banana Pro", "is_async": False},
    "gpt-image-1": {"provider": "openai", "type": "image", "name": "GPT Image 1", "is_async": False},
    "sora-2": {"provider": "openai", "type": "video", "name": "Sora 2", "is_async": True},
    "sora-2-pro": {"provider": "openai", "type": "video", "name": "Sora 2 Pro", "is_async": True},
    "flux-2-pro": {"provider": "fal", "type": "image", "name": "Flux 2 Pro", "is_async": True},
    "kling": {"provider": "fal", "type": "video", "name": "Kling", "is_async": True},
}

# Provider 인스턴스 (싱글턴)
_providers: Dict[str, BaseProvider] = {}


def _get_provider(provider_name: str) -> BaseProvider:
    if provider_name not in _providers:
        if provider_name == "google":
            _providers[provider_name] = GoogleProvider()
        elif provider_name == "gemini":
            _providers[provider_name] = GeminiProvider()
        elif provider_name == "openai":
            _providers[provider_name] = OpenAIProvider()
        elif provider_name == "fal":
            _providers[provider_name] = FalProvider()
    return _providers[provider_name]


def get_provider_for_model(model_id: str) -> BaseProvider:
    """모델 ID로 Provider 인스턴스를 반환한다."""
    info = MODEL_INFO.get(model_id)
    if not info:
        raise ModelNotFoundException(model_id)
    return _get_provider(info["provider"])


def get_model_type(model_id: str) -> str:
    """모델의 생성 타입을 반환한다 (image | video)."""
    info = MODEL_INFO.get(model_id)
    if not info:
        raise ModelNotFoundException(model_id)
    return info["type"]


def is_async_model(model_id: str) -> bool:
    """비동기(polling 필요) 모델인지 반환한다."""
    info = MODEL_INFO.get(model_id)
    if not info:
        raise ModelNotFoundException(model_id)
    return info["is_async"]
