"""커스텀 예외 정의"""

from typing import Optional


class AppException(Exception):
    """공통 애플리케이션 예외"""

    def __init__(
        self,
        code: str,
        message: str,
        status_code: int = 400,
        details: Optional[dict] = None,
    ):
        self.code = code
        self.message = message
        self.status_code = status_code
        self.details = details


# ── 인증 ──

class UnauthorizedException(AppException):
    def __init__(self, message: str = "인증이 필요합니다."):
        super().__init__(code="UNAUTHORIZED", message=message, status_code=401)


class ForbiddenException(AppException):
    def __init__(self, message: str = "접근 권한이 없습니다."):
        super().__init__(code="FORBIDDEN", message=message, status_code=403)


# ── 리소스 ──

class NotFoundException(AppException):
    def __init__(self, message: str = "리소스를 찾을 수 없습니다."):
        super().__init__(code="NOT_FOUND", message=message, status_code=404)


class ModelNotFoundException(AppException):
    def __init__(self, model_id: str):
        super().__init__(
            code="MODEL_NOT_FOUND",
            message=f"지원하지 않는 모델입니다: {model_id}",
            status_code=404,
        )


# ── 검증 ──

class ValidationException(AppException):
    def __init__(self, message: str, details: Optional[dict] = None):
        super().__init__(
            code="VALIDATION_ERROR", message=message, status_code=400, details=details
        )


class ContentPolicyException(AppException):
    def __init__(self, message: str = "콘텐츠 정책에 위반됩니다."):
        super().__init__(code="CONTENT_POLICY", message=message, status_code=400)


# ── Provider ──

class ProviderException(AppException):
    def __init__(self, message: str = "AI 모델 처리 중 오류가 발생했습니다."):
        super().__init__(code="PROVIDER_ERROR", message=message, status_code=502)


class ProviderTimeoutException(AppException):
    def __init__(self, message: str = "AI 모델 응답 시간이 초과되었습니다."):
        super().__init__(code="PROVIDER_TIMEOUT", message=message, status_code=504)


class RateLimitException(AppException):
    def __init__(self, message: str = "요청 횟수를 초과했습니다. 잠시 후 다시 시도해주세요."):
        super().__init__(code="RATE_LIMIT", message=message, status_code=429)
