"""비디오 처리 서비스 — ffmpeg 기반 트리밍, 메타데이터 추출"""

import json
import logging
import os
import tempfile
import uuid
from typing import Optional

import ffmpeg
import httpx

from app.services.storage import upload_generation_image, upload_generation_video

logger = logging.getLogger(__name__)


async def get_video_info(video_url: str) -> dict:
    """비디오 URL에서 duration, width, height, fps 등 메타데이터를 추출한다."""
    tmp_path = None
    try:
        tmp_path = await _download_to_temp(video_url)
        probe = ffmpeg.probe(tmp_path)
        video_stream = next(
            (s for s in probe["streams"] if s["codec_type"] == "video"), None
        )
        if not video_stream:
            return {"duration": 0}

        duration = float(probe.get("format", {}).get("duration", 0))
        return {
            "duration": duration,
            "width": int(video_stream.get("width", 0)),
            "height": int(video_stream.get("height", 0)),
            "fps": _parse_fps(video_stream.get("r_frame_rate", "30/1")),
        }
    except Exception:
        logger.exception("비디오 정보 추출 실패: %s", video_url)
        return {"duration": 0}
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.unlink(tmp_path)


async def trim_video(
    source_url: str, start_time: float, end_time: float
) -> str:
    """비디오를 트리밍하여 S3에 업로드하고 CDN URL을 반환한다."""
    input_path = None
    output_path = None
    try:
        input_path = await _download_to_temp(source_url)

        output_path = os.path.join(
            tempfile.gettempdir(), f"trim_{uuid.uuid4().hex}.mp4"
        )

        # ffmpeg 트리밍: -ss (시작) -to (끝) -c copy (재인코딩 없이 빠르게)
        (
            ffmpeg
            .input(input_path, ss=start_time, to=end_time)
            .output(output_path, c="copy", movflags="+faststart")
            .overwrite_output()
            .run(quiet=True)
        )

        with open(output_path, "rb") as f:
            video_data = f.read()

        # S3 업로드
        edit_id = uuid.uuid4().hex
        cdn_url = await upload_generation_video(f"edit_{edit_id}", video_data, "mp4")
        if not cdn_url:
            raise RuntimeError("S3 업로드 실패")

        return cdn_url
    finally:
        if input_path and os.path.exists(input_path):
            os.unlink(input_path)
        if output_path and os.path.exists(output_path):
            os.unlink(output_path)


async def capture_frame(video_url: str, timestamp: float) -> str:
    """비디오의 특정 타임스탬프에서 프레임을 추출하여 S3에 PNG로 업로드한다."""
    input_path = None
    output_path = None
    try:
        input_path = await _download_to_temp(video_url)
        output_path = os.path.join(
            tempfile.gettempdir(), f"frame_{uuid.uuid4().hex}.png"
        )

        (
            ffmpeg
            .input(input_path, ss=timestamp)
            .output(output_path, vframes=1, format="image2")
            .overwrite_output()
            .run(quiet=True)
        )

        with open(output_path, "rb") as f:
            image_data = f.read()

        frame_id = f"frame_{uuid.uuid4().hex}"
        cdn_url = await upload_generation_image(frame_id, image_data, "png")
        return cdn_url
    except Exception:
        logger.exception("프레임 캡처 실패: %s @ %.2fs", video_url, timestamp)
        raise
    finally:
        if input_path and os.path.exists(input_path):
            os.unlink(input_path)
        if output_path and os.path.exists(output_path):
            os.unlink(output_path)


async def merge_videos(video_urls: list[str]) -> str:
    """여러 비디오를 순서대로 합쳐서 S3에 업로드하고 CDN URL을 반환한다.

    코덱/해상도가 다른 비디오도 처리하기 위해 filter_complex concat 사용 (재인코딩).
    """
    input_paths: list[str] = []
    output_path = None
    try:
        # 모든 비디오 다운로드
        for url in video_urls:
            path = await _download_to_temp(url)
            input_paths.append(path)

        output_path = os.path.join(
            tempfile.gettempdir(), f"merge_{uuid.uuid4().hex}.mp4"
        )

        # filter_complex concat: 해상도/코덱이 달라도 동작
        n = len(input_paths)
        inputs = [ffmpeg.input(p) for p in input_paths]

        # 각 입력을 동일 해상도(1280x720)로 스케일 + 오디오 없는 경우 무음 추가
        filter_parts = []
        for i in range(n):
            filter_parts.append(
                f"[{i}:v]scale=1280:720:force_original_aspect_ratio=decrease,"
                f"pad=1280:720:(ow-iw)/2:(oh-ih)/2,setsar=1[v{i}]"
            )

        # concat 필터
        video_streams = "".join(f"[v{i}]" for i in range(n))
        filter_parts.append(f"{video_streams}concat=n={n}:v=1:a=0[outv]")
        filter_complex = ";".join(filter_parts)

        # ffmpeg 실행 (subprocess 직접 호출)
        import subprocess
        cmd = ["ffmpeg", "-y"]
        for p in input_paths:
            cmd.extend(["-i", p])
        cmd.extend([
            "-filter_complex", filter_complex,
            "-map", "[outv]",
            "-c:v", "libx264", "-preset", "fast", "-crf", "23",
            "-movflags", "+faststart",
            output_path,
        ])
        subprocess.run(cmd, check=True, capture_output=True)

        with open(output_path, "rb") as f:
            video_data = f.read()

        merge_id = uuid.uuid4().hex
        cdn_url = await upload_generation_video(f"merge_{merge_id}", video_data, "mp4")
        if not cdn_url:
            raise RuntimeError("S3 업로드 실패")
        return cdn_url
    finally:
        for p in input_paths:
            if os.path.exists(p):
                os.unlink(p)
        if output_path and os.path.exists(output_path):
            os.unlink(output_path)


async def speed_video(source_url: str, speed_factor: float) -> str:
    """비디오 속도를 변경하여 S3에 업로드하고 CDN URL을 반환한다."""
    input_path = None
    output_path = None
    try:
        input_path = await _download_to_temp(source_url)
        output_path = os.path.join(
            tempfile.gettempdir(), f"speed_{uuid.uuid4().hex}.mp4"
        )

        import subprocess
        # setpts로 속도 변경 (speed_factor > 1 = 빠르게, < 1 = 느리게)
        pts_factor = 1.0 / speed_factor
        cmd = [
            "ffmpeg", "-y", "-i", input_path,
            "-filter:v", f"setpts={pts_factor}*PTS",
            "-an",  # 오디오 제거 (속도 변경 시 싱크 문제 방지)
            "-c:v", "libx264", "-preset", "fast", "-crf", "23",
            "-movflags", "+faststart",
            output_path,
        ]
        subprocess.run(cmd, check=True, capture_output=True)

        with open(output_path, "rb") as f:
            video_data = f.read()

        edit_id = uuid.uuid4().hex
        cdn_url = await upload_generation_video(f"speed_{edit_id}", video_data, "mp4")
        if not cdn_url:
            raise RuntimeError("S3 업로드 실패")
        return cdn_url
    finally:
        if input_path and os.path.exists(input_path):
            os.unlink(input_path)
        if output_path and os.path.exists(output_path):
            os.unlink(output_path)


async def reverse_video(source_url: str) -> str:
    """비디오를 역재생하여 S3에 업로드하고 CDN URL을 반환한다."""
    input_path = None
    output_path = None
    try:
        input_path = await _download_to_temp(source_url)
        output_path = os.path.join(
            tempfile.gettempdir(), f"reverse_{uuid.uuid4().hex}.mp4"
        )

        import subprocess
        cmd = [
            "ffmpeg", "-y", "-i", input_path,
            "-vf", "reverse",
            "-an",
            "-c:v", "libx264", "-preset", "fast", "-crf", "23",
            "-movflags", "+faststart",
            output_path,
        ]
        subprocess.run(cmd, check=True, capture_output=True)

        with open(output_path, "rb") as f:
            video_data = f.read()

        edit_id = uuid.uuid4().hex
        cdn_url = await upload_generation_video(f"reverse_{edit_id}", video_data, "mp4")
        if not cdn_url:
            raise RuntimeError("S3 업로드 실패")
        return cdn_url
    finally:
        if input_path and os.path.exists(input_path):
            os.unlink(input_path)
        if output_path and os.path.exists(output_path):
            os.unlink(output_path)


async def apply_filter(
    source_url: str, filter_name: str, params: Optional[dict] = None
) -> str:
    """비디오에 필터/색보정을 적용하여 S3에 업로드하고 CDN URL을 반환한다."""
    input_path = None
    output_path = None
    try:
        input_path = await _download_to_temp(source_url)
        output_path = os.path.join(
            tempfile.gettempdir(), f"filter_{uuid.uuid4().hex}.mp4"
        )
        params = params or {}

        # 필터별 ffmpeg vf 문자열 생성
        if filter_name == "grayscale":
            vf = "colorchannelmixer=.3:.4:.3:0:.3:.4:.3:0:.3:.4:.3"
        elif filter_name == "sepia":
            vf = "colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131"
        elif filter_name == "adjust":
            brightness = params.get("brightness", 0)  # -1.0 ~ 1.0
            contrast = params.get("contrast", 1)       # 0.0 ~ 3.0
            saturation = params.get("saturation", 1)    # 0.0 ~ 3.0
            vf = f"eq=brightness={brightness}:contrast={contrast}:saturation={saturation}"
        else:
            raise ValueError(f"지원하지 않는 필터: {filter_name}")

        import subprocess
        cmd = [
            "ffmpeg", "-y", "-i", input_path,
            "-vf", vf,
            "-an",
            "-c:v", "libx264", "-preset", "fast", "-crf", "23",
            "-movflags", "+faststart",
            output_path,
        ]
        subprocess.run(cmd, check=True, capture_output=True)

        with open(output_path, "rb") as f:
            video_data = f.read()

        edit_id = uuid.uuid4().hex
        cdn_url = await upload_generation_video(f"filter_{edit_id}", video_data, "mp4")
        if not cdn_url:
            raise RuntimeError("S3 업로드 실패")
        return cdn_url
    finally:
        if input_path and os.path.exists(input_path):
            os.unlink(input_path)
        if output_path and os.path.exists(output_path):
            os.unlink(output_path)


async def add_text_overlay(
    source_url: str,
    text: str,
    position: str = "bottom",
    font_size: int = 36,
    color: str = "white",
    start_time: Optional[float] = None,
    end_time: Optional[float] = None,
) -> str:
    """비디오에 텍스트 오버레이를 추가하여 S3에 업로드하고 CDN URL을 반환한다."""
    input_path = None
    output_path = None
    try:
        input_path = await _download_to_temp(source_url)
        output_path = os.path.join(
            tempfile.gettempdir(), f"text_{uuid.uuid4().hex}.mp4"
        )

        # 위치별 x, y 계산
        x = "(w-text_w)/2"
        if position == "top":
            y = "h*0.08"
        elif position == "center":
            y = "(h-text_h)/2"
        else:  # bottom
            y = "h*0.85"

        # 텍스트 이스케이프 (ffmpeg drawtext용)
        escaped_text = text.replace("'", "\\'").replace(":", "\\:")

        # drawtext 필터 구성
        drawtext = (
            f"drawtext=text='{escaped_text}'"
            f":x={x}:y={y}"
            f":fontsize={font_size}"
            f":fontcolor={color}"
            f":borderw=2:bordercolor=black@0.6"
        )

        # 시간 범위 지정
        if start_time is not None and end_time is not None:
            drawtext += f":enable='between(t,{start_time},{end_time})'"

        import subprocess
        cmd = [
            "ffmpeg", "-y", "-i", input_path,
            "-vf", drawtext,
            "-c:v", "libx264", "-preset", "fast", "-crf", "23",
            "-c:a", "copy",
            "-movflags", "+faststart",
            output_path,
        ]
        subprocess.run(cmd, check=True, capture_output=True)

        with open(output_path, "rb") as f:
            video_data = f.read()

        edit_id = uuid.uuid4().hex
        cdn_url = await upload_generation_video(f"text_{edit_id}", video_data, "mp4")
        if not cdn_url:
            raise RuntimeError("S3 업로드 실패")
        return cdn_url
    finally:
        if input_path and os.path.exists(input_path):
            os.unlink(input_path)
        if output_path and os.path.exists(output_path):
            os.unlink(output_path)


async def _download_to_temp(url: str) -> str:
    """URL에서 비디오를 다운로드하여 임시 파일에 저장한다."""
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".mp4")
    try:
        async with httpx.AsyncClient(timeout=120, follow_redirects=True) as client:
            resp = await client.get(url)
            resp.raise_for_status()
        tmp.write(resp.content)
        tmp.close()
        return tmp.name
    except Exception:
        tmp.close()
        if os.path.exists(tmp.name):
            os.unlink(tmp.name)
        raise


def _parse_fps(r_frame_rate: str) -> float:
    """ffprobe r_frame_rate 문자열('30/1' 등)을 float로 변환."""
    try:
        num, den = r_frame_rate.split("/")
        return round(float(num) / float(den), 2)
    except (ValueError, ZeroDivisionError):
        return 30.0
