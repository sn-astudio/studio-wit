"""갤러리 API 라우터"""

from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select

from app.core.exceptions import NotFoundException
from app.dependencies import get_current_user, get_db, get_optional_user
from app.models.database import AsyncSession, Generation, Like, User
from app.models.schemas import (
    ErrorResponse,
    GalleryItem,
    GalleryListResponse,
    GalleryUser,
    LikeToggleResponse,
    ModelType,
)
from app.services.model_router import MODEL_INFO

router = APIRouter(prefix="/api/gallery", tags=["Gallery"])


@router.get(
    "",
    response_model=GalleryListResponse,
    summary="공개 갤러리 조회",
    description=(
        "completed 상태의 생성 결과를 공개 갤러리로 조회한다. "
        "비로그인 유저도 조회 가능하며, is_liked는 항상 false로 반환된다."
    ),
)
async def list_gallery(
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
    type: Optional[ModelType] = Query(None, description="image 또는 video로 필터링"),
    model_id: Optional[str] = Query(None, description="특정 모델로 필터링"),
    sort: str = Query("recent", description="정렬 기준 (recent: 최신순, popular: 인기순)"),
    cursor: Optional[str] = Query(None, description="페이지네이션 커서"),
    limit: int = Query(20, ge=1, le=50, description="한 페이지 결과 수"),
):
    # 기본 쿼리: completed + public
    query = select(Generation).where(
        Generation.status == "completed",
        Generation.is_public.is_(True),
    )

    if type:
        query = query.where(Generation.type == type.value)
    if model_id:
        query = query.where(Generation.model_id == model_id)

    # 커서 기반 페이지네이션
    if cursor:
        cursor_gen = await db.execute(
            select(Generation.created_at).where(Generation.id == cursor)
        )
        cursor_row = cursor_gen.scalar_one_or_none()
        if cursor_row:
            query = query.where(Generation.created_at < cursor_row)

    # 정렬
    if sort == "popular":
        like_count_sq = (
            select(func.count(Like.id))
            .where(Like.generation_id == Generation.id)
            .correlate(Generation)
            .scalar_subquery()
        )
        query = query.order_by(like_count_sq.desc(), Generation.created_at.desc())
    else:
        query = query.order_by(Generation.created_at.desc())

    query = query.limit(limit + 1)
    result = await db.execute(query)
    generations = list(result.scalars().all())

    has_more = len(generations) > limit
    if has_more:
        generations = generations[:limit]

    # 좋아요 수 + 현재 유저의 좋아요 여부 일괄 조회
    gen_ids = [g.id for g in generations]

    like_counts: dict[str, int] = {}
    if gen_ids:
        count_result = await db.execute(
            select(Like.generation_id, func.count(Like.id))
            .where(Like.generation_id.in_(gen_ids))
            .group_by(Like.generation_id)
        )
        like_counts = dict(count_result.all())

    user_liked: set[str] = set()
    if current_user and gen_ids:
        liked_result = await db.execute(
            select(Like.generation_id).where(
                Like.user_id == current_user.id,
                Like.generation_id.in_(gen_ids),
            )
        )
        user_liked = {row[0] for row in liked_result.all()}

    # 유저 정보 일괄 로드
    user_ids = list({g.user_id for g in generations})
    users_map: dict[str, User] = {}
    if user_ids:
        users_result = await db.execute(
            select(User).where(User.id.in_(user_ids))
        )
        for u in users_result.scalars().all():
            users_map[u.id] = u

    # 응답 변환
    items = []
    for gen in generations:
        u = users_map.get(gen.user_id)
        model_info = MODEL_INFO.get(gen.model_id, {})
        items.append(
            GalleryItem(
                id=gen.id,
                type=gen.type,
                model_id=gen.model_id,
                model_name=model_info.get("name", gen.model_id),
                prompt=gen.prompt,
                result_url=gen.result_url or "",
                thumbnail_url=gen.thumbnail_url,
                created_at=gen.completed_at or gen.created_at,
                user=GalleryUser(
                    id=u.id if u else "",
                    name=u.name if u else "",
                    profile_image=u.profile_image if u else None,
                ),
                like_count=like_counts.get(gen.id, 0),
                is_liked=gen.id in user_liked,
            )
        )

    return GalleryListResponse(
        items=items,
        next_cursor=generations[-1].id if has_more else None,
        has_more=has_more,
    )


@router.post(
    "/{generation_id}/like",
    response_model=LikeToggleResponse,
    summary="좋아요 토글",
    description="갤러리 아이템에 좋아요를 토글한다. 이미 좋아요한 상태면 취소, 아니면 추가.",
    responses={
        401: {"model": ErrorResponse, "description": "JWT 없음 또는 만료"},
        404: {"model": ErrorResponse, "description": "존재하지 않는 갤러리 아이템"},
    },
)
async def toggle_like(
    generation_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # generation 존재 확인
    gen_result = await db.execute(
        select(Generation).where(
            Generation.id == generation_id,
            Generation.status == "completed",
        )
    )
    gen = gen_result.scalar_one_or_none()
    if not gen:
        raise NotFoundException("갤러리 아이템을 찾을 수 없습니다.")

    # 기존 좋아요 확인
    like_result = await db.execute(
        select(Like).where(
            Like.user_id == user.id,
            Like.generation_id == generation_id,
        )
    )
    existing_like = like_result.scalar_one_or_none()

    if existing_like:
        await db.delete(existing_like)
        is_liked = False
    else:
        new_like = Like(user_id=user.id, generation_id=generation_id)
        db.add(new_like)
        is_liked = True

    await db.commit()

    # 현재 좋아요 수 조회
    count_result = await db.execute(
        select(func.count(Like.id)).where(Like.generation_id == generation_id)
    )
    like_count = count_result.scalar() or 0

    return LikeToggleResponse(is_liked=is_liked, like_count=like_count)
