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
        # ── 빈티지/레트로 필터 ──
        elif filter_name == "vhs":
            # VHS 효과: 색 번짐 + 노이즈 + 스캔라인 + 채도 낮춤
            vf = (
                "noise=c0s=15:c0f=t+u,"
                "eq=saturation=0.7:contrast=1.2:brightness=0.05,"
                "colorbalance=rs=0.1:gs=-0.05:bs=-0.1:rm=0.1:gm=-0.05:bm=-0.1,"
                "unsharp=3:3:-1.5:3:3:-1.5,"
                "vignette=PI/4"
            )
        elif filter_name == "8mm":
            # 8mm 필름: 따뜻한 색감 + 비네팅 + 그레인 + 약간 과노출
            vf = (
                "noise=c0s=20:c0f=t,"
                "eq=saturation=0.8:contrast=1.3:brightness=0.08,"
                "colorbalance=rs=0.15:gs=0.05:bs=-0.1:rh=0.1:gh=0.02:bh=-0.08,"
                "vignette=PI/3.5"
            )
        elif filter_name == "bw_film":
            # 흑백 필름: grayscale + 높은 콘트라스트 + 그레인
            vf = (
                "colorchannelmixer=.3:.4:.3:0:.3:.4:.3:0:.3:.4:.3,"
                "eq=contrast=1.4:brightness=0.02,"
                "noise=c0s=18:c0f=t,"
                "vignette=PI/4"
            )
        elif filter_name == "retro70":
            # 70년대 레트로: 바랜 색감 + 낮은 채도 + 따뜻한 톤
            vf = (
                "eq=saturation=0.6:contrast=1.1:brightness=0.05,"
                "colorbalance=rs=0.12:gs=0.06:bs=-0.06:rm=0.08:gm=0.03:bm=-0.04,"
                "vignette=PI/5"
            )
        elif filter_name == "instagram":
            # 인스타 필터: 높은 대비 + 따뜻한 하이라이트 + 채도 업
            vf = (
                "eq=saturation=1.3:contrast=1.25:brightness=0.03,"
                "colorbalance=rh=0.08:gh=0.02:bh=-0.05:rs=0.05:gs=0.0:bs=-0.03,"
                "unsharp=5:5:1.0:5:5:0.0"
            )
        elif filter_name == "cool":
            # 쿨톤: 파란/청록 강조 + 채도 약간 낮춤
            vf = (
                "eq=saturation=0.85:contrast=1.1,"
                "colorbalance=rs=-0.1:gs=0.0:bs=0.12:rm=-0.08:gm=0.02:bm=0.1:rh=-0.06:gh=0.02:bh=0.08"
            )
        elif filter_name == "warm":
            # 웜톤: 오렌지/노란 강조
            vf = (
                "eq=saturation=1.1:contrast=1.05:brightness=0.03,"
                "colorbalance=rs=0.12:gs=0.04:bs=-0.08:rm=0.08:gm=0.02:bm=-0.06:rh=0.06:gh=0.02:bh=-0.04"
            )
        elif filter_name == "cinematic":
            # 시네마틱: 틸 & 오렌지 + 레터박스 느낌 비네팅
            vf = (
                "eq=saturation=0.9:contrast=1.2:brightness=-0.02,"
                "colorbalance=rs=0.08:gs=-0.02:bs=-0.08:rm=-0.04:gm=0.0:bm=0.06:rh=0.06:gh=-0.02:bh=-0.06,"
                "vignette=PI/3"
            )
        elif filter_name == "faded":
            # 페이디드: 검은색이 회색으로 바래진 효과
            vf = (
                "curves=m='0/0.15 0.5/0.5 1/0.9',"
                "eq=saturation=0.7:contrast=0.9"
            )
        elif filter_name == "noir":
            # 느와르: 고대비 흑백 + 강한 비네팅
            vf = (
                "colorchannelmixer=.3:.4:.3:0:.3:.4:.3:0:.3:.4:.3,"
                "eq=contrast=1.6:brightness=-0.03,"
                "vignette=PI/2.5"
            )
        elif filter_name == "oversaturated":
            # 과채도: 비비드한 색감
            vf = (
                "eq=saturation=1.8:contrast=1.15,"
                "unsharp=5:5:0.8:5:5:0.0"
            )
        elif filter_name == "bleach":
            # 블리치 바이패스: 은잔류 효과 (탈색 느낌)
            vf = (
                "eq=saturation=0.4:contrast=1.5:brightness=-0.02,"
                "colorbalance=rs=0.04:gs=0.02:bs=-0.02"
            )
        # ── 재미 필터 ──
        elif filter_name == "glitch":
            # 글리치: 색수차(RGB 분리) + 노이즈 + 깜빡임
            vf = (
                "split=3[r][g][b];"
                "[r]lutrgb=g=0:b=0,crop=iw:ih:0:0[r1];"
                "[g]lutrgb=r=0:b=0,crop=iw:ih:0:0[g1];"
                "[b]lutrgb=r=0:g=0,crop=iw:ih:0:0[b1];"
                "[r1][g1]blend=all_mode=addition[rg];"
                "[rg][b1]blend=all_mode=addition,"
                "noise=c0s=30:c0f=t+u,"
                "eq=contrast=1.3:saturation=1.2"
            )
        elif filter_name == "mirror":
            # 미러: 좌우 반전 합성
            vf = "split[a][b];[b]hflip[b1];[a][b1]hstack"
        elif filter_name == "kaleidoscope":
            # 만화경: 4분할 미러
            vf = (
                "split[a][b];"
                "[a]crop=iw/2:ih/2:0:0,split[tl1][tl2];"
                "[tl2]hflip[tr];"
                "[tl1][tr]hstack[top];"
                "[b]crop=iw/2:ih/2:0:0,split[bl1][bl2];"
                "[bl2]hflip[br];"
                "[bl1][br]hstack[bot];"
                "[top][bot]vstack"
            )
        elif filter_name == "cartoon":
            # 애니메이션/만화: 엣지 감지 + 색상 단순화
            vf = (
                "edgedetect=low=0.1:high=0.3:mode=colormix,"
                "eq=saturation=1.5:contrast=1.3"
            )
        elif filter_name == "emboss":
            # 엠보스: 양각 효과
            vf = "convolution='0 -1 0 -1 4 -1 0 -1 0:0 -1 0 -1 4 -1 0 -1 0:0 -1 0 -1 4 -1 0 -1 0:0 -1 0 -1 4 -1 0 -1 0'"
        elif filter_name == "edge_glow":
            # 엣지 글로우: 네온 엣지
            vf = (
                "edgedetect=low=0.08:high=0.2:mode=colormix,"
                "eq=saturation=2.0:brightness=0.1:contrast=1.5,"
                "colorbalance=rs=0.1:bs=0.15"
            )
        elif filter_name == "pixelize":
            # 픽셀화: 모자이크 느낌
            scale = params.get("scale", 10)
            vf = f"scale=iw/{scale}:ih/{scale}:flags=neighbor,scale=iw*{scale}:ih*{scale}:flags=neighbor"
        elif filter_name == "thermal":
            # 열화상 카메라
            vf = (
                "colorchannelmixer=rr=0:rg=0:rb=1:gr=1:gg=0:gb=0:br=0:bg=1:bb=0,"
                "eq=saturation=1.5:contrast=1.3,"
                "colorbalance=rs=0.2:gs=-0.1:bs=-0.2"
            )
        elif filter_name == "negative":
            # 네거티브/반전
            vf = "negate"
        elif filter_name == "posterize":
            # 포스터라이즈: 색상 단계 축소
            vf = "pp=al,eq=saturation=1.3:contrast=1.2"
        elif filter_name == "sharpen":
            # 선명하게
            vf = "unsharp=5:5:1.5:5:5:1.0"
        elif filter_name == "blur":
            # 블러
            strength = params.get("strength", 5)
            vf = f"boxblur={strength}:{strength}"
        elif filter_name == "boomerang":
            # 부메랑: 정방향 + 역방향 반복
            vf = "split[a][b];[b]reverse[r];[a][r]concat=n=2:v=1:a=0"
        elif filter_name == "timelapse":
            # 타임랩스: 8배속
            speed = params.get("speed", 8)
            vf = f"setpts=PTS/{speed}"
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


# ──────────────────────────────────────
# 크리에이티브 프리셋
# ──────────────────────────────────────

def _build_creative_vf(
    preset: str,
    params: Optional[dict] = None,
    font_path: Optional[str] = None,
) -> str:
    """프리셋에 따라 ffmpeg -vf 문자열을 반환한다."""
    params = params or {}
    fp = font_path or _find_font()
    fp_esc = fp.replace(":", r"\:")
    custom_text = params.get("custom_text", "").replace(":", r"\:").replace("'", r"'\''")
    date_text = params.get("date_text", "2025.03.28")
    cam_name = params.get("cam_name", "CAM-01")
    tc = params.get("text_color", "white")
    # hex 색상을 ffmpeg 형식으로 변환 (#ffffff → 0xffffff)
    if tc.startswith("#"):
        tc = "0x" + tc[1:]

    if preset == "camcorder":
        return (
            f"noise=c0s=12:c0f=t+u,"
            f"vignette=PI/4,"
            f"eq=saturation=0.85:contrast=1.1,"
            f"drawtext=fontfile='{fp_esc}':text='● REC':fontcolor=red:fontsize=28:x=30:y=25"
            f":enable='lt(mod(t\\,2)\\,1.5)',"
            f"drawtext=fontfile='{fp_esc}':text='%{{pts\\:hms}}':fontcolor={tc}:fontsize=24"
            f":x=w-text_w-30:y=25:borderw=1:bordercolor=black@0.5,"
            f"drawtext=fontfile='{fp_esc}':text='{date_text}':fontcolor={tc}@0.8:fontsize=20"
            f":x=30:y=h-50:borderw=1:bordercolor=black@0.5,"
            f"drawtext=fontfile='{fp_esc}':text='{cam_name}':fontcolor={tc}@0.8:fontsize=20"
            f":x=w-text_w-30:y=h-50:borderw=1:bordercolor=black@0.5"
        )
    elif preset == "cctv":
        # 흑백 + 날짜시간 + 카메라번호 + 저화질 느낌
        return (
            f"colorchannelmixer=.3:.4:.3:0:.3:.4:.3:0:.3:.4:.3,"
            f"eq=contrast=1.3:brightness=-0.03,"
            f"noise=c0s=25:c0f=t,"
            f"drawtext=fontfile='{fp_esc}':text='{date_text}  %{{pts\\:hms}}':fontcolor={tc}"
            f":fontsize=22:x=20:y=20:borderw=1:bordercolor=black@0.6,"
            f"drawtext=fontfile='{fp_esc}':text='{cam_name}':fontcolor={tc}"
            f":fontsize=22:x=w-text_w-20:y=20:borderw=1:bordercolor=black@0.6"
        )
    elif preset == "breaking_news":
        # 하단 빨간 띠 + BREAKING NEWS + 사용자 텍스트
        headline = custom_text or "BREAKING NEWS"
        headline_esc = headline.replace(":", r"\:").replace("'", r"'\''")
        return (
            # 우상단 LIVE 배경 박스 → LIVE 텍스트
            f"drawbox=y=12:x=iw-100:w=85:h=30:color=red@0.9:t=fill,"
            f"drawtext=fontfile='{fp_esc}':text='LIVE':fontcolor=white:fontsize=20"
            f":x=w-92:y=16:borderw=0,"
            # 하단 빨간 띠 배경
            f"drawbox=y=ih-70:x=0:w=iw:h=70:color=0xCC0000@0.9:t=fill,"
            # 하단 BREAKING 라벨 (흰 배경)
            f"drawbox=y=ih-60:x=10:w=140:h=30:color=white@0.95:t=fill,"
            f"drawtext=fontfile='{fp_esc}':text='BREAKING':fontcolor=red"
            f":fontsize=20:x=18:y=h-56:borderw=0,"
            # 하단 헤드라인 텍스트
            f"drawtext=fontfile='{fp_esc}':text='{headline_esc}':fontcolor={tc}"
            f":fontsize=22:x=165:y=h-56:borderw=0,"
            # 하단 타임코드
            f"drawtext=fontfile='{fp_esc}':text='%{{pts\\:hms}}':fontcolor={tc}@0.7"
            f":fontsize=14:x=10:y=h-22:borderw=0"
        )
    elif preset == "old_tv":
        # 스캔라인 + 색 번짐 + 비네팅 + 노이즈 + 채도 낮춤
        return (
            f"noise=c0s=20:c0f=t+u,"
            f"eq=saturation=0.6:contrast=1.2:brightness=0.03,"
            f"vignette=PI/3,"
            f"colorbalance=rs=0.05:gs=-0.03:bs=-0.05,"
            f"unsharp=3:3:-1.5:3:3:-1.5"
        )
    elif preset == "drone_view":
        # 위치좌표 + 고도 + 배터리 + 날짜
        lat = params.get("lat", "37.5665° N")
        lng = params.get("lng", "126.9780° E")
        alt = params.get("alt", "120m")
        return (
            f"drawtext=fontfile='{fp_esc}':text='{lat}  {lng}':fontcolor={tc}"
            f":fontsize=18:x=20:y=h-70:borderw=1:bordercolor=black@0.5,"
            f"drawtext=fontfile='{fp_esc}':text='ALT {alt}':fontcolor={tc}"
            f":fontsize=18:x=20:y=h-45:borderw=1:bordercolor=black@0.5,"
            f"drawtext=fontfile='{fp_esc}':text='BAT 87%%':fontcolor=#00ff00"
            f":fontsize=16:x=w-120:y=20:borderw=1:bordercolor=black@0.5,"
            f"drawtext=fontfile='{fp_esc}':text='%{{pts\\:hms}}':fontcolor={tc}"
            f":fontsize=18:x=w-text_w-20:y=h-45:borderw=1:bordercolor=black@0.5,"
            f"drawtext=fontfile='{fp_esc}':text='{date_text}':fontcolor={tc}@0.7"
            f":fontsize=16:x=w-text_w-20:y=h-70:borderw=1:bordercolor=black@0.5"
        )
    elif preset == "countdown":
        # 3-2-1 카운트다운: 각 숫자 1초 표시 + 필름 리더 스타일
        return (
            f"noise=c0s=10:c0f=t,"
            f"eq=saturation=0.5:contrast=1.3,"
            f"vignette=PI/3,"
            f"drawtext=fontfile='{fp_esc}':text='3':fontcolor=white:fontsize=120"
            f":x=(w-text_w)/2:y=(h-text_h)/2:enable='between(t\\,0\\,1)',"
            f"drawtext=fontfile='{fp_esc}':text='2':fontcolor=white:fontsize=120"
            f":x=(w-text_w)/2:y=(h-text_h)/2:enable='between(t\\,1\\,2)',"
            f"drawtext=fontfile='{fp_esc}':text='1':fontcolor=white:fontsize=120"
            f":x=(w-text_w)/2:y=(h-text_h)/2:enable='between(t\\,2\\,3)'"
        )
    elif preset == "film_credits":
        # 엔딩 크레딧: 아래→위 스크롤 텍스트 + 페이드
        credit_text = custom_text or "Directed by\\nStudio Wit"
        credit_esc = credit_text.replace(":", r"\:").replace("'", r"'\''")
        return (
            f"fade=t=in:st=0:d=1,"
            f"drawtext=fontfile='{fp_esc}':text='{credit_esc}':fontcolor={tc}"
            f":fontsize=36:x=(w-text_w)/2:y=h-50*t:line_spacing=20"
            f":borderw=0,"
            f"fade=t=out:st=4:d=2"
        )
    elif preset == "vintage_cam":
        # 옛날 핸디캠: REC + 배터리 + 줌 표시 + 날짜 + 비네팅 + 노이즈
        return (
            f"noise=c0s=15:c0f=t+u,"
            f"eq=saturation=0.75:contrast=1.15:brightness=0.03,"
            f"vignette=PI/3.5,"
            f"colorbalance=rs=0.08:gs=0.02:bs=-0.06,"
            f"drawtext=fontfile='{fp_esc}':text='● REC':fontcolor=red:fontsize=24:x=25:y=20"
            f":enable='lt(mod(t\\,2)\\,1.5)',"
            f"drawtext=fontfile='{fp_esc}':text='%{{pts\\:hms}}':fontcolor=white:fontsize=20"
            f":x=w-text_w-25:y=20:borderw=1:bordercolor=black@0.4,"
            f"drawtext=fontfile='{fp_esc}':text='SP':fontcolor=yellow:fontsize=16"
            f":x=w-50:y=50:borderw=1:bordercolor=black@0.4,"
            f"drawtext=fontfile='{fp_esc}':text='{date_text}':fontcolor=orange@0.9:fontsize=22"
            f":x=25:y=h-45:borderw=1:bordercolor=black@0.4"
        )
    else:
        raise ValueError(f"지원하지 않는 프리셋: {preset}")


async def apply_creative_preset(
    source_url: str,
    preset: str,
    params: Optional[dict] = None,
) -> str:
    """크리에이티브 프리셋을 적용하여 S3에 업로드하고 CDN URL을 반환한다."""
    input_path: Optional[str] = None
    output_path: Optional[str] = None
    try:
        font_path = _find_font()
        vf = _build_creative_vf(preset, params, font_path)

        input_path = await _download_to_temp(source_url)
        output_path = os.path.join(
            tempfile.gettempdir(), f"preset_{uuid.uuid4().hex}.mp4"
        )

        import subprocess
        cmd = [
            "ffmpeg", "-y", "-i", input_path,
            "-vf", vf,
            "-c:v", "libx264", "-preset", "fast", "-crf", "23",
            "-pix_fmt", "yuv420p",
            "-movflags", "+faststart",
            output_path,
        ]
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0:
            logger.error("creative preset ffmpeg stderr: %s", result.stderr)
            raise RuntimeError(f"ffmpeg 오류: {result.stderr[-500:]}")

        with open(output_path, "rb") as f:
            video_data = f.read()

        edit_id = uuid.uuid4().hex
        cdn_url = await upload_generation_video(f"preset_{edit_id}", video_data, "mp4")
        if not cdn_url:
            raise RuntimeError("S3 업로드 실패")
        return cdn_url
    finally:
        if input_path and os.path.exists(input_path):
            os.unlink(input_path)
        if output_path and os.path.exists(output_path):
            os.unlink(output_path)


# ──────────────────────────────────────
# 쇼츠/릴스 자동 변환 (16:9 → 9:16)
# ──────────────────────────────────────
async def shorts_convert(
    video_url: str,
    crop_x: str = "center",
) -> str:
    """16:9 영상을 9:16으로 중앙 크롭하여 쇼츠/릴스용으로 변환한다."""
    input_path = None
    output_path = None
    try:
        input_path = await _download_to_temp(video_url)
        output_path = os.path.join(
            tempfile.gettempdir(), f"shorts_{uuid.uuid4().hex}.mp4"
        )

        # 원본 해상도 확인
        probe = ffmpeg.probe(input_path)
        v_stream = next(s for s in probe["streams"] if s["codec_type"] == "video")
        w = int(v_stream["width"])
        h = int(v_stream["height"])

        # 9:16 비율로 크롭 영역 계산
        target_w = int(h * 9 / 16)
        target_h = h
        if target_w > w:
            target_w = w
            target_h = int(w * 16 / 9)

        # crop_x 위치
        if crop_x == "left":
            x_expr = "0"
        elif crop_x == "right":
            x_expr = f"{w - target_w}"
        else:  # center
            x_expr = f"(in_w-{target_w})/2"

        y_expr = f"(in_h-{target_h})/2"

        inp = ffmpeg.input(input_path)
        video = inp.video.filter("crop", target_w, target_h, x_expr, y_expr)

        # 오디오 스트림 존재 여부 확인
        has_audio = any(s["codec_type"] == "audio" for s in probe["streams"])
        if has_audio:
            audio = inp.audio
            out = ffmpeg.output(
                video, audio, output_path,
                vcodec="libx264", acodec="aac",
                pix_fmt="yuv420p", preset="fast", crf="23",
                movflags="+faststart",
            )
        else:
            out = ffmpeg.output(
                video, output_path,
                vcodec="libx264",
                pix_fmt="yuv420p", preset="fast", crf="23",
                movflags="+faststart",
            )

        out.overwrite_output().run(quiet=True)

        with open(output_path, "rb") as f:
            video_data = f.read()

        edit_id = uuid.uuid4().hex
        cdn_url = await upload_generation_video(f"shorts_{edit_id}", video_data, "mp4")
        if not cdn_url:
            raise RuntimeError("S3 업로드 실패")
        return cdn_url
    finally:
        if input_path and os.path.exists(input_path):
            os.unlink(input_path)
        if output_path and os.path.exists(output_path):
            os.unlink(output_path)


# ──────────────────────────────────────
# 영상 콜라주 (2~4개 그리드 배치)
# ──────────────────────────────────────
async def video_collage(
    video_urls: list,
    layout: str = "2x1",
    output_width: int = 1280,
    output_height: int = 720,
) -> str:
    """여러 영상을 한 화면에 그리드로 배치한다."""
    input_paths = []
    output_path = None
    try:
        # 다운로드
        for url in video_urls:
            input_paths.append(await _download_to_temp(url))

        output_path = os.path.join(
            tempfile.gettempdir(), f"collage_{uuid.uuid4().hex}.mp4"
        )

        n = len(input_paths)
        if layout == "2x2" and n >= 4:
            cols, rows = 2, 2
        elif layout == "1x2" and n >= 2:
            cols, rows = 1, 2  # 세로 2개
        elif layout == "2x1" and n >= 2:
            cols, rows = 2, 1  # 가로 2개
        elif layout == "3x1" and n >= 3:
            cols, rows = 3, 1
        elif layout == "1x3" and n >= 3:
            cols, rows = 1, 3
        else:
            cols, rows = 2, 1

        cell_w = output_width // cols
        cell_h = output_height // rows

        inputs = []
        scaled = []
        for i in range(cols * rows):
            idx = i % len(input_paths)
            inp = ffmpeg.input(input_paths[idx])
            v = inp.video.filter("scale", cell_w, cell_h).filter("setsar", 1)
            inputs.append(inp)
            scaled.append(v)

        # xstack 필터로 그리드 배치
        # layout 문자열: "0_0|w0_0|0_h0|w0_h0" 형식
        layout_parts = []
        for r in range(rows):
            for c in range(cols):
                x = f"{c}*{cell_w}" if c > 0 else "0"
                y = f"{r}*{cell_h}" if r > 0 else "0"
                # xstack은 _로 x,y 구분
                layout_parts.append(f"{x}_{y}")

        xstack_layout = "|".join(layout_parts)

        stacked = ffmpeg.filter(
            scaled, "xstack",
            inputs=cols * rows,
            layout=xstack_layout,
        )

        out = ffmpeg.output(
            stacked, output_path,
            vcodec="libx264",
            pix_fmt="yuv420p", preset="fast", crf="23",
            movflags="+faststart",
            t=10,  # 최대 10초
        )
        out.overwrite_output().run(quiet=True)

        with open(output_path, "rb") as f:
            video_data = f.read()

        edit_id = uuid.uuid4().hex
        cdn_url = await upload_generation_video(f"collage_{edit_id}", video_data, "mp4")
        if not cdn_url:
            raise RuntimeError("S3 업로드 실패")
        return cdn_url
    finally:
        for p in input_paths:
            if p and os.path.exists(p):
                os.unlink(p)
        if output_path and os.path.exists(output_path):
            os.unlink(output_path)


# ──────────────────────────────────────
# 비포/애프터 비교 영상
# ──────────────────────────────────────
async def before_after_video(
    before_url: str,
    after_url: str,
    mode: str = "side_by_side",
    output_width: int = 1280,
    output_height: int = 720,
) -> str:
    """두 영상을 나란히 또는 슬라이더 방식으로 비교 영상을 생성한다."""
    before_path = None
    after_path = None
    output_path = None
    try:
        before_path = await _download_to_temp(before_url)
        after_path = await _download_to_temp(after_url)
        output_path = os.path.join(
            tempfile.gettempdir(), f"ba_{uuid.uuid4().hex}.mp4"
        )

        half_w = output_width // 2

        before_inp = ffmpeg.input(before_path)
        after_inp = ffmpeg.input(after_path)

        if mode == "slide":
            # 슬라이더 효과: 왼쪽 반은 before, 오른쪽 반은 after
            # 시간에 따라 경계가 왼→오로 이동
            before_scaled = before_inp.video.filter("scale", output_width, output_height).filter("setsar", 1)
            after_scaled = after_inp.video.filter("scale", output_width, output_height).filter("setsar", 1)

            # overlay로 슬라이더 효과 구현
            # after 위에 before를 crop해서 overlay
            # crop 너비가 시간에 따라 줄어듦
            before_cropped = before_scaled.filter(
                "crop",
                f"max(0,{output_width}-({output_width}*t/5))",  # 5초에 걸쳐 이동
                output_height, 0, 0,
            )

            merged = ffmpeg.overlay(after_scaled, before_cropped, x=0, y=0)

            # 구분선 추가 (흰색 세로선)
            merged = merged.filter(
                "drawbox",
                x=f"max(0,{output_width}-({output_width}*t/5))-2",
                y=0, w=4, h=output_height,
                color="white", t="fill",
            )

            out = ffmpeg.output(
                merged, output_path,
                vcodec="libx264",
                pix_fmt="yuv420p", preset="fast", crf="23",
                movflags="+faststart",
            )
        else:
            # side_by_side: 좌우 나란히
            before_scaled = before_inp.video.filter("scale", half_w, output_height).filter("setsar", 1)
            after_scaled = after_inp.video.filter("scale", half_w, output_height).filter("setsar", 1)

            merged = ffmpeg.filter(
                [before_scaled, after_scaled], "hstack",
            )

            # BEFORE / AFTER 라벨 추가
            font_path = _find_font()
            if font_path:
                merged = merged.filter(
                    "drawtext", text="BEFORE",
                    x=f"({half_w}-text_w)/2", y=30,
                    fontsize=28, fontcolor="white",
                    borderw=2, bordercolor="black@0.6",
                    fontfile=font_path,
                )
                merged = merged.filter(
                    "drawtext", text="AFTER",
                    x=f"{half_w}+({half_w}-text_w)/2", y=30,
                    fontsize=28, fontcolor="white",
                    borderw=2, bordercolor="black@0.6",
                    fontfile=font_path,
                )

            out = ffmpeg.output(
                merged, output_path,
                vcodec="libx264",
                pix_fmt="yuv420p", preset="fast", crf="23",
                movflags="+faststart",
            )

        out.overwrite_output().run(quiet=True)

        with open(output_path, "rb") as f:
            video_data = f.read()

        edit_id = uuid.uuid4().hex
        cdn_url = await upload_generation_video(f"ba_{edit_id}", video_data, "mp4")
        if not cdn_url:
            raise RuntimeError("S3 업로드 실패")
        return cdn_url
    finally:
        if before_path and os.path.exists(before_path):
            os.unlink(before_path)
        if after_path and os.path.exists(after_path):
            os.unlink(after_path)
        if output_path and os.path.exists(output_path):
            os.unlink(output_path)


# ──────────────────────────────────────
# A/B 투표 오버레이
# ──────────────────────────────────────
async def add_poll_overlay(
    video_url: str,
    questions: list,
    text_color: str = "white",
    accent_color: str = "#4A90D9",
) -> str:
    """영상에 다중 A/B 투표 오버레이를 추가한다.

    questions: [{"question": str, "option_a": str, "option_b": str, "start": float, "end": float}, ...]
    """
    input_path = None
    output_path = None
    try:
        input_path = await _download_to_temp(video_url)
        output_path = os.path.join(
            tempfile.gettempdir(), f"poll_{uuid.uuid4().hex}.mp4"
        )

        probe = ffmpeg.probe(input_path)
        v_stream = next(s for s in probe["streams"] if s["codec_type"] == "video")
        w = int(v_stream["width"])
        h = int(v_stream["height"])
        has_audio = any(s["codec_type"] == "audio" for s in probe["streams"])

        font_path = _find_font()
        font_opt = f":fontfile={font_path}" if font_path else ""

        # 절대 좌표 계산
        bg_y = int(h * 0.55)
        bg_h = h - bg_y
        q_y = int(h * 0.58)
        box_a_x = int(w * 0.08)
        box_b_x = int(w * 0.54)
        box_y = int(h * 0.70)
        box_w = int(w * 0.38)
        box_h = int(h * 0.12)
        txt_a_x = int(w * 0.12)
        txt_b_x = int(w * 0.58)
        txt_y = int(h * 0.73)
        hint_y = int(h * 0.88)

        accent_hex = accent_color.replace("#", "0x")

        # 모든 질문 세트를 filter_complex 문자열로 조합
        filters = []
        for q in questions:
            start = q.get("start", 0)
            end = q.get("end", 10)
            question_text = q["question"].replace("'", "\\'").replace(":", "\\:")
            opt_a = q["option_a"].replace("'", "\\'").replace(":", "\\:")
            opt_b = q["option_b"].replace("'", "\\'").replace(":", "\\:")
            enable = f"between(t\\,{start}\\,{end})"

            # 반투명 배경
            filters.append(
                f"drawbox=x=0:y={bg_y}:w={w}:h={bg_h}:color=black@0.6:t=fill:enable='{enable}'"
            )
            # 질문
            filters.append(
                f"drawtext=text='{question_text}':x=(w-text_w)/2:y={q_y}"
                f":fontsize=32:fontcolor={text_color}:borderw=2:bordercolor=black@0.5"
                f":enable='{enable}'{font_opt}"
            )
            # A 박스
            filters.append(
                f"drawbox=x={box_a_x}:y={box_y}:w={box_w}:h={box_h}"
                f":color={accent_hex}@0.8:t=fill:enable='{enable}'"
            )
            # A 텍스트
            filters.append(
                f"drawtext=text='A. {opt_a}':x={txt_a_x}:y={txt_y}"
                f":fontsize=26:fontcolor=white:borderw=1:bordercolor=black@0.3"
                f":enable='{enable}'{font_opt}"
            )
            # B 박스
            filters.append(
                f"drawbox=x={box_b_x}:y={box_y}:w={box_w}:h={box_h}"
                f":color=0xE74C3C@0.8:t=fill:enable='{enable}'"
            )
            # B 텍스트
            filters.append(
                f"drawtext=text='B. {opt_b}':x={txt_b_x}:y={txt_y}"
                f":fontsize=26:fontcolor=white:borderw=1:bordercolor=black@0.3"
                f":enable='{enable}'{font_opt}"
            )
            # 안내
            hint_text = "댓글로 투표하세요!".replace(":", "\\:")
            filters.append(
                f"drawtext=text='{hint_text}':x=(w-text_w)/2:y={hint_y}"
                f":fontsize=18:fontcolor=white@0.7"
                f":enable='{enable}'{font_opt}"
            )

        filter_chain = ",".join(filters)

        # subprocess로 실행 (filter_complex 문자열 사용)
        cmd = ["ffmpeg", "-y", "-i", input_path]
        if has_audio:
            cmd += ["-vf", filter_chain, "-c:a", "aac"]
        else:
            cmd += ["-vf", filter_chain]
        cmd += [
            "-c:v", "libx264", "-pix_fmt", "yuv420p",
            "-preset", "fast", "-crf", "23",
            "-movflags", "+faststart", output_path,
        ]

        import subprocess
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0:
            logger.error("poll overlay ffmpeg stderr: %s", result.stderr)
            raise RuntimeError(f"ffmpeg 오류: {result.stderr[-500:]}")

        with open(output_path, "rb") as f:
            video_data = f.read()

        edit_id = uuid.uuid4().hex
        cdn_url = await upload_generation_video(f"poll_{edit_id}", video_data, "mp4")
        if not cdn_url:
            raise RuntimeError("S3 업로드 실패")
        return cdn_url
    finally:
        if input_path and os.path.exists(input_path):
            os.unlink(input_path)
        if output_path and os.path.exists(output_path):
            os.unlink(output_path)


# ──────────────────────────────────────
# 퀴즈 오버레이 (4지선다 + 정답 공개)
# ──────────────────────────────────────
async def add_quiz_overlay(
    video_url: str,
    questions: list,
    text_color: str = "white",
) -> str:
    """영상에 다중 퀴즈 오버레이를 추가한다.

    questions: [{
        "question": str, "choices": [str], "answer_index": int,
        "start": float, "end": float, "reveal_after": float
    }, ...]
    """
    input_path = None
    output_path = None
    try:
        input_path = await _download_to_temp(video_url)
        output_path = os.path.join(
            tempfile.gettempdir(), f"quiz_{uuid.uuid4().hex}.mp4"
        )

        probe = ffmpeg.probe(input_path)
        v_stream = next(s for s in probe["streams"] if s["codec_type"] == "video")
        w = int(v_stream["width"])
        h = int(v_stream["height"])
        has_audio = any(s["codec_type"] == "audio" for s in probe["streams"])

        font_path = _find_font()
        font_opt = f":fontfile={font_path}" if font_path else ""

        labels = ["A", "B", "C", "D"]

        # 좌표 계산
        bg_y = int(h * 0.40)
        bg_h = h - bg_y
        q_y = int(h * 0.43)
        countdown_y = int(h * 0.90)
        answer_y = int(h * 0.90)
        box_w = int(w * 0.40)
        box_h = int(h * 0.12)

        filters = []

        for q in questions:
            start = q.get("start", 0)
            end = q.get("end", 10)
            reveal_after = q.get("reveal_after", 5)
            reveal_at = start + reveal_after
            question_text = q["question"].replace("'", "\\'").replace(":", "\\:")
            choices = q.get("choices", [])
            answer_index = q.get("answer_index", 0)
            num_choices = min(len(choices), 4)

            enable_all = f"between(t\\,{start}\\,{end})"
            enable_before = f"between(t\\,{start}\\,{min(reveal_at, end)})"
            enable_after = f"between(t\\,{reveal_at}\\,{end})"

            # 반투명 배경
            filters.append(
                f"drawbox=x=0:y={bg_y}:w={w}:h={bg_h}:color=black@0.6:t=fill:enable='{enable_all}'"
            )
            # 질문
            filters.append(
                f"drawtext=text='{question_text}':x=(w-text_w)/2:y={q_y}"
                f":fontsize=30:fontcolor={text_color}:borderw=2:bordercolor=black@0.5"
                f":enable='{enable_all}'{font_opt}"
            )
            # 카운트다운
            hint = f"{int(reveal_after)}초 후 정답 공개".replace(":", "\\:")
            filters.append(
                f"drawtext=text='{hint}':x=(w-text_w)/2:y={countdown_y}"
                f":fontsize=18:fontcolor=yellow@0.9"
                f":enable='{enable_before}'{font_opt}"
            )

            # 보기 (2x2 그리드)
            for i in range(num_choices):
                col = i % 2
                row = i // 2
                bx = int(w * (0.08 + col * 0.46))
                by = int(h * (0.55 + row * 0.17))
                tx = int(w * (0.12 + col * 0.46))
                ty = int(h * (0.58 + row * 0.17))
                is_answer = (i == answer_index)

                # 정답 공개 전 박스
                filters.append(
                    f"drawbox=x={bx}:y={by}:w={box_w}:h={box_h}"
                    f":color=0x555555@0.8:t=fill:enable='{enable_before}'"
                )
                # 정답 공개 후 박스
                if is_answer:
                    filters.append(
                        f"drawbox=x={bx}:y={by}:w={box_w}:h={box_h}"
                        f":color=0x27AE60@0.9:t=fill:enable='{enable_after}'"
                    )
                else:
                    filters.append(
                        f"drawbox=x={bx}:y={by}:w={box_w}:h={box_h}"
                        f":color=0x333333@0.6:t=fill:enable='{enable_after}'"
                    )

                # 보기 텍스트
                choice_text = f"{labels[i]}. {choices[i]}".replace("'", "\\'").replace(":", "\\:")
                filters.append(
                    f"drawtext=text='{choice_text}':x={tx}:y={ty}"
                    f":fontsize=22:fontcolor={text_color}:borderw=1:bordercolor=black@0.3"
                    f":enable='{enable_all}'{font_opt}"
                )

            # 정답 공개 텍스트
            ans_text = f"정답\\: {labels[answer_index]}. {choices[answer_index]}".replace("'", "\\'")
            filters.append(
                f"drawtext=text='{ans_text}':x=(w-text_w)/2:y={answer_y}"
                f":fontsize=22:fontcolor=0x2ECC71:borderw=2:bordercolor=black@0.5"
                f":enable='{enable_after}'{font_opt}"
            )

        filter_chain = ",".join(filters)

        import subprocess
        cmd = ["ffmpeg", "-y", "-i", input_path]
        if has_audio:
            cmd += ["-vf", filter_chain, "-c:a", "aac"]
        else:
            cmd += ["-vf", filter_chain]
        cmd += [
            "-c:v", "libx264", "-pix_fmt", "yuv420p",
            "-preset", "fast", "-crf", "23",
            "-movflags", "+faststart", output_path,
        ]

        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0:
            logger.error("quiz overlay ffmpeg stderr: %s", result.stderr)
            raise RuntimeError(f"ffmpeg 오류: {result.stderr[-500:]}")

        with open(output_path, "rb") as f:
            video_data = f.read()

        edit_id = uuid.uuid4().hex
        cdn_url = await upload_generation_video(f"quiz_{edit_id}", video_data, "mp4")
        if not cdn_url:
            raise RuntimeError("S3 업로드 실패")
        return cdn_url
    finally:
        if input_path and os.path.exists(input_path):
            os.unlink(input_path)
        if output_path and os.path.exists(output_path):
            os.unlink(output_path)
