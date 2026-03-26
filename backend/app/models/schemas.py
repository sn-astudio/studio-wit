"""Pydantic request/response 스키마"""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


# ──────────────────────────────────────
# 공통
# ──────────────────────────────────────

class ErrorDetail(BaseModel):
    code: str = Field(..., description="에러 코드", examples=["VALIDATION_ERROR"])
    message: str = Field(..., description="에러 메시지", examples=["필수 필드가 누락되었습니다."])
    details: Optional[dict] = Field(None, description="추가 에러 정보")


class ErrorResponse(BaseModel):
    error: ErrorDetail


# ──────────────────────────────────────
# Auth
# ──────────────────────────────────────

class AuthVerifyRequest(BaseModel):
    id_token: str = Field(
        ...,
        description="Google OAuth에서 발급받은 ID Token",
        examples=["eyJhbGciOiJSUzI1NiIs..."],
    )


class UserInfo(BaseModel):
    id: str = Field(..., description="유저 고유 ID (UUID)", examples=["550e8400-e29b-41d4-a716-446655440000"])
    email: str = Field(..., description="Google 이메일", examples=["user@gmail.com"])
    name: str = Field(..., description="Google 표시 이름", examples=["홍길동"])
    profile_image: Optional[str] = Field(None, description="Google 프로필 이미지 URL")


class AuthVerifyResponse(BaseModel):
    access_token: str = Field(..., description="백엔드 자체 JWT", examples=["eyJhbGciOiJIUzI1NiIs..."])
    token_type: str = Field(default="bearer", description="토큰 타입")
    expires_in: int = Field(..., description="토큰 만료까지 남은 시간 (초)", examples=[86400])
    user: UserInfo


# ──────────────────────────────────────
# Models
# ──────────────────────────────────────

class ModelType(str, Enum):
    image = "image"
    video = "video"


class ProviderName(str, Enum):
    google = "google"
    gemini = "gemini"
    openai = "openai"
    fal = "fal"


class AIModel(BaseModel):
    id: str = Field(..., description="모델 고유 ID", examples=["imagen-4"])
    name: str = Field(..., description="모델 표시 이름", examples=["Imagen 4"])
    provider: ProviderName = Field(..., description="프로바이더")
    type: ModelType = Field(..., description="image 또는 video")
    description: str = Field(..., description="모델 설명", examples=["Google의 최신 이미지 생성 모델"])
    supported_params: list[str] = Field(..., description="지원 파라미터 목록", examples=[["aspect_ratio", "negative_prompt", "style"]])
    is_async: bool = Field(..., description="비동기 처리 여부 (true면 polling 필요)")


class ModelListResponse(BaseModel):
    models: list[AIModel]


# ──────────────────────────────────────
# Generation
# ──────────────────────────────────────

class GenerationStatus(str, Enum):
    pending = "pending"
    processing = "processing"
    completed = "completed"
    failed = "failed"


class AspectRatio(str, Enum):
    square = "1:1"
    landscape = "16:9"
    portrait = "9:16"
    standard = "4:3"
    standard_portrait = "3:4"


class GenerateParams(BaseModel):
    aspect_ratio: Optional[AspectRatio] = Field(None, description="비율")
    style: Optional[str] = Field(None, description="스타일 프리셋", examples=["photorealistic"])
    quality: Optional[str] = Field(None, description="품질 (standard, hd)", examples=["hd"])
    guidance_scale: Optional[float] = Field(None, description="프롬프트 반영 강도", ge=1.0, le=20.0, examples=[7.5])
    cfg_scale: Optional[float] = Field(None, description="CFG 스케일 (Kling)", ge=0.0, le=1.0, examples=[0.5])
    num_steps: Optional[int] = Field(None, description="생성 스텝 수", ge=10, le=50, examples=[30])
    duration: Optional[int] = Field(None, description="비디오 길이 (초)", ge=2, le=20, examples=[5])
    input_image_url: Optional[str] = Field(None, description="Image-to-Video용 입력 이미지 URL")


class GenerateRequest(BaseModel):
    model_id: str = Field(
        ...,
        description="사용할 모델 ID",
        examples=["imagen-4"],
    )
    prompt: str = Field(
        ...,
        description="생성 프롬프트 (최대 2000자)",
        max_length=2000,
        examples=["A serene mountain landscape at sunset"],
    )
    negative_prompt: Optional[str] = Field(
        None,
        description="제외할 요소 (이미지 모델만)",
        examples=["blurry, low quality"],
    )
    params: Optional[GenerateParams] = Field(None, description="모델별 추가 파라미터")
    is_public: Optional[bool] = Field(False, description="갤러리 공개 여부")


class GenerationError(BaseModel):
    code: str = Field(..., description="에러 코드", examples=["PROVIDER_ERROR"])
    message: str = Field(..., description="에러 메시지", examples=["이미지 생성에 실패했습니다. 다시 시도해주세요."])


class Generation(BaseModel):
    id: str = Field(..., description="생성 작업 고유 ID", examples=["gen_abc123def456"])
    model_id: str = Field(..., description="사용된 모델 ID", examples=["imagen-4"])
    type: ModelType = Field(..., description="image 또는 video")
    status: GenerationStatus = Field(..., description="생성 상태")
    prompt: str = Field(..., description="요청 프롬프트")
    progress: Optional[int] = Field(None, description="진행률 0~100", ge=0, le=100)
    created_at: datetime = Field(..., description="생성 요청 시각 (UTC)")
    completed_at: Optional[datetime] = Field(None, description="완료/실패 시각")
    result_url: Optional[str] = Field(None, description="생성된 이미지/비디오 URL (completed일 때만)")
    thumbnail_url: Optional[str] = Field(None, description="썸네일 URL")
    aspect_ratio: Optional[str] = Field(None, description="가로세로 비율 (예: 16:9, 9:16, 1:1)")
    error: Optional[GenerationError] = Field(None, description="실패 시 에러 정보")


class GenerateResponse(BaseModel):
    generation: Generation


class GenerationListResponse(BaseModel):
    generations: list[Generation]
    next_cursor: Optional[str] = Field(None, description="다음 페이지 커서")
    has_more: bool = Field(..., description="추가 페이지 존재 여부")


# ──────────────────────────────────────
# Gallery
# ──────────────────────────────────────

class GalleryUser(BaseModel):
    id: str = Field(..., description="유저 ID")
    name: str = Field(..., description="유저 이름", examples=["홍길동"])
    profile_image: Optional[str] = Field(None, description="프로필 이미지 URL")


class GalleryItem(BaseModel):
    id: str = Field(..., description="생성 작업 ID", examples=["gen_abc123def456"])
    type: ModelType = Field(..., description="image 또는 video")
    model_id: str = Field(..., description="모델 ID", examples=["imagen-4"])
    model_name: str = Field(..., description="모델 표시 이름", examples=["Imagen 4"])
    prompt: str = Field(..., description="프롬프트")
    result_url: str = Field(..., description="결과물 URL")
    thumbnail_url: Optional[str] = Field(None, description="썸네일 URL")
    created_at: datetime = Field(..., description="생성 완료 시각")
    user: GalleryUser
    like_count: int = Field(..., description="좋아요 수", ge=0, examples=[12])
    is_liked: bool = Field(..., description="현재 유저의 좋아요 여부")


class GalleryListResponse(BaseModel):
    items: list[GalleryItem]
    next_cursor: Optional[str] = Field(None, description="다음 페이지 커서")
    has_more: bool = Field(..., description="추가 페이지 존재 여부")


class LikeToggleResponse(BaseModel):
    is_liked: bool = Field(..., description="토글 후 좋아요 상태")
    like_count: int = Field(..., description="토글 후 총 좋아요 수", examples=[13])
