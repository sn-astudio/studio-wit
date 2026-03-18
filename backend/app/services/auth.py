"""인증 서비스: Google ID Token 검증 + JWT 발급/검증"""

from datetime import datetime, timedelta, timezone
from typing import Optional

from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.exceptions import UnauthorizedException
from app.models.database import User


# ── Google ID Token 검증 ──

def verify_google_token(token: str) -> dict:
    """Google ID Token을 검증하고 유저 정보를 반환한다.

    Returns:
        {"sub": google_id, "email": ..., "name": ..., "picture": ...}
    """
    try:
        id_info = google_id_token.verify_oauth2_token(
            token,
            google_requests.Request(),
            settings.GOOGLE_CLIENT_ID,
        )
        return id_info
    except ValueError as e:
        raise UnauthorizedException(f"Google 토큰 검증 실패: {e}")


# ── JWT 발급 ──

def create_access_token(user_id: str) -> tuple[str, int]:
    """JWT 발급. (token, expires_in_seconds)를 반환."""
    expires_in = settings.JWT_EXPIRE_HOURS * 3600
    expire = datetime.now(timezone.utc) + timedelta(seconds=expires_in)
    payload = {
        "sub": user_id,
        "exp": expire,
    }
    token = jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)
    return token, expires_in


# ── JWT → User 조회 ──

async def get_user_from_token(token: str, db: AsyncSession) -> Optional[User]:
    """JWT를 디코딩하여 User 객체를 반환. 실패 시 None."""
    try:
        payload = jwt.decode(
            token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM]
        )
        user_id: str = payload.get("sub", "")
        if not user_id:
            return None
    except JWTError:
        return None

    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()


# ── 유저 Upsert ──

async def upsert_user(
    db: AsyncSession,
    google_id: str,
    email: str,
    name: str,
    picture: Optional[str],
) -> User:
    """Google 유저를 조회하거나 새로 생성한다."""
    result = await db.execute(select(User).where(User.google_id == google_id))
    user = result.scalar_one_or_none()

    if user:
        # 기존 유저: 프로필 업데이트
        user.email = email
        user.name = name
        user.profile_image = picture
    else:
        # 신규 유저 생성
        user = User(
            google_id=google_id,
            email=email,
            name=name,
            profile_image=picture,
        )
        db.add(user)

    await db.commit()
    await db.refresh(user)
    return user
