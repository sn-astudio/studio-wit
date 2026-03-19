# Studio Wit API Schema

> Base URL: `/api`

---

## 공통 사항

### 인증 헤더

JWT 인증이 필요한 엔드포인트는 아래 헤더를 포함해야 한다.

```
Authorization: Bearer {jwt_token}
```

### 공통 에러 응답

모든 엔드포인트는 에러 발생 시 동일한 형식으로 응답한다.

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "사람이 읽을 수 있는 에러 메시지",
    "details": {}
  }
}
```

| 에러 코드 | HTTP Status | 설명 |
|-----------|-------------|------|
| `VALIDATION_ERROR` | 400 | 요청 파라미터 검증 실패 |
| `CONTENT_POLICY` | 400 | 콘텐츠 정책 위반 (프롬프트) |
| `UNAUTHORIZED` | 401 | 인증 실패 또는 토큰 만료 |
| `FORBIDDEN` | 403 | 권한 없음 (다른 유저의 리소스) |
| `NOT_FOUND` | 404 | 리소스 없음 |
| `MODEL_NOT_FOUND` | 404 | 지원하지 않는 모델 ID |
| `RATE_LIMIT` | 429 | 요청 횟수 초과 |
| `PROVIDER_ERROR` | 502 | AI Provider API 오류 |
| `PROVIDER_TIMEOUT` | 504 | AI Provider 응답 시간 초과 |

---

## 1. 인증 (Auth)

### 1-1. Google ID Token 검증 → JWT 발급

프론트엔드(NextAuth.js)에서 받은 Google ID Token을 백엔드에서 검증하고, 자체 JWT를 발급한다.

```
POST /api/auth/verify
```

**Headers**

| 헤더 | 값 | 필수 |
|------|---|------|
| Content-Type | application/json | ✅ |

**Request Body**

```json
{
  "id_token": "eyJhbGciOiJSUzI1NiIs..."
}
```

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `id_token` | string | ✅ | Google OAuth에서 발급받은 ID Token |

**Response `200 OK`**

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer",
  "expires_in": 86400,
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@gmail.com",
    "name": "홍길동",
    "profile_image": "https://lh3.googleusercontent.com/..."
  }
}
```

| 필드 | 타입 | 설명 |
|------|------|------|
| `access_token` | string | 백엔드 자체 JWT |
| `token_type` | string | 항상 `"bearer"` |
| `expires_in` | integer | 토큰 만료까지 남은 시간 (초) |
| `user.id` | string (UUID) | 유저 고유 ID |
| `user.email` | string | Google 이메일 |
| `user.name` | string | Google 표시 이름 |
| `user.profile_image` | string \| null | Google 프로필 이미지 URL |

**에러**

| 상황 | 코드 |
|------|------|
| id_token 누락/형식 오류 | `VALIDATION_ERROR` (400) |
| Google 검증 실패/만료 토큰 | `UNAUTHORIZED` (401) |

---

## 2. AI 모델 (Models)

### 2-1. 사용 가능한 모델 목록 조회

```
GET /api/models
```

**Headers**

| 헤더 | 값 | 필수 |
|------|---|------|
| Authorization | Bearer {jwt} | ✅ |

**Query Parameters**

| 파라미터 | 타입 | 필수 | 기본값 | 설명 |
|----------|------|------|--------|------|
| `type` | string | ❌ | — | `image` 또는 `video`로 필터링 |

**Response `200 OK`**

```json
{
  "models": [
    {
      "id": "imagen-4",
      "name": "Imagen 4",
      "provider": "google",
      "type": "image",
      "description": "Google의 최신 이미지 생성 모델",
      "supported_params": ["aspect_ratio", "negative_prompt", "style"],
      "is_async": false
    },
    {
      "id": "veo-3",
      "name": "Veo 3",
      "provider": "google",
      "type": "video",
      "description": "Google의 비디오 생성 모델",
      "supported_params": ["duration", "aspect_ratio", "input_image_url"],
      "is_async": true
    },
    {
      "id": "gpt-image",
      "name": "GPT Image",
      "provider": "openai",
      "type": "image",
      "description": "OpenAI의 이미지 생성 모델",
      "supported_params": ["aspect_ratio", "quality", "style"],
      "is_async": false
    },
    {
      "id": "sora-2",
      "name": "Sora 2",
      "provider": "openai",
      "type": "video",
      "description": "OpenAI의 비디오 생성 모델",
      "supported_params": ["duration", "aspect_ratio", "input_image_url"],
      "is_async": true
    },
    {
      "id": "flux-2-pro",
      "name": "Flux 2 Pro",
      "provider": "fal",
      "type": "image",
      "description": "fal.ai의 고품질 이미지 생성 모델",
      "supported_params": ["aspect_ratio", "guidance_scale", "num_steps"],
      "is_async": true
    },
    {
      "id": "kling",
      "name": "Kling",
      "provider": "fal",
      "type": "video",
      "description": "fal.ai의 비디오 생성 모델",
      "supported_params": ["duration", "aspect_ratio", "input_image_url"],
      "is_async": true
    }
  ]
}
```

| 필드 | 타입 | 설명 |
|------|------|------|
| `models[].id` | string | 모델 고유 ID (generate 요청 시 사용) |
| `models[].name` | string | 모델 표시 이름 |
| `models[].provider` | string | 프로바이더 (`google`, `openai`, `fal`) |
| `models[].type` | string | `image` 또는 `video` |
| `models[].description` | string | 모델 설명 |
| `models[].supported_params` | string[] | 해당 모델이 지원하는 파라미터 목록 |
| `models[].is_async` | boolean | 비동기 처리 여부 (true면 polling 필요) |

---

## 3. 생성 (Generation)

### 3-1. 이미지/비디오 생성 요청

생성 작업을 시작한다. 즉시 응답(202)을 반환하고, 실제 생성은 백그라운드에서 처리된다.

```
POST /api/generate
```

**Headers**

| 헤더 | 값 | 필수 |
|------|---|------|
| Authorization | Bearer {jwt} | ✅ |
| Content-Type | application/json | ✅ |

**Request Body**

```json
{
  "model_id": "imagen-4",
  "prompt": "A serene mountain landscape at sunset",
  "negative_prompt": "blurry, low quality",
  "params": {
    "aspect_ratio": "16:9",
    "style": "photorealistic"
  }
}
```

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `model_id` | string | ✅ | 사용할 모델 ID (`imagen-4`, `veo-3`, `gpt-image`, `sora-2`, `flux-2-pro`, `kling`) |
| `prompt` | string | ✅ | 생성 프롬프트 (최대 2000자) |
| `negative_prompt` | string | ❌ | 제외할 요소 (이미지 모델만) |
| `params` | object | ❌ | 모델별 추가 파라미터 |
| `params.aspect_ratio` | string | ❌ | 비율 (`1:1`, `16:9`, `9:16`, `4:3`, `3:4`) |
| `params.style` | string | ❌ | 스타일 프리셋 |
| `params.quality` | string | ❌ | 품질 (`standard`, `hd`) |
| `params.guidance_scale` | number | ❌ | 프롬프트 반영 강도 (1.0~20.0) |
| `params.num_steps` | integer | ❌ | 생성 스텝 수 (10~50) |
| `params.duration` | integer | ❌ | 비디오 길이 초 (2~16) |
| `params.input_image_url` | string | ❌ | Image-to-Video용 입력 이미지 URL |

**Response `202 Accepted`**

```json
{
  "generation": {
    "id": "gen_abc123def456",
    "model_id": "imagen-4",
    "type": "image",
    "status": "pending",
    "prompt": "A serene mountain landscape at sunset",
    "created_at": "2026-03-17T12:00:00Z"
  }
}
```

| 필드 | 타입 | 설명 |
|------|------|------|
| `generation.id` | string | 생성 작업 고유 ID |
| `generation.model_id` | string | 사용된 모델 ID |
| `generation.type` | string | `image` 또는 `video` |
| `generation.status` | string | `pending` |
| `generation.prompt` | string | 요청 프롬프트 |
| `generation.created_at` | string (ISO 8601) | 생성 요청 시각 (UTC) |

**에러**

| 상황 | 코드 |
|------|------|
| 필수 필드 누락/형식 오류 | `VALIDATION_ERROR` (400) |
| 프롬프트 정책 위반 | `CONTENT_POLICY` (400) |
| JWT 없음/만료 | `UNAUTHORIZED` (401) |
| 존재하지 않는 model_id | `MODEL_NOT_FOUND` (404) |
| 요청 횟수 초과 | `RATE_LIMIT` (429) |

---

### 3-2. 생성 상태 조회 (Polling)

프론트엔드에서 2초 간격으로 호출하여 생성 진행 상황을 확인한다.

```
GET /api/generation/{id}
```

**Headers**

| 헤더 | 값 | 필수 |
|------|---|------|
| Authorization | Bearer {jwt} | ✅ |

**Path Parameters**

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| `id` | string | 생성 작업 ID |

**Response `200 OK` — 진행 중 (pending/processing)**

```json
{
  "generation": {
    "id": "gen_abc123def456",
    "model_id": "imagen-4",
    "type": "image",
    "status": "processing",
    "prompt": "A serene mountain landscape at sunset",
    "progress": 45,
    "created_at": "2026-03-17T12:00:00Z",
    "result_url": null,
    "thumbnail_url": null,
    "error": null
  }
}
```

**Response `200 OK` — 완료 (completed)**

```json
{
  "generation": {
    "id": "gen_abc123def456",
    "model_id": "imagen-4",
    "type": "image",
    "status": "completed",
    "prompt": "A serene mountain landscape at sunset",
    "progress": 100,
    "created_at": "2026-03-17T12:00:00Z",
    "completed_at": "2026-03-17T12:00:12Z",
    "result_url": "https://provider-cdn.example.com/result/abc123.png",
    "thumbnail_url": "https://provider-cdn.example.com/result/abc123_thumb.png",
    "error": null
  }
}
```

**Response `200 OK` — 실패 (failed)**

```json
{
  "generation": {
    "id": "gen_abc123def456",
    "model_id": "imagen-4",
    "type": "image",
    "status": "failed",
    "prompt": "A serene mountain landscape at sunset",
    "progress": 0,
    "created_at": "2026-03-17T12:00:00Z",
    "completed_at": "2026-03-17T12:00:05Z",
    "result_url": null,
    "thumbnail_url": null,
    "error": {
      "code": "PROVIDER_ERROR",
      "message": "이미지 생성에 실패했습니다. 다시 시도해주세요."
    }
  }
}
```

| 필드 | 타입 | 설명 |
|------|------|------|
| `generation.id` | string | 생성 작업 ID |
| `generation.model_id` | string | 사용된 모델 ID |
| `generation.type` | string | `image` 또는 `video` |
| `generation.status` | string | `pending` → `processing` → `completed` \| `failed` |
| `generation.prompt` | string | 요청 프롬프트 |
| `generation.progress` | integer \| null | 진행률 0~100 (Provider가 지원하는 경우만) |
| `generation.created_at` | string (ISO 8601) | 요청 시각 |
| `generation.completed_at` | string \| null | 완료/실패 시각 |
| `generation.result_url` | string \| null | 생성된 이미지/비디오 URL (completed일 때만) |
| `generation.thumbnail_url` | string \| null | 썸네일 URL (비디오일 때만, 선택적) |
| `generation.error` | object \| null | 실패 시 에러 정보 |

**에러**

| 상황 | 코드 |
|------|------|
| JWT 없음/만료 | `UNAUTHORIZED` (401) |
| 다른 유저의 생성 작업 | `FORBIDDEN` (403) |
| 존재하지 않는 ID | `NOT_FOUND` (404) |

---

### 3-3. 내 생성 이력 조회

로그인한 유저의 생성 작업 목록을 최신순으로 반환한다.

```
GET /api/generations
```

**Headers**

| 헤더 | 값 | 필수 |
|------|---|------|
| Authorization | Bearer {jwt} | ✅ |

**Query Parameters**

| 파라미터 | 타입 | 필수 | 기본값 | 설명 |
|----------|------|------|--------|------|
| `type` | string | ❌ | — | `image` 또는 `video`로 필터링 |
| `status` | string | ❌ | — | `completed`, `failed` 등으로 필터링 |
| `cursor` | string | ❌ | — | 페이지네이션 커서 (이전 응답의 `next_cursor`) |
| `limit` | integer | ❌ | 20 | 한 페이지 결과 수 (최대 50) |

**Response `200 OK`**

```json
{
  "generations": [
    {
      "id": "gen_abc123def456",
      "model_id": "imagen-4",
      "type": "image",
      "status": "completed",
      "prompt": "A serene mountain landscape at sunset",
      "progress": 100,
      "created_at": "2026-03-17T12:00:00Z",
      "completed_at": "2026-03-17T12:00:12Z",
      "result_url": "https://provider-cdn.example.com/result/abc123.png",
      "thumbnail_url": null,
      "error": null
    }
  ],
  "next_cursor": "eyJjcmVhdGVkX2F0IjoiMjAyNi...",
  "has_more": true
}
```

| 필드 | 타입 | 설명 |
|------|------|------|
| `generations` | array | Generation 객체 배열 (3-2와 동일 구조) |
| `next_cursor` | string \| null | 다음 페이지 커서 |
| `has_more` | boolean | 추가 페이지 존재 여부 |

---

## 4. 갤러리 (Gallery)

### 4-1. 공개 갤러리 조회

`completed` 상태의 생성 결과를 공개 갤러리로 조회한다.

```
GET /api/gallery
```

**Headers**

| 헤더 | 값 | 필수 |
|------|---|------|
| Authorization | Bearer {jwt} | ❌ | (비로그인도 조회 가능) |

**Query Parameters**

| 파라미터 | 타입 | 필수 | 기본값 | 설명 |
|----------|------|------|--------|------|
| `type` | string | ❌ | — | `image` 또는 `video`로 필터링 |
| `model_id` | string | ❌ | — | 특정 모델로 필터링 |
| `sort` | string | ❌ | `recent` | `recent` (최신순), `popular` (인기순) |
| `cursor` | string | ❌ | — | 페이지네이션 커서 |
| `limit` | integer | ❌ | 20 | 한 페이지 결과 수 (최대 50) |

**Response `200 OK`**

```json
{
  "items": [
    {
      "id": "gen_abc123def456",
      "type": "image",
      "model_id": "imagen-4",
      "model_name": "Imagen 4",
      "prompt": "A serene mountain landscape at sunset",
      "result_url": "https://provider-cdn.example.com/result/abc123.png",
      "thumbnail_url": null,
      "created_at": "2026-03-17T12:00:12Z",
      "user": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "name": "홍길동",
        "profile_image": "https://lh3.googleusercontent.com/..."
      },
      "like_count": 12,
      "is_liked": false
    }
  ],
  "next_cursor": "eyJjcmVhdGVkX2F0IjoiMjAyNi...",
  "has_more": true
}
```

| 필드 | 타입 | 설명 |
|------|------|------|
| `items[].id` | string | 생성 작업 ID |
| `items[].type` | string | `image` 또는 `video` |
| `items[].model_id` | string | 모델 ID |
| `items[].model_name` | string | 모델 표시 이름 |
| `items[].prompt` | string | 프롬프트 |
| `items[].result_url` | string | 결과물 URL |
| `items[].thumbnail_url` | string \| null | 썸네일 URL |
| `items[].created_at` | string (ISO 8601) | 생성 완료 시각 |
| `items[].user` | object | 생성한 유저 정보 |
| `items[].like_count` | integer | 좋아요 수 |
| `items[].is_liked` | boolean | 현재 유저의 좋아요 여부 (비로그인 시 항상 false) |
| `next_cursor` | string \| null | 다음 페이지 커서 |
| `has_more` | boolean | 추가 페이지 존재 여부 |

---

### 4-2. 좋아요 토글

```
POST /api/gallery/{id}/like
```

**Headers**

| 헤더 | 값 | 필수 |
|------|---|------|
| Authorization | Bearer {jwt} | ✅ |

**Path Parameters**

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| `id` | string | 갤러리 아이템(generation) ID |

**Request Body**

없음

**Response `200 OK`**

```json
{
  "is_liked": true,
  "like_count": 13
}
```

| 필드 | 타입 | 설명 |
|------|------|------|
| `is_liked` | boolean | 토글 후 좋아요 상태 |
| `like_count` | integer | 토글 후 총 좋아요 수 |

---

## 전체 엔드포인트 요약

| Method | URI | Auth | Description |
|--------|-----|------|-------------|
| `POST` | `/api/auth/verify` | ❌ | Google ID Token → JWT 발급 |
| `GET` | `/api/models` | ✅ | 사용 가능한 AI 모델 목록 |
| `POST` | `/api/generate` | ✅ | 이미지/비디오 생성 요청 (202) |
| `GET` | `/api/generation/{id}` | ✅ | 생성 상태 polling |
| `GET` | `/api/generations` | ✅ | 내 생성 이력 목록 |
| `GET` | `/api/gallery` | ❌ | 공개 갤러리 조회 |
| `POST` | `/api/gallery/{id}/like` | ✅ | 좋아요 토글 |
