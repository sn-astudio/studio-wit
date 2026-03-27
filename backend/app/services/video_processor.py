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

# ──────────────────────────────────────
# 한국어 폰트 경로 탐색 (Linux/Docker 우선)
# ──────────────────────────────────────
_FONT_CANDIDATES = [
    # Linux / Docker (fonts-noto-cjk 패키지)
    "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
    "/usr/share/fonts/noto-cjk/NotoSansCJK-Regular.ttc",
    "/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc",
    # Linux (fonts-nanum 패키지)
    "/usr/share/fonts/truetype/nanum/NanumGothicBold.ttf",
    "/usr/share/fonts/truetype/nanum/NanumGothic.ttf",
    # macOS
    "/Library/Fonts/NanumGothicBold.otf",
    "/System/Library/Fonts/AppleSDGothicNeo.ttc",
]

def _find_font() -> Optional[str]:
    """시스템에서 사용 가능한 한국어 폰트를 찾아 반환한다."""
    return next((f for f in _FONT_CANDIDATES if os.path.exists(f)), None)


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

        # 정확한 프레임 캡처: input에서 약간 앞부터 seek 후 정확한 시간에 캡처
        seek_start = max(0, timestamp - 1)
        offset = timestamp - seek_start
        (
            ffmpeg
            .input(input_path, ss=seek_start)
            .output(output_path, ss=offset, vframes=1, format="image2")
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


async def extract_thumbnails(video_url: str, count: int = 8) -> list[str]:
    """비디오에서 균등 간격으로 count개의 프레임을 추출하여 S3에 업로드, URL 리스트를 반환한다."""
    input_path = None
    output_paths: list[str] = []
    try:
        input_path = await _download_to_temp(video_url)
        probe = ffmpeg.probe(input_path)
        duration = float(probe.get("format", {}).get("duration", 0))
        if duration <= 0:
            raise ValueError("비디오 duration을 가져올 수 없습니다")

        count = min(count, 20)  # 최대 20장
        interval = duration / (count + 1)
        timestamps = [interval * (i + 1) for i in range(count)]

        urls: list[str] = []
        for ts in timestamps:
            out_path = os.path.join(
                tempfile.gettempdir(), f"thumb_{uuid.uuid4().hex}.jpg"
            )
            output_paths.append(out_path)
            (
                ffmpeg
                .input(input_path, ss=ts)
                .output(out_path, vframes=1, format="image2", **{"q:v": "2"})
                .overwrite_output()
                .run(quiet=True)
            )
            with open(out_path, "rb") as f:
                image_data = f.read()
            frame_id = f"thumb_{uuid.uuid4().hex}"
            cdn_url = await upload_generation_image(frame_id, image_data, "jpg")
            urls.append(cdn_url)

        return urls
    except Exception:
        logger.exception("썸네일 추출 실패: %s", video_url)
        raise
    finally:
        if input_path and os.path.exists(input_path):
            os.unlink(input_path)
        for p in output_paths:
            if os.path.exists(p):
                os.unlink(p)


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
            "-c:v", "libx264", "-preset", "fast", "-crf", "23", "-pix_fmt", "yuv420p",
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
            "-af", f"atempo={speed_factor}",
            "-c:v", "libx264", "-preset", "fast", "-crf", "23", "-pix_fmt", "yuv420p",
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
            "-af", "areverse",
            "-c:v", "libx264", "-preset", "fast", "-crf", "23", "-pix_fmt", "yuv420p",
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
            "-c:a", "copy",
            "-c:v", "libx264", "-preset", "fast", "-crf", "23", "-pix_fmt", "yuv420p",
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

        # 위치별 x, y 계산 (9방향)
        pos_xy = {
            "top-left": ("10", "h*0.08"),
            "top": ("(w-text_w)/2", "h*0.08"),
            "top-right": ("w-text_w-10", "h*0.08"),
            "center-left": ("10", "(h-text_h)/2"),
            "center": ("(w-text_w)/2", "(h-text_h)/2"),
            "center-right": ("w-text_w-10", "(h-text_h)/2"),
            "bottom-left": ("10", "h*0.85"),
            "bottom": ("(w-text_w)/2", "h*0.85"),
            "bottom-right": ("w-text_w-10", "h*0.85"),
        }
        x, y = pos_xy.get(position, pos_xy["bottom"])

        # 텍스트 이스케이프 (ffmpeg drawtext용)
        escaped_text = text.replace("'", "\\'").replace(":", "\\:")

        fontfile = _find_font()

        # drawtext 필터 구성
        drawtext = f"drawtext=text='{escaped_text}'"
        if fontfile:
            drawtext += f":fontfile='{fontfile}'"
        drawtext += (
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
            "-c:v", "libx264", "-preset", "fast", "-crf", "23", "-pix_fmt", "yuv420p",
            "-c:a", "copy",
            "-movflags", "+faststart",
            output_path,
        ]
        result = subprocess.run(cmd, capture_output=True)
        if result.returncode != 0:
            logger.error("ffmpeg text overlay stderr: %s", result.stderr.decode())
            raise RuntimeError(f"ffmpeg 텍스트 오버레이 실패: {result.stderr.decode()[:500]}")

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


async def add_watermark(
    source_url: str,
    mode: str = "text",
    text: str = "",
    image_url: Optional[str] = None,
    position: str = "bottom-right",
    opacity: float = 0.5,
    font_size: int = 24,
    color: str = "white",
    image_scale: int = 25,
) -> str:
    """비디오에 텍스트 또는 이미지 워터마크를 추가하여 S3에 업로드하고 CDN URL을 반환한다."""
    input_path = None
    output_path = None
    overlay_path = None
    try:
        input_path = await _download_to_temp(source_url)
        output_path = os.path.join(
            tempfile.gettempdir(), f"wm_{uuid.uuid4().hex}.mp4"
        )

        # 위치 매핑 (overlay 좌표)
        pos_map = {
            "top-left": ("10", "10"),
            "top-right": ("W-w-10", "10"),
            "bottom-left": ("10", "H-h-10"),
            "bottom-right": ("W-w-10", "H-h-10"),
            "center": ("(W-w)/2", "(H-h)/2"),
        }

        import subprocess

        if mode == "image" and image_url:
            # 이미지 워터마크
            if image_url.startswith("data:"):
                # base64 data URL → 파일로 저장
                import base64
                header, b64data = image_url.split(",", 1)
                ext = "png"
                if "image/jpeg" in header:
                    ext = "jpg"
                elif "image/webp" in header:
                    ext = "webp"
                overlay_path = os.path.join(
                    tempfile.gettempdir(), f"wm_img_{uuid.uuid4().hex}.{ext}"
                )
                with open(overlay_path, "wb") as wf:
                    wf.write(base64.b64decode(b64data))
            else:
                overlay_path = await _download_to_temp(image_url)
            # overlay_path 확장자를 원본에 맞게 변경 (png 등)
            ox, oy = pos_map.get(position, ("W-w-10", "H-h-10"))
            # 이미지를 메인 비디오 높이의 image_scale%로 리사이즈 (scale2ref 사용)
            vf = f"[1:v][0:v]scale2ref=oh*mdar:ih*{image_scale}/100[wm_scaled][base];[wm_scaled]format=rgba,colorchannelmixer=aa={opacity}[wm];[base][wm]overlay={ox}:{oy}"
            cmd = [
                "ffmpeg", "-y",
                "-i", input_path,
                "-i", overlay_path,
                "-filter_complex", vf,
                "-c:v", "libx264", "-preset", "fast", "-crf", "23", "-pix_fmt", "yuv420p",
                "-c:a", "copy",
                "-movflags", "+faststart",
                output_path,
            ]
        else:
            # 텍스트 워터마크
            escaped_text = text.replace("'", "\\'").replace(":", "\\:")
            fontfile = _find_font()

            # 위치 → drawtext 좌표
            dt_pos_map = {
                "top-left": ("10", "10"),
                "top-right": ("w-text_w-10", "10"),
                "bottom-left": ("10", "h-text_h-10"),
                "bottom-right": ("w-text_w-10", "h-text_h-10"),
                "center": ("(w-text_w)/2", "(h-text_h)/2"),
            }
            dx, dy = dt_pos_map.get(position, ("w-text_w-10", "h-text_h-10"))
            alpha_hex = format(int(opacity * 255), "02x")
            # hex 색상(#ff0000) → ffmpeg용 변환
            fc = color.lstrip("#") if color.startswith("#") else color

            drawtext = f"drawtext=text='{escaped_text}'"
            if fontfile:
                drawtext += f":fontfile='{fontfile}'"
            drawtext += (
                f":x={dx}:y={dy}"
                f":fontsize={font_size}"
                f":fontcolor=0x{fc}@0x{alpha_hex}" if color.startswith("#") else
                f":x={dx}:y={dy}"
                f":fontsize={font_size}"
                f":fontcolor={color}@0x{alpha_hex}"
            )
            drawtext += ":borderw=1:bordercolor=black@0.3"
            cmd = [
                "ffmpeg", "-y", "-i", input_path,
                "-vf", drawtext,
                "-c:v", "libx264", "-preset", "fast", "-crf", "23", "-pix_fmt", "yuv420p",
                "-c:a", "copy",
                "-movflags", "+faststart",
                output_path,
            ]

        result = subprocess.run(cmd, capture_output=True)
        if result.returncode != 0:
            stderr = result.stderr.decode(errors="replace")
            logger.error("ffmpeg watermark stderr: %s", stderr[-1000:])
            raise RuntimeError(f"ffmpeg watermark failed: {stderr[-500:]}")

        with open(output_path, "rb") as f:
            video_data = f.read()

        edit_id = uuid.uuid4().hex
        cdn_url = await upload_generation_video(f"wm_{edit_id}", video_data, "mp4")
        if not cdn_url:
            raise RuntimeError("S3 업로드 실패")
        return cdn_url
    finally:
        if input_path and os.path.exists(input_path):
            os.unlink(input_path)
        if output_path and os.path.exists(output_path):
            os.unlink(output_path)
        if overlay_path and os.path.exists(overlay_path):
            os.unlink(overlay_path)


async def add_subtitles(
    source_url: str,
    subtitles: list[dict],
) -> str:
    """비디오에 여러 자막을 한번에 추가하여 S3에 업로드하고 CDN URL을 반환한다.

    subtitles: [{"text": str, "start_time": float, "end_time": float,
                 "position": str, "font_size": int, "color": str}, ...]
    """
    input_path = None
    output_path = None
    try:
        input_path = await _download_to_temp(source_url)
        output_path = os.path.join(
            tempfile.gettempdir(), f"subs_{uuid.uuid4().hex}.mp4"
        )

        fontfile = _find_font()

        # 여러 drawtext 필터를 콤마로 체인
        filters = []
        for sub in subtitles:
            text = sub["text"].replace("'", "\\'").replace(":", "\\:")
            position = sub.get("position", "bottom")
            font_size = sub.get("font_size", 36)
            color = sub.get("color", "white")
            start_time = sub.get("start_time")
            end_time = sub.get("end_time")

            x = "(w-text_w)/2"
            if position == "top":
                y = "h*0.08"
            elif position == "center":
                y = "(h-text_h)/2"
            else:
                y = "h*0.85"

            border_w = sub.get("border_w", 2)
            border_color = sub.get("border_color", "black@0.6")
            box_color = sub.get("box_color")  # None이면 배경 없음

            dt = f"drawtext=text='{text}'"
            if fontfile:
                dt += f":fontfile='{fontfile}'"
            dt += (
                f":x={x}:y={y}"
                f":fontsize={font_size}"
                f":fontcolor={color}"
                f":borderw={border_w}:bordercolor={border_color}"
            )
            if box_color:
                dt += f":box=1:boxcolor={box_color}:boxborderw=8"
            if start_time is not None and end_time is not None:
                dt += f":enable='between(t,{start_time},{end_time})'"
            filters.append(dt)

        vf = ",".join(filters)

        import subprocess
        cmd = [
            "ffmpeg", "-y", "-i", input_path,
            "-vf", vf,
            "-c:v", "libx264", "-preset", "fast", "-crf", "23", "-pix_fmt", "yuv420p",
            "-c:a", "copy",
            "-movflags", "+faststart",
            output_path,
        ]
        result = subprocess.run(cmd, capture_output=True)
        if result.returncode != 0:
            logger.error("ffmpeg subtitles stderr: %s", result.stderr.decode())
            raise RuntimeError(f"ffmpeg 자막 적용 실패: {result.stderr.decode()[:500]}")

        with open(output_path, "rb") as f:
            video_data = f.read()

        edit_id = uuid.uuid4().hex
        cdn_url = await upload_generation_video(f"subs_{edit_id}", video_data, "mp4")
        if not cdn_url:
            raise RuntimeError("S3 업로드 실패")
        return cdn_url
    finally:
        if input_path and os.path.exists(input_path):
            os.unlink(input_path)
        if output_path and os.path.exists(output_path):
            os.unlink(output_path)


async def video_to_gif(
    source_url: str,
    start_time: Optional[float] = None,
    end_time: Optional[float] = None,
    width: int = 480,
    fps: int = 15,
) -> str:
    """비디오(구간)를 GIF로 변환하여 S3에 업로드한다."""
    import subprocess

    input_path: Optional[str] = None
    output_path: Optional[str] = None
    palette_path: Optional[str] = None
    try:
        input_path = await _download_to_temp(source_url)
        output_path = os.path.join(
            tempfile.gettempdir(), f"gif_{uuid.uuid4().hex}.gif"
        )
        palette_path = os.path.join(
            tempfile.gettempdir(), f"palette_{uuid.uuid4().hex}.png"
        )

        # 입력 옵션
        input_args = []
        if start_time is not None:
            input_args += ["-ss", str(start_time)]
        if end_time is not None:
            input_args += ["-to", str(end_time)]

        vf_scale = f"fps={fps},scale={width}:-1:flags=lanczos"

        # Pass 1: 팔레트 생성
        cmd1 = [
            "ffmpeg", "-y", *input_args, "-i", input_path,
            "-vf", f"{vf_scale},palettegen=stats_mode=diff",
            "-vframes", "1", palette_path,
        ]
        r1 = subprocess.run(cmd1, capture_output=True)
        if r1.returncode != 0:
            logger.error("GIF palette 생성 실패: %s", r1.stderr.decode(errors="replace"))
            raise RuntimeError("GIF palette generation failed")

        # Pass 2: GIF 생성
        cmd2 = [
            "ffmpeg", "-y", *input_args, "-i", input_path,
            "-i", palette_path,
            "-lavfi", f"{vf_scale} [x]; [x][1:v] paletteuse=dither=bayer:bayer_scale=5",
            output_path,
        ]
        r2 = subprocess.run(cmd2, capture_output=True)
        if r2.returncode != 0:
            logger.error("GIF 생성 실패: %s", r2.stderr.decode(errors="replace"))
            raise RuntimeError("GIF creation failed")

        with open(output_path, "rb") as f:
            gif_data = f.read()

        edit_id = uuid.uuid4().hex
        cdn_url = await upload_generation_image(f"gif_{edit_id}", gif_data, "gif")
        return cdn_url
    except Exception:
        logger.exception("GIF 변환 실패: %s", source_url)
        raise
    finally:
        for p in [input_path, output_path, palette_path]:
            if p and os.path.exists(p):
                os.unlink(p)


ROTATE_FILTER_MAP = {
    "90": "transpose=1",
    "180": "transpose=1,transpose=1",
    "270": "transpose=2",
    "flip_h": "hflip",
    "flip_v": "vflip",
}


async def rotate_video(
    source_url: str,
    transform: str,
) -> str:
    """비디오를 회전/뒤집기한다. transform: '90','180','270','flip_h','flip_v'"""
    input_path: Optional[str] = None
    output_path: Optional[str] = None
    try:
        if transform not in ROTATE_FILTER_MAP:
            raise ValueError(f"지원하지 않는 변환: {transform}")

        vf = ROTATE_FILTER_MAP[transform]
        input_path = await _download_to_temp(source_url)
        output_path = os.path.join(
            tempfile.gettempdir(), f"rotate_{uuid.uuid4().hex}.mp4"
        )

        (
            ffmpeg
            .input(input_path)
            .output(
                output_path,
                vf=vf,
                **{"c:v": "libx264", "preset": "fast", "crf": "23", "pix_fmt": "yuv420p", "c:a": "copy"},
                movflags="+faststart",
            )
            .overwrite_output()
            .run(quiet=True)
        )

        with open(output_path, "rb") as f:
            video_data = f.read()

        edit_id = uuid.uuid4().hex
        cdn_url = await upload_generation_video(f"edit_{edit_id}", video_data, "mp4")
        if not cdn_url:
            raise RuntimeError("S3 업로드 실패")
        return cdn_url
    except Exception:
        logger.exception("회전/뒤집기 실패: %s → %s", source_url, transform)
        raise
    finally:
        if input_path and os.path.exists(input_path):
            os.unlink(input_path)
        if output_path and os.path.exists(output_path):
            os.unlink(output_path)


async def change_fps(source_url: str, fps: int) -> str:
    """비디오 FPS를 변환한다."""
    input_path: Optional[str] = None
    output_path: Optional[str] = None
    try:
        input_path = await _download_to_temp(source_url)
        output_path = os.path.join(
            tempfile.gettempdir(), f"fps_{uuid.uuid4().hex}.mp4"
        )

        (
            ffmpeg
            .input(input_path)
            .output(
                output_path,
                r=fps,
                **{"c:v": "libx264", "preset": "fast", "crf": "23", "pix_fmt": "yuv420p", "c:a": "copy"},
                movflags="+faststart",
            )
            .overwrite_output()
            .run(quiet=True)
        )

        with open(output_path, "rb") as f:
            video_data = f.read()

        edit_id = uuid.uuid4().hex
        cdn_url = await upload_generation_video(f"edit_{edit_id}", video_data, "mp4")
        if not cdn_url:
            raise RuntimeError("S3 업로드 실패")
        return cdn_url
    except Exception:
        logger.exception("FPS 변환 실패: %s → %dfps", source_url, fps)
        raise
    finally:
        if input_path and os.path.exists(input_path):
            os.unlink(input_path)
        if output_path and os.path.exists(output_path):
            os.unlink(output_path)


async def crop_video(
    source_url: str,
    x: int,
    y: int,
    width: int,
    height: int,
) -> str:
    """비디오의 특정 영역을 크롭한다. (x, y)부터 width x height 만큼."""
    input_path: Optional[str] = None
    output_path: Optional[str] = None
    try:
        input_path = await _download_to_temp(source_url)
        output_path = os.path.join(
            tempfile.gettempdir(), f"crop_{uuid.uuid4().hex}.mp4"
        )

        (
            ffmpeg
            .input(input_path)
            .output(
                output_path,
                vf=f"crop={width}:{height}:{x}:{y}",
                **{"c:v": "libx264", "preset": "fast", "crf": "23", "pix_fmt": "yuv420p", "c:a": "copy"},
                movflags="+faststart",
            )
            .overwrite_output()
            .run(quiet=True)
        )

        with open(output_path, "rb") as f:
            video_data = f.read()

        edit_id = uuid.uuid4().hex
        cdn_url = await upload_generation_video(f"edit_{edit_id}", video_data, "mp4")
        if not cdn_url:
            raise RuntimeError("S3 업로드 실패")
        return cdn_url
    except Exception:
        logger.exception("크롭 실패: %s", source_url)
        raise
    finally:
        if input_path and os.path.exists(input_path):
            os.unlink(input_path)
        if output_path and os.path.exists(output_path):
            os.unlink(output_path)


ASPECT_RATIO_MAP = {
    "16:9": (16, 9),
    "9:16": (9, 16),
    "4:3": (4, 3),
    "3:4": (3, 4),
    "1:1": (1, 1),
    "21:9": (21, 9),
}


async def add_letterbox(
    source_url: str,
    target_ratio: str,
    color: str = "black",
) -> str:
    """비디오에 레터박스(패딩)를 추가하여 목표 비율로 변환한다."""
    input_path: Optional[str] = None
    output_path: Optional[str] = None
    try:
        if target_ratio not in ASPECT_RATIO_MAP:
            raise ValueError(f"지원하지 않는 비율: {target_ratio}")

        rw, rh = ASPECT_RATIO_MAP[target_ratio]
        input_path = await _download_to_temp(source_url)
        output_path = os.path.join(
            tempfile.gettempdir(), f"pad_{uuid.uuid4().hex}.mp4"
        )

        # pad 필터: 목표 비율에 맞게 패딩 추가
        # iw, ih = 원본 크기. 목표 비율 rw:rh에 맞추려면:
        # max(iw, ih*rw/rh) x max(ih, iw*rh/rw)
        pad_filter = (
            f"pad="
            f"max(iw\\,ih*{rw}/{rh}):max(ih\\,iw*{rh}/{rw})"
            f":(ow-iw)/2:(oh-ih)/2"
            f":color={color}"
        )

        (
            ffmpeg
            .input(input_path)
            .output(
                output_path,
                vf=pad_filter,
                **{"c:v": "libx264", "preset": "fast", "crf": "23", "pix_fmt": "yuv420p", "c:a": "copy"},
                movflags="+faststart",
            )
            .overwrite_output()
            .run(quiet=True)
        )

        with open(output_path, "rb") as f:
            video_data = f.read()

        edit_id = uuid.uuid4().hex
        cdn_url = await upload_generation_video(f"edit_{edit_id}", video_data, "mp4")
        if not cdn_url:
            raise RuntimeError("S3 업로드 실패")
        return cdn_url
    except Exception:
        logger.exception("레터박스 실패: %s → %s", source_url, target_ratio)
        raise
    finally:
        if input_path and os.path.exists(input_path):
            os.unlink(input_path)
        if output_path and os.path.exists(output_path):
            os.unlink(output_path)


RESOLUTION_MAP = {
    "480p": (854, 480),
    "720p": (1280, 720),
    "1080p": (1920, 1080),
    "1440p": (2560, 1440),
    "4k": (3840, 2160),
}


async def change_resolution(
    source_url: str,
    resolution: str,
) -> str:
    """비디오 해상도를 변환한다. resolution: '480p','720p','1080p','1440p','4k'"""
    input_path: Optional[str] = None
    output_path: Optional[str] = None
    try:
        if resolution not in RESOLUTION_MAP:
            raise ValueError(f"지원하지 않는 해상도: {resolution}")

        target_w, target_h = RESOLUTION_MAP[resolution]
        input_path = await _download_to_temp(source_url)
        output_path = os.path.join(
            tempfile.gettempdir(), f"res_{uuid.uuid4().hex}.mp4"
        )

        # scale 필터: 가로 기준 리사이즈, 세로는 비율 유지, 짝수 보장
        (
            ffmpeg
            .input(input_path)
            .output(
                output_path,
                vf=f"scale={target_w}:-2",
                **{"c:v": "libx264", "preset": "fast", "crf": "23", "pix_fmt": "yuv420p", "c:a": "copy"},
                movflags="+faststart",
            )
            .overwrite_output()
            .run(quiet=True)
        )

        with open(output_path, "rb") as f:
            video_data = f.read()

        edit_id = uuid.uuid4().hex
        cdn_url = await upload_generation_video(f"edit_{edit_id}", video_data, "mp4")
        if not cdn_url:
            raise RuntimeError("S3 업로드 실패")
        return cdn_url
    except Exception:
        logger.exception("해상도 변환 실패: %s → %s", source_url, resolution)
        raise
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


# ──────────────────────────────────────
# 오디오 처리
# ──────────────────────────────────────


async def extract_audio(source_url: str) -> str:
    """비디오에서 오디오를 추출하여 S3에 mp3로 업로드하고 CDN URL을 반환한다."""
    input_path = None
    output_path = None
    try:
        input_path = await _download_to_temp(source_url)
        output_path = os.path.join(tempfile.gettempdir(), f"audio_{uuid.uuid4().hex}.mp3")

        import subprocess
        cmd = ["ffmpeg", "-y", "-i", input_path, "-vn", "-acodec", "libmp3lame", "-q:a", "2", output_path]
        result = subprocess.run(cmd, capture_output=True)
        if result.returncode != 0:
            logger.error("ffmpeg extract audio stderr: %s", result.stderr.decode())
            raise RuntimeError(f"오디오 추출 실패: {result.stderr.decode()[:500]}")

        with open(output_path, "rb") as f:
            audio_data = f.read()

        edit_id = uuid.uuid4().hex
        cdn_url = await upload_generation_video(f"audio_{edit_id}", audio_data, "mp3")
        if not cdn_url:
            raise RuntimeError("S3 업로드 실패")
        return cdn_url
    finally:
        if input_path and os.path.exists(input_path):
            os.unlink(input_path)
        if output_path and os.path.exists(output_path):
            os.unlink(output_path)


async def remove_audio(source_url: str) -> str:
    """비디오에서 오디오를 제거(음소거)하여 S3에 업로드하고 CDN URL을 반환한다."""
    input_path = None
    output_path = None
    try:
        input_path = await _download_to_temp(source_url)
        output_path = os.path.join(tempfile.gettempdir(), f"mute_{uuid.uuid4().hex}.mp4")

        import subprocess
        cmd = ["ffmpeg", "-y", "-i", input_path, "-an", "-c:v", "copy", "-movflags", "+faststart", output_path]
        result = subprocess.run(cmd, capture_output=True)
        if result.returncode != 0:
            raise RuntimeError(f"음소거 실패: {result.stderr.decode()[:500]}")

        with open(output_path, "rb") as f:
            video_data = f.read()

        edit_id = uuid.uuid4().hex
        cdn_url = await upload_generation_video(f"mute_{edit_id}", video_data, "mp4")
        if not cdn_url:
            raise RuntimeError("S3 업로드 실패")
        return cdn_url
    finally:
        if input_path and os.path.exists(input_path):
            os.unlink(input_path)
        if output_path and os.path.exists(output_path):
            os.unlink(output_path)


async def replace_audio(source_url: str, audio_url: str) -> str:
    """비디오의 오디오를 다른 오디오로 교체하여 S3에 업로드하고 CDN URL을 반환한다."""
    input_path = None
    audio_path = None
    output_path = None
    try:
        input_path = await _download_to_temp(source_url)
        audio_path = await _download_to_temp(audio_url)
        output_path = os.path.join(tempfile.gettempdir(), f"replace_{uuid.uuid4().hex}.mp4")

        import subprocess
        cmd = [
            "ffmpeg", "-y",
            "-i", input_path,
            "-i", audio_path,
            "-c:v", "copy", "-map", "0:v:0", "-map", "1:a:0",
            "-shortest",
            "-movflags", "+faststart",
            output_path,
        ]
        result = subprocess.run(cmd, capture_output=True)
        if result.returncode != 0:
            raise RuntimeError(f"오디오 교체 실패: {result.stderr.decode()[:500]}")

        with open(output_path, "rb") as f:
            video_data = f.read()

        edit_id = uuid.uuid4().hex
        cdn_url = await upload_generation_video(f"replace_{edit_id}", video_data, "mp4")
        if not cdn_url:
            raise RuntimeError("S3 업로드 실패")
        return cdn_url
    finally:
        for p in [input_path, audio_path, output_path]:
            if p and os.path.exists(p):
                os.unlink(p)


async def adjust_volume(source_url: str, volume: float) -> str:
    """비디오의 오디오 볼륨을 조절하여 S3에 업로드하고 CDN URL을 반환한다. volume=1.0이 원본."""
    input_path = None
    output_path = None
    try:
        input_path = await _download_to_temp(source_url)
        output_path = os.path.join(tempfile.gettempdir(), f"vol_{uuid.uuid4().hex}.mp4")

        import subprocess
        cmd = [
            "ffmpeg", "-y", "-i", input_path,
            "-af", f"volume={volume}",
            "-c:v", "copy",
            "-movflags", "+faststart",
            output_path,
        ]
        result = subprocess.run(cmd, capture_output=True)
        if result.returncode != 0:
            raise RuntimeError(f"볼륨 조절 실패: {result.stderr.decode()[:500]}")

        with open(output_path, "rb") as f:
            video_data = f.read()

        edit_id = uuid.uuid4().hex
        cdn_url = await upload_generation_video(f"vol_{edit_id}", video_data, "mp4")
        if not cdn_url:
            raise RuntimeError("S3 업로드 실패")
        return cdn_url
    finally:
        if input_path and os.path.exists(input_path):
            os.unlink(input_path)
        if output_path and os.path.exists(output_path):
            os.unlink(output_path)


async def mix_audio(source_url: str, audio_url: str, original_volume: float = 1.0, mix_volume: float = 0.5) -> str:
    """비디오 원본 오디오에 새 오디오를 믹싱(BGM 추가)하여 S3에 업로드하고 CDN URL을 반환한다."""
    input_path = None
    audio_path = None
    output_path = None
    try:
        input_path = await _download_to_temp(source_url)
        audio_path = await _download_to_temp(audio_url)
        output_path = os.path.join(tempfile.gettempdir(), f"mix_{uuid.uuid4().hex}.mp4")

        import subprocess
        af = (
            f"[0:a]volume={original_volume}[a0];"
            f"[1:a]volume={mix_volume}[a1];"
            f"[a0][a1]amix=inputs=2:duration=first:dropout_transition=2[aout]"
        )
        cmd = [
            "ffmpeg", "-y",
            "-i", input_path,
            "-i", audio_path,
            "-filter_complex", af,
            "-map", "0:v:0", "-map", "[aout]",
            "-c:v", "copy",
            "-shortest",
            "-movflags", "+faststart",
            output_path,
        ]
        result = subprocess.run(cmd, capture_output=True)
        if result.returncode != 0:
            logger.error("ffmpeg mix audio stderr: %s", result.stderr.decode())
            raise RuntimeError(f"오디오 믹싱 실패: {result.stderr.decode()[:500]}")

        with open(output_path, "rb") as f:
            video_data = f.read()

        edit_id = uuid.uuid4().hex
        cdn_url = await upload_generation_video(f"mix_{edit_id}", video_data, "mp4")
        if not cdn_url:
            raise RuntimeError("S3 업로드 실패")
        return cdn_url
    finally:
        for p in [input_path, audio_path, output_path]:
            if p and os.path.exists(p):
                os.unlink(p)


async def detect_scenes(
    source_url: str,
    threshold: float = 0.3,
    min_scene_duration: float = 1.0,
) -> list:
    """ffmpeg scene 필터로 장면 전환 타임스탬프를 감지한다.

    Returns: [{"start": float, "end": float, "duration": float, "index": int}, ...]
    """
    import re
    import subprocess

    input_path: Optional[str] = None
    try:
        input_path = await _download_to_temp(source_url)

        # 전체 길이 조회
        probe = ffmpeg.probe(input_path)
        duration = float(probe["format"].get("duration", 0))

        # ffmpeg scene 필터로 장면 변화 감지
        cmd = [
            "ffmpeg", "-i", input_path,
            "-vf", f"select='gt(scene,{threshold})',showinfo",
            "-an", "-f", "null", "-"
        ]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)

        # stderr에서 pts_time 추출
        timestamps = [0.0]
        for line in result.stderr.split("\n"):
            match = re.search(r"pts_time:(\d+\.?\d*)", line)
            if match:
                ts = float(match.group(1))
                if ts - timestamps[-1] >= min_scene_duration:
                    timestamps.append(ts)

        # 타임스탬프를 장면 구간으로 변환
        scenes = []
        for i, start in enumerate(timestamps):
            end = timestamps[i + 1] if i + 1 < len(timestamps) else duration
            if end - start >= min_scene_duration:
                scenes.append({
                    "index": i,
                    "start": round(start, 2),
                    "end": round(end, 2),
                    "duration": round(end - start, 2),
                })

        return scenes
    except subprocess.TimeoutExpired:
        raise RuntimeError("장면 감지 타임아웃 (120초)")
    except Exception:
        logger.exception("장면 감지 실패: %s", source_url)
        raise
    finally:
        if input_path and os.path.exists(input_path):
            os.unlink(input_path)


async def split_scene(
    source_url: str,
    start_time: float,
    end_time: float,
) -> str:
    """비디오에서 특정 장면 구간을 추출하여 S3에 업로드한다."""
    import subprocess

    input_path: Optional[str] = None
    output_path: Optional[str] = None
    try:
        input_path = await _download_to_temp(source_url)
        output_path = os.path.join(
            tempfile.gettempdir(), f"scene_{uuid.uuid4().hex}.mp4"
        )

        cmd = [
            "ffmpeg", "-y",
            "-ss", str(start_time),
            "-i", input_path,
            "-to", str(end_time - start_time),
            "-c:v", "libx264", "-preset", "fast", "-crf", "23", "-pix_fmt", "yuv420p",
            "-c:a", "copy",
            "-movflags", "+faststart",
            output_path,
        ]
        result = subprocess.run(cmd, capture_output=True, timeout=120)
        if result.returncode != 0:
            logger.error("ffmpeg scene split stderr: %s", result.stderr.decode()[:500])
            raise RuntimeError("장면 분할 실패")

        with open(output_path, "rb") as f:
            video_data = f.read()

        edit_id = uuid.uuid4().hex
        cdn_url = await upload_generation_video(f"scene_{edit_id}", video_data, "mp4")
        if not cdn_url:
            raise RuntimeError("S3 업로드 실패")
        return cdn_url
    finally:
        if input_path and os.path.exists(input_path):
            os.unlink(input_path)
        if output_path and os.path.exists(output_path):
            os.unlink(output_path)
