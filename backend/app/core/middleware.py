"""미들웨어: 에러 핸들링"""

from fastapi import Request
from fastapi.responses import JSONResponse

from app.core.exceptions import AppException


async def app_exception_handler(_request: Request, exc: AppException) -> JSONResponse:
    """AppException을 공통 에러 응답 형식으로 변환"""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": exc.code,
                "message": exc.message,
                "details": exc.details,
            }
        },
    )
