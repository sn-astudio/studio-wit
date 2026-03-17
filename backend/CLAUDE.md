# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI 미디어 생성 애그리게이터의 백엔드 서비스. 여러 AI 이미지/비디오 생성 모델(Google, OpenAI, fal.ai)을 단일 API로 통합하여 프론트엔드에 제공한다. FastAPI 기반 Python 백엔드로, JWT 인증과 비동기 생성 작업 처리를 담당한다. 생성된 이미지/비디오 결과물은 DB에 저장하지 않으며, Provider API가 반환하는 URL을 그대로 프론트엔드에 전달한다.

## Build & Dev Commands

```bash
pip install -r requirements.txt                    # 의존성 설치
uvicorn app.main:app --reload                      # 개발 서버 (localhost:8000)
uvicorn app.main:app --host 0.0.0.0 --port 8000   # 프로덕션 서버
alembic upgrade head                               # DB 마이그레이션 적용
alembic revision --autogenerate -m "description"   # 마이그레이션 생성
pytest                                             # 전체 테스트
pytest tests/test_specific.py::test_name           # 단일 테스트
```

## Architecture

### Layered Structure

```
app/
├── main.py              # FastAPI 앱 진입점, 미들웨어 등록
├── config.py            # Pydantic Settings (환경변수)
├── dependencies.py      # 공통 의존성 (DB session, auth)
├── api/                 # API 라우터 (요청/응답 처리만)
├── models/
│   ├── database.py      # SQLAlchemy ORM 모델
│   └── schemas.py       # Pydantic request/response 스키마
├── services/
│   ├── model_router.py  # 모델명 → Provider 라우팅
│   ├── providers/       # AI Provider 어댑터 (base ABC → google, openai, fal)
│   └── auth.py          # JWT 발급/검증, Google token 검증
└── core/
    ├── exceptions.py    # 커스텀 예외
    └── middleware.py     # CORS, 에러 핸들링
```

### Provider Pattern

모든 AI 모델 프로바이더는 `BaseProvider` ABC를 구현한다:
- `generate_image(prompt, parameters)` → `GenerationResult`
- `generate_video(prompt, parameters, input_image_url?)` → `GenerationResult`
- `check_status(provider_job_id)` → `GenerationResult`

`model_router.py`의 `PROVIDER_MAP`이 모델 ID를 프로바이더 인스턴스에 매핑:
- `imagen-4`, `veo-3` → `GoogleProvider`
- `gpt-image`, `sora-2` → `OpenAIProvider`
- `flux-2-pro`, `kling` → `FalProvider`

### Generation Flow

1. `POST /api/generate` → DB에 generation 레코드 생성 (status=pending) → 202 응답
2. BackgroundTask에서 Provider API 호출 → status=processing
3. 동기 모델(Imagen 4, GPT Image): 즉시 결과 수신 → Provider 반환 URL 저장 → completed
4. 비동기 모델(Veo 3, Sora 2, Flux, Kling): provider polling → 결과 수신 → Provider 반환 URL 저장 → completed
5. 프론트엔드는 `GET /api/generation/{id}`로 2초 간격 polling

생성 결과물(이미지/비디오)은 DB나 S3에 별도 저장하지 않고, Provider API가 반환하는 URL을 `result_url`에 기록하여 프론트엔드에 전달한다.

### Database

MySQL 8.0 (AWS RDS), SQLAlchemy 2.0 async + Alembic 마이그레이션.

테이블:
- `users` — Google OAuth 사용자 (google_id UNIQUE)
- `generations` — 생성 작업 (status: pending → processing → completed/failed)

### Auth Flow

프론트엔드(NextAuth.js)에서 Google OAuth → ID Token 획득 → `POST /api/auth/verify`로 전달 → 백엔드에서 Google 검증 + users upsert + JWT 발급 → 이후 모든 요청에 `Authorization: Bearer {jwt}` 포함.

### API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/verify` | No | Google ID Token → JWT 발급 |
| POST | `/api/generate` | Yes | 이미지/비디오 생성 요청 (202 반환) |
| GET | `/api/generation/{id}` | Yes | 생성 상태 polling + 결과 URL 반환 |

### Environment Variables

```
DATABASE_URL, GOOGLE_AI_API_KEY, OPENAI_API_KEY, FAL_API_KEY, JWT_SECRET
```

## Conventions

- 한국어 코멘트 사용 가능 (PRD가 한국어)
- Pydantic Settings로 환경변수 관리 (`app/config.py`)
- API 에러 응답 형식: `{"error": {"code": "ERROR_CODE", "message": "...", "details": {...}}}`
- 에러 코드: VALIDATION_ERROR(400), UNAUTHORIZED(401), MODEL_NOT_FOUND(404), PROVIDER_ERROR(502), PROVIDER_TIMEOUT(504), RATE_LIMIT(429), CONTENT_POLICY(400)
- PRD 전체 문서: `../../PRD_DEV.md`
