"""비디오 편집 API — 트리밍, 업로드, 메타데이터"""

import uuid
import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, UploadFile, File
from pydantic import BaseModel, Field

from app.dependencies import get_current_user
from app.models.database import Generation, User, async_session
from app.services.video_processor import (
    trim_video, merge_videos, get_video_info, capture_frame,
    speed_video, reverse_video, apply_filter,
)
from app.services.storage import upload_generation_video

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/video", tags=["Video Edit"])


# ── Schemas ──────────────────────────────────────────────────────────────

class TrimRequest(BaseModel):
    source_url: str = Field(..., description="원본 비디오 CDN URL")
    start_time: float = Field(..., ge=0, description="트림 시작 시간(초)")
    end_time: float = Field(..., gt=0, description="트림 끝 시간(초)")


class TrimResponse(BaseModel):
    result_url: str
    duration: float


class UploadResponse(BaseModel):
    url: str
    duration: float
    width: int
    height: int


class VideoInfoResponse(BaseModel):
    duration: float
    width: int
    height: int
    fps: float


class MergeRequest(BaseModel):
    video_urls: list[str] = Field(..., min_length=2, description="합칠 비디오 CDN URL 목록 (순서대로)")


class MergeResponse(BaseModel):
    result_url: str
    duration: float


class CaptureFrameRequest(BaseModel):
    source_url: str = Field(..., description="원본 비디오 CDN URL")
    timestamp: float = Field(..., ge=0, description="캡처할 타임스탬프(초)")


class CaptureFrameResponse(BaseModel):
    image_url: str


class SpeedRequest(BaseModel):
    source_url: str = Field(..., description="원본 비디오 CDN URL")
    speed: float = Field(..., ge=0.25, le=4.0, description="속도 배율 (0.25x ~ 4x)")


class SpeedResponse(BaseModel):
    result_url: str


class ReverseRequest(BaseModel):
    source_url: str = Field(..., description="원본 비디오 CDN URL")


class ReverseResponse(BaseModel):
    result_url: str


class FilterRequest(BaseModel):
    source_url: str = Field(..., description="원본 비디오 CDN URL")
    filter_name: str = Field(..., description="필터 이름 (grayscale, sepia, adjust)")
    params: Optional[dict] = Field(None, description="필터 파라미터 (adjust: brightness, contrast, saturation)")


class FilterResponse(BaseModel):
    result_url: str


class SaveEditRequest(BaseModel):
    result_url: str = Field(..., description="저장할 편집 결과 URL")
    edit_type: str = Field(..., description="편집 타입 (merge, trim, speed, reverse, filter)")
    prompt: str = Field(default="", description="결과 설명/프롬프트")
    params_json: Optional[str] = Field(None, description="편집 파라미터 JSON")


class SaveEditResponse(BaseModel):
    id: str
    result_url: str


# ── Endpoints ────────────────────────────────────────────────────────────

@router.post("/trim", response_model=TrimResponse, summary="비디오 트리밍")
async def trim_video_endpoint(
    req: TrimRequest,
    user: User = Depends(get_current_user),
):
    """source_url 비디오의 start_time ~ end_time 구간을 잘라서 S3에 업로드한다."""
    if req.end_time <= req.start_time:
        from app.core.exceptions import ValidationException
        raise ValidationException("end_time은 start_time보다 커야 합니다.")

    result_url = await trim_video(req.source_url, req.start_time, req.end_time)
    duration = req.end_time - req.start_time

    # DB에 자동 저장하지 않음. 사용자가 /save-edit로 명시적으로 저장 필요

    return TrimResponse(result_url=result_url, duration=duration)


@router.post("/merge", response_model=MergeResponse, summary="비디오 합치기")
async def merge_video_endpoint(
    req: MergeRequest,
    user: User = Depends(get_current_user),
):
    """여러 비디오를 순서대로 합쳐서 S3에 업로드한다. (저장하지 않음 - 사용자가 별도로 저장 필요)"""
    result_url = await merge_videos(req.video_urls)

    # 합친 비디오의 duration 추출
    info = await get_video_info(result_url)
    duration = info.get("duration", 0)

    # 주의: DB에 자동 저장하지 않음. 사용자가 /save-edit로 명시적으로 저장 필요

    return MergeResponse(result_url=result_url, duration=duration)


@router.post("/upload", response_model=UploadResponse, summary="비디오 업로드")
async def upload_video_endpoint(
    file: UploadFile = File(..., description="업로드할 비디오 파일"),
    _user: User = Depends(get_current_user),
):
    """로컬 비디오 파일을 S3에 업로드하고 CDN URL + 메타데이터를 반환한다."""
    video_data = await file.read()
    edit_id = uuid.uuid4().hex

    # S3 업로드
    ext = file.filename.rsplit(".", 1)[-1] if file.filename and "." in file.filename else "mp4"
    cdn_url = await upload_generation_video(f"upload_{edit_id}", video_data, ext)
    if not cdn_url:
        from app.core.exceptions import AppException
        raise AppException(status_code=500, code="UPLOAD_FAILED", message="S3 업로드 실패")

    # 메타데이터 추출 (업로드된 CDN URL로)
    info = await get_video_info(cdn_url)

    return UploadResponse(
        url=cdn_url,
        duration=info.get("duration", 0),
        width=info.get("width", 0),
        height=info.get("height", 0),
    )


@router.post(
    "/capture-frame",
    response_model=CaptureFrameResponse,
    summary="비디오 프레임 캡처",
)
async def capture_frame_endpoint(
    req: CaptureFrameRequest,
    _user: User = Depends(get_current_user),
):
    """비디오의 특정 타임스탬프에서 프레임을 추출하여 S3에 이미지로 업로드한다."""
    image_url = await capture_frame(req.source_url, req.timestamp)
    return CaptureFrameResponse(image_url=image_url)


@router.post("/info", response_model=VideoInfoResponse, summary="비디오 메타데이터")
async def video_info_endpoint(
    req: dict,
    _user: User = Depends(get_current_user),
):
    """비디오 URL의 메타데이터(duration, resolution, fps)를 반환한다."""
    url = req.get("url", "")
    info = await get_video_info(url)
    return VideoInfoResponse(
        duration=info.get("duration", 0),
        width=info.get("width", 0),
        height=info.get("height", 0),
        fps=info.get("fps", 30.0),
    )


@router.post("/speed", response_model=SpeedResponse, summary="비디오 속도 변경")
async def speed_video_endpoint(
    req: SpeedRequest,
    user: User = Depends(get_current_user),
):
    """비디오 재생 속도를 변경하여 S3에 업로드한다."""
    result_url = await speed_video(req.source_url, req.speed)

    # DB에 자동 저장하지 않음. 사용자가 /save-edit로 명시적으로 저장 필요

    return SpeedResponse(result_url=result_url)


@router.post("/reverse", response_model=ReverseResponse, summary="비디오 역재생")
async def reverse_video_endpoint(
    req: ReverseRequest,
    user: User = Depends(get_current_user),
):
    """비디오를 역재생하여 S3에 업로드한다."""
    result_url = await reverse_video(req.source_url)

    # DB에 자동 저장하지 않음. 사용자가 /save-edit로 명시적으로 저장 필요

    return ReverseResponse(result_url=result_url)


@router.post("/filter", response_model=FilterResponse, summary="비디오 필터 적용")
async def filter_video_endpoint(
    req: FilterRequest,
    user: User = Depends(get_current_user),
):
    """비디오에 필터/색보정을 적용하여 S3에 업로드한다."""
    result_url = await apply_filter(req.source_url, req.filter_name, req.params)

    # DB에 자동 저장하지 않음. 사용자가 /save-edit로 명시적으로 저장 필요

    return FilterResponse(result_url=result_url)


@router.post("/save-edit", response_model=SaveEditResponse, summary="편집 결과 저장")
async def save_edit_endpoint(
    req: SaveEditRequest,
    user: User = Depends(get_current_user),
):
    """merge 등 편집 결과를 히스토리에 저장한다."""
    now = datetime.now(timezone.utc)
    gen = Generation(
        user_id=user.id,
        model_id=req.edit_type,
        type="video",
        status="completed",
        prompt=req.prompt or f"Edited with {req.edit_type}",
        params_json=req.params_json or "{}",
        result_url=req.result_url,
        is_public=False,
        created_at=now,
        completed_at=now,
    )
    async with async_session() as db:
        db.add(gen)
        await db.commit()
        db.refresh(gen)

    return SaveEditResponse(id=gen.id, result_url=gen.result_url)
