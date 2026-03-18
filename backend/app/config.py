"""환경변수 기반 설정 (Pydantic Settings)"""

from typing import List

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # 데이터베이스
    DATABASE_URL: str = "sqlite+aiosqlite:///./wit.db"

    # JWT
    JWT_SECRET: str = "dev-secret-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_HOURS: int = 24

    # Google OAuth (프론트엔드와 동일한 Client ID로 토큰 검증)
    GOOGLE_CLIENT_ID: str = ""

    # AI Provider API Keys
    GOOGLE_AI_API_KEY: str = ""
    OPENAI_API_KEY: str = ""
    FAL_API_KEY: str = ""

    # CORS
    CORS_ORIGINS: List[str] = ["http://localhost:3000"]

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
