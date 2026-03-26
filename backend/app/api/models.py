"""AI 모델 API 라우터"""

from typing import List, Optional

from fastapi import APIRouter, Query

from app.models.schemas import AIModel, ModelListResponse, ModelType, ProviderName

router = APIRouter(prefix="/api", tags=["Models"])

# 지원 모델 목록 (정적 데이터)
AVAILABLE_MODELS: List[AIModel] = [
    AIModel(
        id="imagen-4",
        name="Imagen 4",
        provider=ProviderName.google,
        type=ModelType.image,
        description="Google의 최신 이미지 생성 모델",
        supported_params=["aspect_ratio", "style"],
        is_async=False,
    ),
    AIModel(
        id="veo-3",
        name="Veo 3",
        provider=ProviderName.google,
        type=ModelType.video,
        description="Google의 비디오 생성 모델",
        supported_params=["duration", "aspect_ratio", "input_image_url"],
        is_async=True,
    ),
    AIModel(
        id="veo-3.1",
        name="Veo 3.1",
        provider=ProviderName.google,
        type=ModelType.video,
        description="Google의 최신 비디오 생성 모델",
        supported_params=["duration", "aspect_ratio"],
        is_async=True,
    ),
    AIModel(
        id="veo-3.1-fast",
        name="Veo 3.1 Fast",
        provider=ProviderName.google,
        type=ModelType.video,
        description="Google의 빠른 비디오 생성 모델",
        supported_params=["duration", "aspect_ratio"],
        is_async=True,
    ),
    AIModel(
        id="nano-banana-pro",
        name="Nano Banana Pro",
        provider=ProviderName.gemini,
        type=ModelType.image,
        description="Google Gemini 기반 이미지 생성 모델",
        supported_params=["aspect_ratio"],
        is_async=False,
    ),
    AIModel(
        id="gpt-image",
        name="GPT Image",
        provider=ProviderName.openai,
        type=ModelType.image,
        description="OpenAI의 이미지 생성 모델",
        supported_params=["aspect_ratio", "quality", "style"],
        is_async=False,
    ),
    AIModel(
        id="sora-2",
        name="Sora 2",
        provider=ProviderName.openai,
        type=ModelType.video,
        description="OpenAI의 비디오 생성 모델",
        supported_params=["duration", "aspect_ratio", "input_image_url"],
        is_async=True,
    ),
    AIModel(
        id="sora-2-pro",
        name="Sora 2 Pro",
        provider=ProviderName.openai,
        type=ModelType.video,
        description="OpenAI의 고품질 비디오 생성 모델",
        supported_params=["duration", "aspect_ratio", "input_image_url"],
        is_async=True,
    ),
    AIModel(
        id="flux-2-pro",
        name="Flux 2 Pro",
        provider=ProviderName.fal,
        type=ModelType.image,
        description="fal.ai의 고품질 이미지 생성 모델",
        supported_params=["aspect_ratio", "guidance_scale", "num_steps"],
        is_async=True,
    ),
    AIModel(
        id="kling",
        name="Kling",
        provider=ProviderName.fal,
        type=ModelType.video,
        description="fal.ai의 비디오 생성 모델",
        supported_params=["duration", "aspect_ratio", "input_image_url"],
        is_async=True,
    ),
]


@router.get(
    "/models",
    response_model=ModelListResponse,
    summary="사용 가능한 AI 모델 목록",
    description="지원하는 모든 AI 모델의 정보를 반환한다. type 파라미터로 이미지/비디오 모델만 필터링할 수 있다.",
    responses={
        401: {"description": "JWT 없음 또는 만료"},
    },
)
async def list_models(
    type: Optional[ModelType] = Query(None, description="image 또는 video로 필터링"),
):
    models = AVAILABLE_MODELS
    if type:
        models = [m for m in models if m.type == type]
    return ModelListResponse(models=models)
