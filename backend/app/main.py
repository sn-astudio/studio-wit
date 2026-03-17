"""FastAPI 앱 진입점"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import auth, gallery, generation, models
from app.config import settings
from app.core.exceptions import AppException
from app.core.middleware import app_exception_handler
from app.models.database import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 시작: DB 테이블 생성 (개발용, 프로덕션은 Alembic 사용)
    await init_db()
    yield


app = FastAPI(
    title="Studio Wit API",
    description=(
        "AI 미디어 생성 애그리게이터 API.\n\n"
        "여러 AI 이미지/비디오 생성 모델(Google Imagen, OpenAI GPT Image, fal.ai Flux 등)을 "
        "단일 API로 통합하여 프론트엔드에 제공한다."
    ),
    version="0.1.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# 커스텀 예외 핸들러
app.add_exception_handler(AppException, app_exception_handler)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 라우터 등록
app.include_router(auth.router)
app.include_router(models.router)
app.include_router(generation.router)
app.include_router(gallery.router)


@app.get("/api/health", tags=["Health"], summary="서버 상태 확인")
async def health():
    return {"status": "ok"}
