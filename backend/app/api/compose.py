"""이미지 합성(Compose) API 라우터"""

import json

from fastapi import APIRouter, BackgroundTasks, Depends
from sqlalchemy import select

from app.dependencies import get_current_user, get_db
from app.models.database import AsyncSession, Generation, User, utc_now
from app.models.schemas import ComposeRequest, ComposeResponse, ErrorResponse
from app.api.generation import _to_schema
from app.services.model_router import get_provider_for_model

router = APIRouter(prefix="/api", tags=["Compose"])


async def _run_compose(generation_id: str, req: ComposeRequest):
    """BackgroundTask에서 실행되는 합성 로직"""
    from app.models.database import async_session

    provider = get_provider_for_model(req.model_id)

    async with async_session() as db:
        result = await db.execute(
            select(Generation).where(Generation.id == generation_id)
        )
        gen = result.scalar_one_or_none()
        if not gen:
            return

        gen.status = "processing"
        await db.commit()

        try:
            gen_result = await provider.compose_images(
                base_image_url=req.base_image_url,
                reference_image_url=req.reference_image_url,
                prompt=req.prompt,
            )

            gen.status = gen_result.status
            if gen_result.status == "completed" and gen_result.result_url:
                from app.services.storage import download_and_upload
                gen.result_url = await download_and_upload(gen.id, gen_result.result_url)
            else:
                gen.result_url = gen_result.result_url
            gen.progress = gen_result.progress
            gen.error_code = gen_result.error_code
            gen.error_message = gen_result.error_message

            if gen_result.status in ("completed", "failed"):
                gen.completed_at = utc_now()

        except Exception as e:
            gen.status = "failed"
            gen.error_code = "PROVIDER_ERROR"
            gen.error_message = str(e)
            gen.completed_at = utc_now()

        await db.commit()


@router.post(
    "/compose",
    response_model=ComposeResponse,
    status_code=202,
    summary="이미지 합성 요청",
    description=(
        "두 이미지를 AI로 합성하는 작업을 시작한다. "
        "즉시 202 응답을 반환하고 실제 합성은 백그라운드에서 처리된다. "
        "프론트엔드는 `GET /api/generation/{id}`로 polling하여 결과를 확인한다."
    ),
    responses={
        401: {"model": ErrorResponse, "description": "JWT 없음 또는 만료"},
    },
)
async def create_compose(
    body: ComposeRequest,
    background_tasks: BackgroundTasks,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    gen = Generation(
        user_id=user.id,
        model_id=body.model_id,
        type="image",
        status="pending",
        prompt=body.prompt,
        params_json=json.dumps({
            "base_image_url": body.base_image_url,
            "reference_image_url": body.reference_image_url,
        }),
    )
    db.add(gen)
    await db.commit()
    await db.refresh(gen)

    background_tasks.add_task(_run_compose, gen.id, body)

    return ComposeResponse(generation=_to_schema(gen))
