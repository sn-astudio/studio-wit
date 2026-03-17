"""인증 API 라우터"""

from fastapi import APIRouter, Depends

from app.dependencies import get_db
from app.models.database import AsyncSession
from app.models.schemas import (
    AuthVerifyRequest,
    AuthVerifyResponse,
    ErrorResponse,
    UserInfo,
)
from app.services.auth import create_access_token, upsert_user, verify_google_token

router = APIRouter(prefix="/api/auth", tags=["Auth"])


@router.post(
    "/verify",
    response_model=AuthVerifyResponse,
    summary="Google ID Token 검증 → JWT 발급",
    description=(
        "프론트엔드(NextAuth.js)에서 받은 Google ID Token을 백엔드에서 검증하고, "
        "자체 JWT를 발급한다. 유저가 없으면 자동으로 생성(upsert)한다."
    ),
    responses={
        400: {"model": ErrorResponse, "description": "id_token 누락/형식 오류"},
        401: {"model": ErrorResponse, "description": "Google 검증 실패 또는 만료 토큰"},
    },
)
async def verify_google_token_endpoint(
    body: AuthVerifyRequest,
    db: AsyncSession = Depends(get_db),
):
    # 1. Google ID Token 검증
    id_info = verify_google_token(body.id_token)

    # 2. 유저 upsert
    user = await upsert_user(
        db=db,
        google_id=id_info["sub"],
        email=id_info.get("email", ""),
        name=id_info.get("name", ""),
        picture=id_info.get("picture"),
    )

    # 3. JWT 발급
    access_token, expires_in = create_access_token(user.id)

    return AuthVerifyResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=expires_in,
        user=UserInfo(
            id=user.id,
            email=user.email,
            name=user.name,
            profile_image=user.profile_image,
        ),
    )
