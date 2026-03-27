"""비디오 편집 API — 트리밍, 업로드, 메타데이터"""

import uuid
import logging
from datetime import datetime, timezone
from typing import Optional
from urllib.parse import unquote

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from app.dependencies import get_current_user
from app.models.database import Generation, User, async_session
from app.services.video_processor import (
    trim_video, merge_videos, get_video_info, capture_frame,
    speed_video, reverse_video, apply_filter, add_text_overlay,
    add_watermark, add_subtitles, change_resolution, video_to_gif, extract_thumbnails,
    crop_video, add_letterbox, rotate_video, change_fps,
    extract_audio, remove_audio, replace_audio, adjust_volume, mix_audio,
    detect_scenes, split_scene,
    apply_creative_preset,
    shorts_convert, video_collage, before_after_video,
    add_poll_overlay, add_quiz_overlay,
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


class TextOverlayRequest(BaseModel):
    source_url: str = Field(..., description="원본 비디오 CDN URL")
    text: str = Field(..., description="오버레이할 텍스트", max_length=200)
    position: str = Field("bottom", description="텍스트 위치 (top, center, bottom)")
    font_size: int = Field(36, ge=10, le=100, description="폰트 크기")
    color: str = Field("white", description="텍스트 색상 (white, black, red, yellow)")
    start_time: Optional[float] = Field(None, description="텍스트 표시 시작 시간(초)")
    end_time: Optional[float] = Field(None, description="텍스트 표시 종료 시간(초)")


class TextOverlayResponse(BaseModel):
    result_url: str


class WatermarkRequest(BaseModel):
    source_url: str = Field(..., description="원본 비디오 CDN URL")
    mode: str = Field("text", description="워터마크 모드 (text, image)")
    text: str = Field("", description="텍스트 워터마크 내용", max_length=100)
    image_url: Optional[str] = Field(None, description="이미지 워터마크 URL")
    position: str = Field("bottom-right", description="위치 (top-left, top-right, bottom-left, bottom-right, center)")
    opacity: float = Field(0.5, ge=0.1, le=1.0, description="투명도 (0.1~1.0)")
    font_size: int = Field(24, ge=10, le=100, description="텍스트 폰트 크기")
    color: str = Field("white", description="텍스트 색상")
    image_scale: int = Field(25, ge=5, le=80, description="이미지 워터마크 크기 (비디오 너비 대비 %)")


class WatermarkResponse(BaseModel):
    result_url: str


class SubtitleItem(BaseModel):
    text: str = Field(..., description="자막 텍스트", max_length=200)
    start_time: float = Field(..., ge=0, description="시작 시간(초)")
    end_time: float = Field(..., gt=0, description="종료 시간(초)")
    position: str = Field("bottom", description="위치 (top, center, bottom)")
    font_size: int = Field(36, ge=10, le=100, description="폰트 크기")
    color: str = Field("white", description="텍스트 색상")


class SubtitlesRequest(BaseModel):
    source_url: str = Field(..., description="원본 비디오 CDN URL")
    subtitles: list[SubtitleItem] = Field(..., description="자막 목록", min_length=1)


class SubtitlesResponse(BaseModel):
    result_url: str


# ── 오디오 ──

class ExtractAudioRequest(BaseModel):
    source_url: str = Field(..., description="원본 비디오 CDN URL")

class ExtractAudioResponse(BaseModel):
    audio_url: str

class RemoveAudioRequest(BaseModel):
    source_url: str = Field(..., description="원본 비디오 CDN URL")

class RemoveAudioResponse(BaseModel):
    result_url: str

class ReplaceAudioRequest(BaseModel):
    source_url: str = Field(..., description="원본 비디오 CDN URL")
    audio_url: str = Field(..., description="새 오디오 파일 CDN URL")

class ReplaceAudioResponse(BaseModel):
    result_url: str

class AdjustVolumeRequest(BaseModel):
    source_url: str = Field(..., description="원본 비디오 CDN URL")
    volume: float = Field(1.0, ge=0.0, le=5.0, description="볼륨 배율 (1.0=원본)")

class AdjustVolumeResponse(BaseModel):
    result_url: str

class MixAudioRequest(BaseModel):
    source_url: str = Field(..., description="원본 비디오 CDN URL")
    audio_url: str = Field(..., description="믹싱할 오디오(BGM) CDN URL")
    original_volume: float = Field(1.0, ge=0.0, le=5.0, description="원본 오디오 볼륨")
    mix_volume: float = Field(0.5, ge=0.0, le=5.0, description="BGM 볼륨")

class MixAudioResponse(BaseModel):
    result_url: str


class SaveEditRequest(BaseModel):
    result_url: str = Field(..., description="저장할 편집 결과 URL")
    edit_type: str = Field(..., description="편집 타입 (merge, trim, speed, reverse, filter)")
    prompt: str = Field(default="", description="결과 설명/프롬프트")
    params_json: Optional[str] = Field(None, description="편집 파라미터 JSON")
    is_public: Optional[bool] = Field(False, description="갤러리 공개 여부")


class SaveEditResponse(BaseModel):
    id: str
    result_url: str


class ChangeResolutionRequest(BaseModel):
    source_url: str = Field(..., description="원본 비디오 URL")
    resolution: str = Field(..., description="목표 해상도: 480p, 720p, 1080p, 1440p, 4k")


class ChangeResolutionResponse(BaseModel):
    result_url: str


class VideoToGifRequest(BaseModel):
    source_url: str = Field(..., description="원본 비디오 URL")
    start_time: Optional[float] = Field(None, description="시작 시간 (초)")
    end_time: Optional[float] = Field(None, description="종료 시간 (초)")
    width: int = Field(480, description="GIF 가로 크기 (px)", ge=120, le=1280)
    fps: int = Field(15, description="GIF FPS", ge=5, le=30)


class VideoToGifResponse(BaseModel):
    gif_url: str


class ExtractThumbnailsRequest(BaseModel):
    source_url: str = Field(..., description="원본 비디오 URL")
    count: int = Field(8, description="추출할 썸네일 수", ge=2, le=20)


class ExtractThumbnailsResponse(BaseModel):
    thumbnails: list[str]


class CropRequest(BaseModel):
    source_url: str = Field(..., description="원본 비디오 URL")
    x: int = Field(..., description="크롭 시작 X 좌표", ge=0)
    y: int = Field(..., description="크롭 시작 Y 좌표", ge=0)
    width: int = Field(..., description="크롭 가로 크기", ge=1)
    height: int = Field(..., description="크롭 세로 크기", ge=1)


class CropResponse(BaseModel):
    result_url: str


class LetterboxRequest(BaseModel):
    source_url: str = Field(..., description="원본 비디오 URL")
    target_ratio: str = Field(..., description="목표 비율: 16:9, 9:16, 4:3, 1:1, 21:9 등")
    color: str = Field("black", description="패딩 색상")


class LetterboxResponse(BaseModel):
    result_url: str


class RotateRequest(BaseModel):
    source_url: str = Field(..., description="원본 비디오 URL")
    transform: str = Field(..., description="변환: 90, 180, 270, flip_h, flip_v")


class RotateResponse(BaseModel):
    result_url: str


class ChangeFpsRequest(BaseModel):
    source_url: str = Field(..., description="원본 비디오 URL")
    fps: int = Field(..., description="목표 FPS", ge=1, le=120)


class ChangeFpsResponse(BaseModel):
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


@router.post("/text-overlay", response_model=TextOverlayResponse, summary="텍스트 오버레이")
async def text_overlay_endpoint(
    req: TextOverlayRequest,
    user: User = Depends(get_current_user),
):
    """비디오에 텍스트 오버레이를 추가하여 S3에 업로드한다."""
    result_url = await add_text_overlay(
        req.source_url, req.text, req.position,
        req.font_size, req.color, req.start_time, req.end_time,
    )
    return TextOverlayResponse(result_url=result_url)


@router.post("/watermark", response_model=WatermarkResponse, summary="워터마크 추가")
async def watermark_endpoint(
    req: WatermarkRequest,
    user: User = Depends(get_current_user),
):
    """비디오에 텍스트 또는 이미지 워터마크를 추가하여 S3에 업로드한다."""
    result_url = await add_watermark(
        req.source_url, req.mode, req.text, req.image_url,
        req.position, req.opacity, req.font_size, req.color,
        req.image_scale,
    )
    return WatermarkResponse(result_url=result_url)


@router.post("/subtitles", response_model=SubtitlesResponse, summary="자막 추가")
async def subtitles_endpoint(
    req: SubtitlesRequest,
    user: User = Depends(get_current_user),
):
    """비디오에 여러 자막을 추가하여 S3에 업로드한다."""
    subs = [s.dict() for s in req.subtitles]
    result_url = await add_subtitles(req.source_url, subs)
    return SubtitlesResponse(result_url=result_url)


# ── 오디오 엔드포인트 ──


@router.post("/extract-audio", response_model=ExtractAudioResponse, summary="오디오 추출")
async def extract_audio_endpoint(
    req: ExtractAudioRequest,
    user: User = Depends(get_current_user),
):
    """비디오에서 오디오를 mp3로 추출하여 S3에 업로드한다."""
    audio_url = await extract_audio(req.source_url)
    return ExtractAudioResponse(audio_url=audio_url)


@router.post("/remove-audio", response_model=RemoveAudioResponse, summary="오디오 제거")
async def remove_audio_endpoint(
    req: RemoveAudioRequest,
    user: User = Depends(get_current_user),
):
    """비디오에서 오디오를 제거(음소거)하여 S3에 업로드한다."""
    result_url = await remove_audio(req.source_url)
    return RemoveAudioResponse(result_url=result_url)


@router.post("/replace-audio", response_model=ReplaceAudioResponse, summary="오디오 교체")
async def replace_audio_endpoint(
    req: ReplaceAudioRequest,
    user: User = Depends(get_current_user),
):
    """비디오의 오디오를 다른 오디오로 교체하여 S3에 업로드한다."""
    result_url = await replace_audio(req.source_url, req.audio_url)
    return ReplaceAudioResponse(result_url=result_url)


@router.post("/adjust-volume", response_model=AdjustVolumeResponse, summary="볼륨 조절")
async def adjust_volume_endpoint(
    req: AdjustVolumeRequest,
    user: User = Depends(get_current_user),
):
    """비디오의 오디오 볼륨을 조절하여 S3에 업로드한다."""
    result_url = await adjust_volume(req.source_url, req.volume)
    return AdjustVolumeResponse(result_url=result_url)


@router.post("/mix-audio", response_model=MixAudioResponse, summary="BGM 믹싱")
async def mix_audio_endpoint(
    req: MixAudioRequest,
    user: User = Depends(get_current_user),
):
    """비디오 원본 오디오에 새 오디오를 믹싱(BGM 추가)하여 S3에 업로드한다."""
    result_url = await mix_audio(req.source_url, req.audio_url, req.original_volume, req.mix_volume)
    return MixAudioResponse(result_url=result_url)


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
        is_public=req.is_public if req.is_public is not None else False,
        created_at=now,
        completed_at=now,
    )
    async with async_session() as db:
        db.add(gen)
        await db.commit()
        db.refresh(gen)

    return SaveEditResponse(id=gen.id, result_url=gen.result_url)


@router.post("/change-resolution", response_model=ChangeResolutionResponse, summary="해상도 변환")
async def change_resolution_endpoint(
    req: ChangeResolutionRequest,
    user: User = Depends(get_current_user),
):
    """비디오 해상도를 변환하여 S3에 업로드한다."""
    result_url = await change_resolution(req.source_url, req.resolution)
    return ChangeResolutionResponse(result_url=result_url)


@router.post("/to-gif", response_model=VideoToGifResponse, summary="GIF 변환")
async def video_to_gif_endpoint(
    req: VideoToGifRequest,
    user: User = Depends(get_current_user),
):
    """비디오(구간)를 GIF로 변환하여 S3에 업로드한다."""
    gif_url = await video_to_gif(
        req.source_url, req.start_time, req.end_time, req.width, req.fps,
    )
    return VideoToGifResponse(gif_url=gif_url)


@router.post("/extract-thumbnails", response_model=ExtractThumbnailsResponse, summary="썸네일 추출")
async def extract_thumbnails_endpoint(
    req: ExtractThumbnailsRequest,
    user: User = Depends(get_current_user),
):
    """비디오에서 균등 간격으로 여러 프레임을 추출한다."""
    thumbnails = await extract_thumbnails(req.source_url, req.count)
    return ExtractThumbnailsResponse(thumbnails=thumbnails)


@router.post("/crop", response_model=CropResponse, summary="비디오 크롭")
async def crop_endpoint(
    req: CropRequest,
    user: User = Depends(get_current_user),
):
    """비디오의 특정 영역을 크롭하여 S3에 업로드한다."""
    result_url = await crop_video(req.source_url, req.x, req.y, req.width, req.height)
    return CropResponse(result_url=result_url)


@router.post("/letterbox", response_model=LetterboxResponse, summary="레터박스 추가")
async def letterbox_endpoint(
    req: LetterboxRequest,
    user: User = Depends(get_current_user),
):
    """비디오에 레터박스(패딩)를 추가하여 목표 비율로 변환한다."""
    result_url = await add_letterbox(req.source_url, req.target_ratio, req.color)
    return LetterboxResponse(result_url=result_url)


@router.post("/rotate", response_model=RotateResponse, summary="회전/뒤집기")
async def rotate_endpoint(
    req: RotateRequest,
    user: User = Depends(get_current_user),
):
    """비디오를 회전 또는 뒤집기하여 S3에 업로드한다."""
    result_url = await rotate_video(req.source_url, req.transform)
    return RotateResponse(result_url=result_url)


@router.post("/change-fps", response_model=ChangeFpsResponse, summary="FPS 변환")
async def change_fps_endpoint(
    req: ChangeFpsRequest,
    user: User = Depends(get_current_user),
):
    """비디오 FPS를 변환하여 S3에 업로드한다."""
    result_url = await change_fps(req.source_url, req.fps)
    return ChangeFpsResponse(result_url=result_url)


@router.get("/download", summary="비디오 다운로드 프록시")
async def download_proxy(
    url: str = Query(..., description="다운로드할 비디오 URL"),
    filename: str = Query("video.mp4", description="저장 파일명"),
    user: User = Depends(get_current_user),
):
    """외부 URL의 비디오를 프록시하여 다운로드 헤더와 함께 반환한다."""
    decoded_url = unquote(url)

    async def stream():
        async with httpx.AsyncClient(follow_redirects=True, timeout=120) as client:
            async with client.stream("GET", decoded_url) as resp:
                resp.raise_for_status()
                async for chunk in resp.aiter_bytes(chunk_size=65536):
                    yield chunk

    return StreamingResponse(
        stream(),
        media_type="video/mp4",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
        },
    )


# ── 장면 분할 ──────────────────────────────────
class DetectScenesRequest(BaseModel):
    source_url: str = Field(..., description="원본 비디오 URL")
    threshold: float = Field(0.3, ge=0.1, le=0.9, description="장면 전환 감도 (낮을수록 민감)")
    min_scene_duration: float = Field(1.0, ge=0.5, description="최소 장면 길이 (초)")


class SplitSceneRequest(BaseModel):
    source_url: str = Field(..., description="원본 비디오 URL")
    start_time: float = Field(..., ge=0, description="시작 시간 (초)")
    end_time: float = Field(..., ge=0, description="종료 시간 (초)")


@router.post("/detect-scenes")
async def detect_scenes_endpoint(
    req: DetectScenesRequest,
    user: User = Depends(get_current_user),
):
    scenes = await detect_scenes(
        source_url=req.source_url,
        threshold=req.threshold,
        min_scene_duration=req.min_scene_duration,
    )
    return {"scenes": scenes}


@router.post("/split-scene")
async def split_scene_endpoint(
    req: SplitSceneRequest,
    user: User = Depends(get_current_user),
):
    result_url = await split_scene(
        source_url=req.source_url,
        start_time=req.start_time,
        end_time=req.end_time,
    )
    return {"result_url": result_url}


# ── 일괄 다운로드 (ZIP) ──────────────────────────────────
class BulkDownloadRequest(BaseModel):
    urls: list = Field(..., description="다운로드할 비디오 URL 목록", min_length=1, max_length=50)
    filenames: Optional[list] = Field(None, description="각 파일의 이름 목록 (urls와 동일 길이)")


@router.post("/bulk-download", summary="여러 비디오를 ZIP으로 다운로드")
async def bulk_download(
    req: BulkDownloadRequest,
    user: User = Depends(get_current_user),
):
    """여러 비디오 URL을 병렬로 다운로드하여 ZIP 스트림으로 반환한다."""
    import io
    import zipfile
    import asyncio

    filenames = req.filenames or [f"video_{i+1}.mp4" for i in range(len(req.urls))]
    # 길이 맞추기
    while len(filenames) < len(req.urls):
        filenames.append(f"video_{len(filenames)+1}.mp4")

    # 병렬 다운로드
    async def fetch_one(url: str) -> bytes:
        async with httpx.AsyncClient(follow_redirects=True, timeout=120) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            return resp.content

    tasks = [fetch_one(url) for url in req.urls]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    # ZIP 생성
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        for i, data in enumerate(results):
            if isinstance(data, Exception):
                logger.warning("ZIP 다운로드 실패 [%s]: %s", req.urls[i], data)
                continue
            zf.writestr(filenames[i], data)
    buf.seek(0)

    return StreamingResponse(
        buf,
        media_type="application/zip",
        headers={
            "Content-Disposition": f'attachment; filename="videos_{len(req.urls)}.zip"',
        },
    )


# ──────────────────────────────────────
# 크리에이티브 프리셋
# ──────────────────────────────────────

class CreativePresetRequest(BaseModel):
    source_url: str = Field(..., description="원본 비디오 URL")
    preset: str = Field(..., description="프리셋 이름 (camcorder, cctv, breaking_news, old_tv, drone_view, countdown, film_credits, vintage_cam)")
    params: Optional[dict] = Field(None, description="프리셋별 커스텀 파라미터")


@router.post("/creative-preset")
async def creative_preset_endpoint(
    req: CreativePresetRequest,
    user: User = Depends(get_current_user),
):
    """크리에이티브 프리셋 적용"""
    try:
        result_url = await apply_creative_preset(
            source_url=req.source_url,
            preset=req.preset,
            params=req.params,
        )
        return {"result_url": result_url}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.exception("크리에이티브 프리셋 적용 실패")
        raise HTTPException(status_code=500, detail=str(e))


# ──────────────────────────────────────
# 쇼츠/릴스 자동 변환
# ──────────────────────────────────────
class ShortsConvertRequest(BaseModel):
    source_url: str
    crop_x: str = Field("center", description="크롭 위치: left, center, right")


@router.post("/shorts-convert")
async def shorts_convert_endpoint(
    req: ShortsConvertRequest,
    user: User = Depends(get_current_user),
):
    try:
        result_url = await shorts_convert(
            video_url=req.source_url,
            crop_x=req.crop_x,
        )
        return {"result_url": result_url}
    except Exception as e:
        logger.exception("쇼츠 변환 실패")
        raise HTTPException(status_code=500, detail=str(e))


# ──────────────────────────────────────
# 영상 콜라주
# ──────────────────────────────────────
class CollageRequest(BaseModel):
    video_urls: list = Field(..., description="영상 URL 목록 (2~4개)")
    layout: str = Field("2x1", description="레이아웃: 2x1, 1x2, 2x2, 3x1, 1x3")
    output_width: int = Field(1280, description="출력 너비")
    output_height: int = Field(720, description="출력 높이")


@router.post("/collage")
async def collage_endpoint(
    req: CollageRequest,
    user: User = Depends(get_current_user),
):
    if len(req.video_urls) < 2:
        raise HTTPException(status_code=400, detail="최소 2개 영상이 필요합니다")
    if len(req.video_urls) > 4:
        raise HTTPException(status_code=400, detail="최대 4개 영상까지 가능합니다")
    try:
        result_url = await video_collage(
            video_urls=req.video_urls,
            layout=req.layout,
            output_width=req.output_width,
            output_height=req.output_height,
        )
        return {"result_url": result_url}
    except Exception as e:
        logger.exception("영상 콜라주 실패")
        raise HTTPException(status_code=500, detail=str(e))


# ──────────────────────────────────────
# 비포/애프터 비교 영상
# ──────────────────────────────────────
class BeforeAfterRequest(BaseModel):
    before_url: str = Field(..., description="비포 영상 URL")
    after_url: str = Field(..., description="애프터 영상 URL")
    mode: str = Field("side_by_side", description="비교 모드: side_by_side, slide")
    output_width: int = Field(1280, description="출력 너비")
    output_height: int = Field(720, description="출력 높이")


@router.post("/before-after")
async def before_after_endpoint(
    req: BeforeAfterRequest,
    user: User = Depends(get_current_user),
):
    try:
        result_url = await before_after_video(
            before_url=req.before_url,
            after_url=req.after_url,
            mode=req.mode,
            output_width=req.output_width,
            output_height=req.output_height,
        )
        return {"result_url": result_url}
    except Exception as e:
        logger.exception("비포/애프터 영상 생성 실패")
        raise HTTPException(status_code=500, detail=str(e))


# ──────────────────────────────────────
# A/B 투표 오버레이
# ──────────────────────────────────────
class PollQuestionItem(BaseModel):
    question: str = Field(..., description="투표 질문")
    option_a: str = Field(..., description="A 옵션")
    option_b: str = Field(..., description="B 옵션")
    start: float = Field(0, description="표시 시작 시간(초)")
    end: float = Field(5, description="표시 종료 시간(초)")


class PollOverlayRequest(BaseModel):
    source_url: str
    questions: list[PollQuestionItem] = Field(..., description="투표 질문 세트")
    text_color: str = Field("white", description="텍스트 색상")
    accent_color: str = Field("#4A90D9", description="A 옵션 박스 색상")


@router.post("/poll-overlay")
async def poll_overlay_endpoint(
    req: PollOverlayRequest,
    user: User = Depends(get_current_user),
):
    try:
        questions_data = [q.model_dump() for q in req.questions]
        result_url = await add_poll_overlay(
            video_url=req.source_url,
            questions=questions_data,
            text_color=req.text_color,
            accent_color=req.accent_color,
        )
        return {"result_url": result_url}
    except Exception as e:
        logger.exception("투표 오버레이 실패")
        raise HTTPException(status_code=500, detail=str(e))


# ──────────────────────────────────────
# 퀴즈 오버레이
# ──────────────────────────────────────
class QuizQuestionItem(BaseModel):
    question: str = Field(..., description="퀴즈 질문")
    choices: list = Field(..., description="보기 목록 (2~4개)")
    answer_index: int = Field(0, description="정답 인덱스 (0부터)")
    start: float = Field(0, description="표시 시작 시간(초)")
    end: float = Field(10, description="표시 종료 시간(초)")
    reveal_after: float = Field(5, description="정답 공개까지 시간(초)")


class QuizOverlayRequest(BaseModel):
    source_url: str
    questions: list[QuizQuestionItem] = Field(..., description="퀴즈 질문 세트")
    text_color: str = Field("white", description="텍스트 색상")


@router.post("/quiz-overlay")
async def quiz_overlay_endpoint(
    req: QuizOverlayRequest,
    user: User = Depends(get_current_user),
):
    for q in req.questions:
        if len(q.choices) < 2 or len(q.choices) > 4:
            raise HTTPException(status_code=400, detail="보기는 2~4개여야 합니다")
        if q.answer_index < 0 or q.answer_index >= len(q.choices):
            raise HTTPException(status_code=400, detail="정답 인덱스가 범위를 벗어났습니다")
    try:
        questions_data = [q.model_dump() for q in req.questions]
        result_url = await add_quiz_overlay(
            video_url=req.source_url,
            questions=questions_data,
            text_color=req.text_color,
        )
        return {"result_url": result_url}
    except Exception as e:
        logger.exception("퀴즈 오버레이 실패")
        raise HTTPException(status_code=500, detail=str(e))
