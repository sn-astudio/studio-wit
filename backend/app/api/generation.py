"""생성(Generation) API 라우터"""

import json
from typing import Optional

import httpx
from fastapi import APIRouter, BackgroundTasks, Depends, Query
from sqlalchemy import func, select

from app.core.exceptions import ForbiddenException, NotFoundException
from app.dependencies import get_current_user, get_db
from app.models.database import AsyncSession, Generation, User, utc_now
from app.models.schemas import (
    ErrorResponse,
    GenerateRequest,
    GenerateResponse,
    GenerationError,
    GenerationListResponse,
    GenerationStatus,
    ModelType,
)
from app.models.schemas import Generation as GenerationSchema
from app.services.model_router import get_model_type, get_provider_for_model

router = APIRouter(prefix="/api", tags=["Generation"])


# ── 백그라운드 생성 태스크 ──

async def _run_generation(generation_id: str, model_id: str, request: GenerateRequest):
    """BackgroundTask에서 실행되는 생성 로직"""
    from app.models.database import async_session

    provider = get_provider_for_model(model_id)
    model_type = get_model_type(model_id)
    params = request.params.model_dump(exclude_none=True) if request.params else {}
    params["model_id"] = model_id

    async with async_session() as db:
        # status → processing
        result = await db.execute(
            select(Generation).where(Generation.id == generation_id)
        )
        gen = result.scalar_one_or_none()
        if not gen:
            return

        gen.status = "processing"
        await db.commit()

        # Provider API 호출
        try:
            if model_type == "image":
                gen_result = await provider.generate_image(
                    prompt=request.prompt,
                    negative_prompt=request.negative_prompt,
                    **params,
                )
            else:
                gen_result = await provider.generate_video(
                    prompt=request.prompt,
                    input_image_url=params.get("input_image_url"),
                    **params,
                )

            # 결과 반영 — 완료된 이미지/비디오는 S3 업로드 후 CloudFront URL 저장
            gen.status = gen_result.status
            if gen_result.status == "completed" and gen_result.result_url:
                if model_type == "image":
                    from app.services.storage import download_and_upload
                    gen.result_url = await download_and_upload(gen.id, gen_result.result_url)
                elif model_type == "video":
                    from app.services.storage import upload_generation_video
                    try:
                        async with httpx.AsyncClient(timeout=120, follow_redirects=True) as client:
                            resp = await client.get(gen_result.result_url)
                            resp.raise_for_status()
                        cdn_url = await upload_generation_video(gen.id, resp.content, "mp4")
                        gen.result_url = cdn_url if cdn_url else gen_result.result_url
                    except Exception:
                        gen.result_url = gen_result.result_url
                else:
                    gen.result_url = gen_result.result_url
            else:
                gen.result_url = gen_result.result_url
            gen.thumbnail_url = gen_result.thumbnail_url
            gen.progress = gen_result.progress
            gen.provider_job_id = gen_result.provider_job_id
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


# ── 헬퍼: ORM → Pydantic 변환 ──

def _to_schema(gen: Generation) -> GenerationSchema:
    error = None
    if gen.error_code:
        error = GenerationError(code=gen.error_code, message=gen.error_message or "")

    # params_json에서 aspect_ratio 추출
    aspect_ratio = None
    if gen.params_json:
        try:
            params = json.loads(gen.params_json)
            aspect_ratio = params.get("aspect_ratio")
        except (json.JSONDecodeError, TypeError):
            pass

    return GenerationSchema(
        id=gen.id,
        model_id=gen.model_id,
        type=gen.type,
        status=gen.status,
        prompt=gen.prompt,
        progress=gen.progress,
        created_at=gen.created_at,
        completed_at=gen.completed_at,
        result_url=gen.result_url,
        thumbnail_url=gen.thumbnail_url,
        aspect_ratio=aspect_ratio,
        error=error,
    )


# ── 엔드포인트 ──

@router.post(
    "/generate",
    response_model=GenerateResponse,
    status_code=202,
    summary="이미지/비디오 생성 요청",
    description=(
        "이미지 또는 비디오 생성 작업을 시작한다. "
        "즉시 202 응답을 반환하고, 실제 생성은 백그라운드에서 처리된다. "
        "프론트엔드는 `GET /api/generation/{id}`로 2초 간격 polling하여 결과를 확인한다."
    ),
    responses={
        400: {"model": ErrorResponse, "description": "필수 필드 누락/형식 오류 또는 콘텐츠 정책 위반"},
        401: {"model": ErrorResponse, "description": "JWT 없음 또는 만료"},
        404: {"model": ErrorResponse, "description": "존재하지 않는 model_id"},
        429: {"model": ErrorResponse, "description": "요청 횟수 초과"},
    },
)
async def create_generation(
    body: GenerateRequest,
    background_tasks: BackgroundTasks,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    model_type = get_model_type(body.model_id)

    # DB 레코드 생성
    gen = Generation(
        user_id=user.id,
        model_id=body.model_id,
        type=model_type,
        status="pending",
        prompt=body.prompt,
        negative_prompt=body.negative_prompt,
        params_json=json.dumps(body.params.model_dump(exclude_none=True)) if body.params else None,
    )
    db.add(gen)
    await db.commit()
    await db.refresh(gen)

    # 백그라운드 생성 시작
    background_tasks.add_task(_run_generation, gen.id, body.model_id, body)

    return GenerateResponse(generation=_to_schema(gen))


@router.get(
    "/generation/{generation_id}",
    response_model=GenerateResponse,
    summary="생성 상태 조회 (Polling)",
    description=(
        "생성 작업의 현재 상태를 반환한다. "
        "프론트엔드에서 2초 간격으로 호출하여 진행 상황을 확인한다.\n\n"
        "- **pending**: 작업 대기 중\n"
        "- **processing**: Provider에서 처리 중\n"
        "- **completed**: 완료 → result_url에 결과물 URL\n"
        "- **failed**: 실패 → error에 에러 정보"
    ),
    responses={
        401: {"model": ErrorResponse, "description": "JWT 없음 또는 만료"},
        403: {"model": ErrorResponse, "description": "다른 유저의 생성 작업"},
        404: {"model": ErrorResponse, "description": "존재하지 않는 generation ID"},
    },
)
async def get_generation(
    generation_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Generation).where(Generation.id == generation_id)
    )
    gen = result.scalar_one_or_none()

    if not gen:
        raise NotFoundException("생성 작업을 찾을 수 없습니다.")
    if gen.user_id != user.id:
        raise ForbiddenException("다른 유저의 생성 작업에 접근할 수 없습니다.")

    # 비동기 모델이 processing 상태면 Provider에 상태 확인
    if gen.status == "processing" and gen.provider_job_id:
        provider = get_provider_for_model(gen.model_id)
        gen_result = await provider.check_status(gen.provider_job_id)

        gen.status = gen_result.status
        gen.progress = gen_result.progress
        if gen_result.result_url:
            if gen_result.status == "completed" and gen.type == "image":
                from app.services.storage import download_and_upload
                gen.result_url = await download_and_upload(gen.id, gen_result.result_url)
            elif gen_result.status == "completed" and gen.type == "video":
                from app.services.storage import upload_generation_video
                try:
                    async with httpx.AsyncClient(timeout=120, follow_redirects=True) as client:
                        resp = await client.get(gen_result.result_url)
                        resp.raise_for_status()
                    cdn_url = await upload_generation_video(gen.id, resp.content, "mp4")
                    gen.result_url = cdn_url if cdn_url else gen_result.result_url
                except Exception:
                    gen.result_url = gen_result.result_url
            else:
                gen.result_url = gen_result.result_url
        gen.thumbnail_url = gen_result.thumbnail_url or gen.thumbnail_url
        gen.error_code = gen_result.error_code
        gen.error_message = gen_result.error_message

        if gen_result.status in ("completed", "failed"):
            gen.completed_at = utc_now()

        await db.commit()
        await db.refresh(gen)

    return GenerateResponse(generation=_to_schema(gen))


@router.get(
    "/generations",
    response_model=GenerationListResponse,
    summary="내 생성 이력 조회",
    description="로그인한 유저의 생성 작업 목록을 최신순으로 반환한다. 커서 기반 페이지네이션을 지원한다.",
    responses={
        401: {"model": ErrorResponse, "description": "JWT 없음 또는 만료"},
    },
)
async def list_generations(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    type: Optional[ModelType] = Query(None, description="image 또는 video로 필터링"),
    status: Optional[GenerationStatus] = Query(None, description="상태로 필터링"),
    cursor: Optional[str] = Query(None, description="페이지네이션 커서 (generation ID)"),
    limit: int = Query(20, ge=1, le=50, description="한 페이지 결과 수"),
):
    query = select(Generation).where(Generation.user_id == user.id)

    if type:
        query = query.where(Generation.type == type.value)
    if status:
        query = query.where(Generation.status == status.value)
    if cursor:
        cursor_gen = await db.execute(
            select(Generation.created_at).where(Generation.id == cursor)
        )
        cursor_row = cursor_gen.scalar_one_or_none()
        if cursor_row:
            query = query.where(Generation.created_at < cursor_row)

    query = query.order_by(Generation.created_at.desc()).limit(limit + 1)
    result = await db.execute(query)
    generations = list(result.scalars().all())

    has_more = len(generations) > limit
    if has_more:
        generations = generations[:limit]

    return GenerationListResponse(
        generations=[_to_schema(g) for g in generations],
        next_cursor=generations[-1].id if has_more else None,
        has_more=has_more,
    )
