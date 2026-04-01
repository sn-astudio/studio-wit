"""갤러리 API 라우터"""

import json
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select

from app.core.exceptions import ForbiddenException, NotFoundException
from app.dependencies import get_current_user, get_db, get_optional_user
from app.models.database import AsyncSession, Comment, Generation, Like, User
from app.models.schemas import (
    CommentCreate,
    CommentItem,
    CommentListResponse,
    ErrorResponse,
    GalleryItem,
    GalleryItemDetail,
    GalleryListResponse,
    GalleryUser,
    LikeToggleResponse,
    ModelType,
)
from app.services.model_router import MODEL_INFO

router = APIRouter(prefix="/api/gallery", tags=["Gallery"])


def _build_gallery_item(
    gen: Generation,
    users_map: dict[str, User],
    like_counts: dict[str, int],
    comment_counts: dict[str, int],
    user_liked: set[str],
) -> GalleryItem:
    u = users_map.get(gen.user_id)
    model_info = MODEL_INFO.get(gen.model_id, {})
    return GalleryItem(
        id=gen.id,
        type=gen.type,
        model_id=gen.model_id,
        model_name=model_info.get("name", gen.model_id),
        prompt=gen.prompt,
        result_url=gen.result_url or "",
        thumbnail_url=gen.thumbnail_url,
        aspect_ratio=json.loads(gen.params_json).get("aspect_ratio") if gen.params_json else None,
        created_at=gen.completed_at or gen.created_at,
        user=GalleryUser(
            id=u.id if u else "",
            name=u.name if u else "",
            profile_image=u.profile_image if u else None,
        ),
        like_count=like_counts.get(gen.id, 0),
        comment_count=comment_counts.get(gen.id, 0),
        is_liked=gen.id in user_liked,
    )


async def _get_counts(db: AsyncSession, gen_ids: list[str], current_user: Optional[User]):
    """좋아요/댓글 수 + 유저 좋아요 여부를 일괄 조회"""
    like_counts: dict[str, int] = {}
    comment_counts: dict[str, int] = {}
    user_liked: set[str] = set()

    if gen_ids:
        lc = await db.execute(
            select(Like.generation_id, func.count(Like.id))
            .where(Like.generation_id.in_(gen_ids))
            .group_by(Like.generation_id)
        )
        like_counts = dict(lc.all())

        cc = await db.execute(
            select(Comment.generation_id, func.count(Comment.id))
            .where(Comment.generation_id.in_(gen_ids))
            .group_by(Comment.generation_id)
        )
        comment_counts = dict(cc.all())

    if current_user and gen_ids:
        liked_result = await db.execute(
            select(Like.generation_id).where(
                Like.user_id == current_user.id,
                Like.generation_id.in_(gen_ids),
            )
        )
        user_liked = {row[0] for row in liked_result.all()}

    return like_counts, comment_counts, user_liked


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
    query = select(Generation).where(
        Generation.status == "completed",
        Generation.is_public.is_(True),
    )

    if type:
        query = query.where(Generation.type == type.value)
    if model_id:
        query = query.where(Generation.model_id == model_id)

    if cursor:
        cursor_gen = await db.execute(
            select(Generation.created_at).where(Generation.id == cursor)
        )
        cursor_row = cursor_gen.scalar_one_or_none()
        if cursor_row:
            query = query.where(Generation.created_at < cursor_row)

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

    gen_ids = [g.id for g in generations]
    like_counts, comment_counts, user_liked = await _get_counts(db, gen_ids, current_user)

    user_ids = list({g.user_id for g in generations})
    users_map: dict[str, User] = {}
    if user_ids:
        users_result = await db.execute(select(User).where(User.id.in_(user_ids)))
        for u in users_result.scalars().all():
            users_map[u.id] = u

    items = [
        _build_gallery_item(gen, users_map, like_counts, comment_counts, user_liked)
        for gen in generations
    ]

    return GalleryListResponse(
        items=items,
        next_cursor=generations[-1].id if has_more else None,
        has_more=has_more,
    )


@router.get(
    "/{generation_id}",
    response_model=GalleryItemDetail,
    summary="갤러리 아이템 상세 조회",
    responses={404: {"model": ErrorResponse}},
)
async def get_gallery_item(
    generation_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    gen_result = await db.execute(
        select(Generation).where(
            Generation.id == generation_id,
            Generation.status == "completed",
            Generation.is_public.is_(True),
        )
    )
    gen = gen_result.scalar_one_or_none()
    if not gen:
        raise NotFoundException("갤러리 아이템을 찾을 수 없습니다.")

    like_counts, comment_counts, user_liked = await _get_counts(
        db, [gen.id], current_user
    )

    user_result = await db.execute(select(User).where(User.id == gen.user_id))
    u = user_result.scalar_one_or_none()
    users_map = {u.id: u} if u else {}

    item = _build_gallery_item(gen, users_map, like_counts, comment_counts, user_liked)
    return GalleryItemDetail(**item.model_dump())


@router.post(
    "/{generation_id}/like",
    response_model=LikeToggleResponse,
    summary="좋아요 토글",
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
    gen_result = await db.execute(
        select(Generation).where(
            Generation.id == generation_id,
            Generation.status == "completed",
        )
    )
    gen = gen_result.scalar_one_or_none()
    if not gen:
        raise NotFoundException("갤러리 아이템을 찾을 수 없습니다.")

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

    count_result = await db.execute(
        select(func.count(Like.id)).where(Like.generation_id == generation_id)
    )
    like_count = count_result.scalar() or 0

    return LikeToggleResponse(is_liked=is_liked, like_count=like_count)


# ── Comments ──


@router.get(
    "/{generation_id}/comments",
    response_model=CommentListResponse,
    summary="댓글 목록 조회",
)
async def list_comments(
    generation_id: str,
    db: AsyncSession = Depends(get_db),
    cursor: Optional[str] = Query(None, description="페이지네이션 커서 (comment ID)"),
    limit: int = Query(20, ge=1, le=50),
):
    gen_result = await db.execute(
        select(Generation.id).where(
            Generation.id == generation_id,
            Generation.status == "completed",
            Generation.is_public.is_(True),
        )
    )
    if not gen_result.scalar_one_or_none():
        raise NotFoundException("갤러리 아이템을 찾을 수 없습니다.")

    query = select(Comment).where(Comment.generation_id == generation_id)

    if cursor:
        query = query.where(Comment.id < int(cursor))

    query = query.order_by(Comment.id.desc()).limit(limit + 1)
    result = await db.execute(query)
    comments = list(result.scalars().all())

    has_more = len(comments) > limit
    if has_more:
        comments = comments[:limit]

    user_ids = list({c.user_id for c in comments})
    users_map: dict[str, User] = {}
    if user_ids:
        users_result = await db.execute(select(User).where(User.id.in_(user_ids)))
        for u in users_result.scalars().all():
            users_map[u.id] = u

    items = []
    for c in comments:
        u = users_map.get(c.user_id)
        items.append(
            CommentItem(
                id=c.id,
                content=c.content,
                created_at=c.created_at,
                user=GalleryUser(
                    id=u.id if u else "",
                    name=u.name if u else "",
                    profile_image=u.profile_image if u else None,
                ),
            )
        )

    return CommentListResponse(
        comments=items,
        next_cursor=str(comments[-1].id) if has_more else None,
        has_more=has_more,
    )


@router.post(
    "/{generation_id}/comments",
    response_model=CommentItem,
    summary="댓글 작성",
    responses={401: {"model": ErrorResponse}, 404: {"model": ErrorResponse}},
)
async def create_comment(
    generation_id: str,
    body: CommentCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    gen_result = await db.execute(
        select(Generation.id).where(
            Generation.id == generation_id,
            Generation.status == "completed",
            Generation.is_public.is_(True),
        )
    )
    if not gen_result.scalar_one_or_none():
        raise NotFoundException("갤러리 아이템을 찾을 수 없습니다.")

    comment = Comment(
        user_id=user.id,
        generation_id=generation_id,
        content=body.content,
    )
    db.add(comment)
    await db.commit()
    await db.refresh(comment)

    return CommentItem(
        id=comment.id,
        content=comment.content,
        created_at=comment.created_at,
        user=GalleryUser(
            id=user.id,
            name=user.name,
            profile_image=user.profile_image,
        ),
    )


@router.delete(
    "/comments/{comment_id}",
    summary="댓글 삭제 (본인만)",
    responses={401: {"model": ErrorResponse}, 404: {"model": ErrorResponse}},
)
async def delete_comment(
    comment_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Comment).where(Comment.id == comment_id))
    comment = result.scalar_one_or_none()
    if not comment:
        raise NotFoundException("댓글을 찾을 수 없습니다.")

    if comment.user_id != user.id:
        raise ForbiddenException("본인의 댓글만 삭제할 수 있습니다.")

    await db.delete(comment)
    await db.commit()
    return {"ok": True}
