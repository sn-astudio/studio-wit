"""공통 의존성: DB 세션, 인증"""

from typing import Optional

from fastapi import Depends, Header

from app.core.exceptions import UnauthorizedException
from app.models.database import AsyncSession, User, async_session
from app.services.auth import get_user_from_token


async def get_db() -> AsyncSession:
    """DB 세션 의존성"""
    async with async_session() as session:
        yield session


async def get_current_user(
    authorization: str = Header(..., description="Bearer {jwt}"),
    db: AsyncSession = Depends(get_db),
) -> User:
    """JWT → User 조회. 인증 필수 엔드포인트에 사용."""
    if not authorization.startswith("Bearer "):
        raise UnauthorizedException("올바른 인증 형식이 아닙니다.")

    token = authorization.removeprefix("Bearer ").strip()
    user = await get_user_from_token(token, db)
    if user is None:
        raise UnauthorizedException("유효하지 않은 토큰입니다.")
    return user


async def get_optional_user(
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db),
) -> Optional[User]:
    """JWT → User 조회. 비로그인도 허용하는 엔드포인트에 사용."""
    if not authorization or not authorization.startswith("Bearer "):
        return None

    token = authorization.removeprefix("Bearer ").strip()
    return await get_user_from_token(token, db)
