"""S3 업로드 서비스 — 생성된 이미지를 S3에 저장하고 CloudFront URL 반환"""

import base64
import logging
import re

import aioboto3
import httpx

from app.config import settings

logger = logging.getLogger(__name__)

_session = aioboto3.Session(
    aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
    aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
    region_name=settings.AWS_S3_REGION,
)


async def upload_generation_image(
    generation_id: str, image_data: bytes, ext: str = "png"
) -> str:
    """이미지 바이트를 S3에 업로드하고 CloudFront URL을 반환한다."""
    key = f"generations/{generation_id}.{ext}"
    content_type = f"image/{ext}"

    async with _session.client("s3") as s3:
        await s3.put_object(
            Bucket=settings.AWS_S3_BUCKET,
            Key=key,
            Body=image_data,
            ContentType=content_type,
        )

    domain = settings.CLOUDFRONT_DOMAIN.rstrip("/")
    return f"{domain}/{key}"


async def upload_generation_video(
    generation_id: str, video_data: bytes, ext: str = "mp4"
) -> str:
    """비디오 바이트를 S3에 업로드하고 CloudFront URL을 반환한다."""
    if not settings.AWS_S3_BUCKET or not settings.CLOUDFRONT_DOMAIN:
        return ""

    try:
        key = f"generations/{generation_id}.{ext}"
        content_type = f"video/{ext}"

        async with _session.client("s3") as s3:
            await s3.put_object(
                Bucket=settings.AWS_S3_BUCKET,
                Key=key,
                Body=video_data,
                ContentType=content_type,
            )

        domain = settings.CLOUDFRONT_DOMAIN.rstrip("/")
        return f"{domain}/{key}"
    except Exception:
        logger.exception("S3 비디오 업로드 실패 (generation_id=%s)", generation_id)
        return ""


async def download_and_upload(generation_id: str, result_url: str) -> str:
    """result_url(base64 data URI 또는 HTTP URL)을 S3에 업로드하고 CloudFront URL을 반환한다.

    업로드 실패 시 원본 result_url을 그대로 반환한다(fallback).
    """
    if not settings.AWS_S3_BUCKET or not settings.CLOUDFRONT_DOMAIN:
        return result_url

    try:
        if result_url.startswith("data:"):
            # data:image/png;base64,iVBOR... 형태
            match = re.match(r"data:image/(\w+);base64,(.+)", result_url, re.DOTALL)
            if not match:
                return result_url
            ext = match.group(1)
            image_data = base64.b64decode(match.group(2))
        elif result_url.startswith("http"):
            async with httpx.AsyncClient(timeout=60) as client:
                resp = await client.get(result_url)
                resp.raise_for_status()
            image_data = resp.content
            # Content-Type에서 확장자 추출
            ct = resp.headers.get("content-type", "image/png")
            ext = ct.split("/")[-1].split(";")[0]
            if ext not in ("png", "jpeg", "jpg", "webp", "gif"):
                ext = "png"
        else:
            return result_url

        return await upload_generation_image(generation_id, image_data, ext)
    except Exception:
        logger.exception("S3 업로드 실패 (generation_id=%s), 원본 URL fallback", generation_id)
        return result_url
