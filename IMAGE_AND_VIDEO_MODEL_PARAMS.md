# 이미지/비디오 모델 파라미터 정리

> 프론트엔드 ↔ 백엔드 ↔ 실제 Provider API 간 파라미터 불일치 현황
> 최종 업데이트: 2026-03-20
> **공식 API 문서 기반 검증 완료**

---

## 1. 모델 ID 매핑 현황

### 이미지 모델

| 프론트엔드 ID | 백엔드 ID | Provider | 상태 |
|---|---|---|---|
| `nano-banana-pro` | `nano-banana-pro` | Gemini | 일치 |
| `nano-banana-2` | _(없음)_ | Google | **백엔드 미등록** |
| `gpt-image` | `gpt-image` | OpenAI | 일치 |
| `flux` | `flux-2-pro` | fal.ai | **ID 불일치** |

### 비디오 모델

| 프론트엔드 ID | 백엔드 ID | Provider | 상태 |
|---|---|---|---|
| `veo-3.1` | `veo-3` | Google | **ID 불일치** |
| `veo-3.1-fast` | _(없음)_ | Google | **백엔드 미등록** |
| `sora-2` | `sora-2` | OpenAI | 일치 |
| `sora-2-pro` | _(없음)_ | OpenAI | **백엔드 미등록** |
| `kling-3.0-pro` | `kling` | fal.ai | **ID 불일치** |

> **참고**: `model_router.py`의 `MODEL_INFO`에는 `gpt-image-1`이 등록되어 있으나 `models.py`의 `AVAILABLE_MODELS`에서는 `gpt-image`로 등록. `generation.py`의 S3 업로드 분기(`line 69`)에서 두 ID를 모두 처리하고 있음.

> **참고**: `imagen-4`는 BE `model_router.py`의 `MODEL_INFO`와 `AVAILABLE_MODELS`에 여전히 존재하며 `GoogleProvider` (Vertex AI)를 사용한다. 그러나 FE에서 직접 사용하지 않으며, FE의 `nano-banana-pro`는 새로운 `GeminiProvider` (Gemini generateContent API)로 라우팅된다.

---

## 2. 이미지 모델별 파라미터 상세 비교

### 2-1. GPT Image (OpenAI `gpt-image-1`)

> 공식 문서: [OpenAI Images API Reference](https://developers.openai.com/api/reference/resources/images/methods/generate)

#### 공식 API 지원 파라미터 전체 목록

| 파라미터 | 타입 | 필수 | 허용값 | 기본값 | 설명 |
|---|---|---|---|---|---|
| `model` | string | Y | `gpt-image-1` | — | 모델 ID |
| `prompt` | string | Y | — | — | 이미지 설명 |
| `n` | int | N | 1~10 | 1 | 생성 이미지 수 |
| `size` | string | N | `1024x1024`, `1536x1024`, `1024x1536`, `auto` | `auto` | 출력 크기 |
| `quality` | string | N | `auto`, `low`, `medium`, `high` | `auto` | 품질 수준 (4단계) |
| `background` | string | N | `transparent`, `opaque` | `opaque` | 배경 투명 여부 |
| `output_format` | string | N | `png`, `jpeg`, `webp` | `png` | 출력 포맷 |
| `moderation` | string | N | `auto`, `low` | `auto` | 콘텐츠 필터링 수준 |

> **주의**: `style` 파라미터는 **DALL-E 3 전용**이며 `gpt-image-1`에서는 미지원.
> **주의**: `"standard"`, `"hd"` quality 값은 **DALL-E 3 전용 용어**. `gpt-image-1`은 `auto`/`low`/`medium`/`high` 4단계 사용.

**프론트엔드** (`gpt-image`): `frontend/src/components/PromptInput/const.ts:41-46`

| 파라미터 | UI 타입 | 옵션/범위 |
|---|---|---|
| aspectRatio | select | 1:1, 16:9, 9:16 |
| numImages | select | 1 (1개만) |
| quality | select | standard, hd |

**백엔드 스키마** (`backend/app/api/models.py:31-38`):

| supported_params | GenerateParams 필드 |
|---|---|
| aspect_ratio | `aspect_ratio: AspectRatio` |
| quality | `quality: Optional[str]` |
| style | `style: Optional[str]` |

**실제 API 호출** (`backend/app/services/providers/openai_provider.py:40-47`):

```python
body = {
    "model": "gpt-image-1",
    "prompt": prompt,
    "n": 1,                    # 하드코딩
    "size": size,              # aspect_ratio → size 변환
    "quality": {"standard": "auto", "high": "high"}.get(quality, "auto"),
    "output_format": "png",
}
```

**불일치 사항 (공식 스펙 기준)**:

| 항목 | 문제 | 심각도 |
|---|---|---|
| **size 매핑** | BE에서 16:9를 `1792x1024`로 변환하고 있으나, 공식 스펙은 `1536x1024`가 올바른 값. `1024x1792`도 `1024x1536`이어야 함 | **높음** — API 에러 또는 예기치 않은 동작 |
| **quality 매핑** | FE가 `"standard"`/`"hd"` 전송 → BE는 `"standard"→"auto"`, `"high"→"high"` 매핑. FE에서 보내는 `"hd"` 키가 매핑에 없어 `"auto"` fallback. 또한 공식 스펙은 `auto`/`low`/`medium`/`high` 4단계인데 FE는 2단계만 제공 | **높음** — HD 선택 무시 + 스펙 불일치 |
| **style** | BE `supported_params`에 포함했으나, 공식 API에서 `gpt-image-1`은 `style` **미지원** (DALL-E 3 전용) | **중간** — 잘못된 파라미터 선언, 제거 필요 |
| **n (numImages)** | 공식 스펙은 최대 10개까지 지원하지만, FE는 1만 제공, BE는 `1`로 하드코딩 | **낮음** — 기능 확장 가능 |
| **background** | 공식 API에서 투명 배경 지원 (`transparent`/`opaque`), 현재 BE/FE 미지원 | **낮음** — 새 기능 노출 가능 |
| **output_format** | `png` 하드코딩. 공식 스펙은 `png`/`jpeg`/`webp` 지원 | **낮음** — 사용자 선택 가능 |

---

### 2-2. Nano Banana Pro (Gemini)

> `nano-banana-pro` PR(#18) 머지로 신규 추가된 모델.
> 공식 API: [Gemini generateContent API](https://ai.google.dev/api/generate-content) (`generativelanguage.googleapis.com/v1beta`)

#### Provider 정보

- **Provider**: `GeminiProvider` (`backend/app/services/providers/gemini.py`)
- **실제 모델**: `gemini-3.1-flash-image-preview`
- **동기 모델**: 즉시 결과 반환 (base64 inline data), `is_async: False`
- **BE ID**: `nano-banana-pro` (FE와 일치)

**프론트엔드** (`nano-banana-pro`): `frontend/src/components/PromptInput/const.ts:29-34`

| 파라미터 | UI 타입 | 옵션/범위 |
|---|---|---|
| aspectRatio | select | 1:1, 16:9, 9:16, 4:3, 3:4, 3:2, 2:3, 4:5, 5:4, 21:9 |
| numImages | select | 1, 2, 3, 4 |

**백엔드 스키마** (`backend/app/api/models.py:32-39`):

| supported_params | GenerateParams 필드 |
|---|---|
| aspect_ratio | `aspect_ratio: AspectRatio` |

**실제 API 호출** (`backend/app/services/providers/gemini.py:27-33`):

```python
body = {
    "contents": [{"parts": [{"text": prompt}]}],
    "generationConfig": {
        "responseModalities": ["IMAGE"],
        "imageConfig": {"aspectRatio": aspect_ratio},
    },
}
```

**불일치 사항 (코드 기준)**:

| 항목 | 문제 | 심각도 |
|---|---|---|
| **numImages** | FE에서 1~4 선택 가능하지만, BE `supported_params`에 미포함, API 호출에서도 전달하지 않음. Gemini generateContent API의 이미지 생성 다중 출력 지원 여부 미확인 | **높음** — 사용자 선택 무시 |
| **aspectRatio 옵션** | FE: 10가지, BE `AspectRatio` enum: 5가지(`1:1`, `16:9`, `9:16`, `4:3`, `3:4`). FE의 `3:2`, `2:3`, `4:5`, `5:4`, `21:9`는 BE validation 실패. Gemini API의 정확한 지원 범위 미확인 | **높음** — FE에서 지원되지 않는 옵션 제거 또는 API 지원 범위 확인 필요 |
| **negativePrompt** | FE에서 UI 미제공, BE에서도 미전달. Gemini API의 negative prompt 지원 여부 미확인 | **낮음** — 현재 문제 없음 |

---

### 2-3. Imagen 4 (Google — Vertex AI)

> **주의**: 이 모델은 BE에 등록되어 있으나, FE에서 직접 호출하지 않음. FE의 `nano-banana-pro`가 별도의 `GeminiProvider`로 라우팅됨.
> 공식 문서: [Vertex AI Imagen API](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/model-reference/imagen-api)

#### 공식 API 지원 파라미터 전체 목록

| 파라미터 | 타입 | 필수 | 허용값 | 기본값 | 설명 |
|---|---|---|---|---|---|
| `prompt` | string | Y | — | — | 이미지 설명 |
| `negativePrompt` | string | N | — | — | 제외할 요소 설명 (**지원됨**) |
| `sampleCount` | int | N | 1~4 | 4 | 생성 이미지 수 |
| `aspectRatio` | string | N | `1:1`, `9:16`, `16:9`, `3:4`, `4:3` | `1:1` | 종횡비 |
| `personGeneration` | string | N | `dont_allow`, `allow_adult`, `allow_all` | `allow_adult` | 인물 생성 허용 |
| `seed` | uint32 | N | 1~2147483647 | — | 재현성 시드 |
| `sampleImageSize` | string | N | `"1K"`, `"2K"` | — | 출력 해상도 |
| `enhancePrompt` | boolean | N | true/false | true | 자동 프롬프트 향상 |
| `addWatermark` | boolean | N | true/false | true | 워터마크 추가 |
| `language` | string | N | `"auto"`, `"en"`, `"ko"` 등 | `"auto"` | 프롬프트 언어 |

> **주의**: 기존 코드 주석에 "negativePrompt 미지원"으로 명시되어 있으나, **공식 문서에서는 지원됨**을 확인.

**프론트엔드**: FE에서 직접 호출하지 않음 (FE `nano-banana-pro` → `GeminiProvider`로 라우팅, 위 섹션 2-2 참조)

**백엔드 스키마** (`backend/app/api/models.py:14-21`):

| supported_params | GenerateParams 필드 |
|---|---|
| aspect_ratio | `aspect_ratio: AspectRatio` (enum: 1:1, 16:9, 9:16, 4:3, 3:4) |
| style | `style: Optional[str]` |

**실제 API 호출** (`backend/app/services/providers/google.py:27-34`):

```python
body = {
    "instances": [{"prompt": prompt}],
    "parameters": {
        "sampleCount": 1,          # 하드코딩 (공식 기본값은 4)
        "aspectRatio": aspect_ratio,
        "personGeneration": "allow_all",
    },
}
```

**불일치 사항 (공식 스펙 기준)**:

| 항목 | 문제 | 심각도 |
|---|---|---|
| **numImages / sampleCount** | FE에서 1~4 선택 가능 (공식 스펙도 1~4 지원), BE는 `sampleCount: 1` 하드코딩. `GenerateParams`에 필드 없음 | **높음** — 사용자 선택 무시 |
| **aspectRatio 옵션** | FE: 10가지, 공식 API: 5가지 (`1:1`, `16:9`, `9:16`, `4:3`, `3:4`), BE enum: 5가지. FE의 `3:2`, `2:3`, `4:5`, `5:4`, `21:9`는 **API 자체가 미지원** | **높음** — FE에서 지원되지 않는 옵션 제거 필요 |
| **negativePrompt** | 코드 주석에 "미지원"으로 명시했으나, **공식 API에서 지원**. FE에서도 UI 미제공 | **중간** — 코드 주석 수정 + 기능 노출 가능 |
| **style** | BE에서 `supported_params`에 포함했으나, 공식 API에 해당 파라미터 없음 | 낮음 — 미사용 선언, 제거 권장 |
| **seed** | 공식 API 지원 (uint32), 현재 BE/FE 미지원 | **낮음** — 재현성 기능 노출 가능 |
| **enhancePrompt** | 공식 API 기본값 `true`로 자동 프롬프트 향상. 현재 BE에서 제어 불가 | **낮음** — 향상 기능 끄기 옵션 제공 가능 |
| **language** | 공식 API에서 다국어 지원 (`"ko"` 등). 한국어 프롬프트 최적화 가능 | **낮음** — 새 기능 |

---

### 2-4. Nano Banana 2

**프론트엔드** (`nano-banana-2`): `frontend/src/components/PromptInput/const.ts:35-39`

| 파라미터 | UI 타입 | 옵션/범위 |
|---|---|---|
| aspectRatio | select | 1:1, 16:9, 9:16, 4:3, 3:4, 3:2, 2:3, 4:5, 5:4, 1:4, 4:1, 1:8, 8:1, 21:9 (14가지) |
| numImages | select | 1, 2, 3, 4 |

**백엔드**: 해당 모델 ID 없음

**불일치 사항**:

| 항목 | 문제 | 심각도 |
|---|---|---|
| 모델 자체 | FE에만 존재. 생성 요청 시 `ModelNotFoundException` 발생 | **치명적** |

---

### 2-5. Flux 2 Pro (fal.ai)

> 공식 문서: [fal.ai Flux 2 Pro](https://fal.ai/models/fal-ai/flux-2-pro)

#### 공식 API 지원 파라미터 전체 목록

| 파라미터 | 타입 | 필수 | 허용값 | 기본값 | 설명 |
|---|---|---|---|---|---|
| `prompt` | string | Y | — | — | 이미지 설명 |
| `image_size` | string/object | N | `square_hd`, `square`, `portrait_4_3`, `portrait_16_9`, `landscape_4_3`, `landscape_16_9` 또는 `{width, height}` | `landscape_4_3` | 출력 크기 |
| `seed` | int | N | — | — | 재현성 시드 |
| `safety_tolerance` | string | N | `"1"` ~ `"5"` | `"2"` | 안전 필터 수준 (5=가장 관대) |
| `output_format` | string | N | `jpeg`, `png` | `jpeg` | 출력 포맷 |

> **주의**: `negative_prompt`, `guidance_scale`, `num_steps`, `num_images` 파라미터는 Flux 2 Pro에서 **미지원**.
> 이들은 Flux 1 계열 (dev/schnell)의 파라미터이며, Flux 2 Pro는 자동 최적화 모델.

**프론트엔드** (`flux`): `frontend/src/components/PromptInput/const.ts:47-59`

| 파라미터 | UI 타입 | 옵션/범위 |
|---|---|---|
| aspectRatio | select | 1:1, 16:9, 9:16, 4:3, 3:4, 3:2, 2:3 |
| numImages | select | 1, 2, 3, 4 |
| negativePrompt | text | 자유 입력 |
| guidanceScale | slider | 1~20 (step 0.5, default 7.5) |
| steps | slider | 1~50 (step 1, default 20) |
| seed | text | 정수 |

**백엔드 스키마** (`backend/app/api/models.py:48-57`):

| supported_params | GenerateParams 필드 |
|---|---|
| aspect_ratio | `aspect_ratio: AspectRatio` |
| guidance_scale | `guidance_scale: Optional[float]` (1.0~20.0) |
| num_steps | `num_steps: Optional[int]` (10~50) |

**실제 API 호출** (`backend/app/services/providers/fal.py:30-35`):

```python
body = {
    "prompt": prompt,
    "image_size": self._aspect_to_size(aspect_ratio),  # 5가지 매핑만 존재
}
if params.get("seed") is not None:
    body["seed"] = params["seed"]
```

**size_map** (`fal.py:168-176`):
```python
{"1:1": "square_hd", "16:9": "landscape_16_9", "9:16": "portrait_16_9",
 "4:3": "landscape_4_3", "3:4": "portrait_4_3"}
```

**불일치 사항 (공식 스펙 기준)**:

| 항목 | 문제 | 심각도 |
|---|---|---|
| **negativePrompt** | FE에서 입력 UI 제공하지만, 공식 API가 **미지원** | **높음** — FE에서 UI 제거 필요 |
| **guidanceScale** | FE에서 슬라이더 제공, BE `supported_params`에 선언, 하지만 공식 API가 **미지원** | **높음** — FE/BE 모두 제거 필요 |
| **num_steps (steps)** | FE에서 슬라이더 제공, BE `supported_params`에 선언, 하지만 공식 API가 **미지원** | **높음** — FE/BE 모두 제거 필요 |
| **numImages** | FE에서 1~4 선택 가능, 하지만 공식 API가 **미지원** (`num_images` 파라미터 없음) | **높음** — FE에서 제거 필요 |
| **image_size 매핑 누락** | `square` 값 누락 (현재 `square_hd`만 매핑). `3:2`, `2:3`는 매핑 없음 → default fallback | **중간** — 비율 무시될 수 있음 |
| **image_size 기본값** | 공식 기본값은 `landscape_4_3`, BE는 매핑 실패 시 `square_hd` fallback | **낮음** — 동작 차이 |
| **seed** | FE에서 입력 가능, BE 스키마에 미정의이지만 `**params`로 우회 전달되어 동작 | **중간** — 스키마 정의 필요 |
| **safety_tolerance** | 공식 API 지원 (`"1"`~`"5"`), 현재 미노출 | **낮음** — 새 기능 |
| **output_format** | 공식 API 지원 (`jpeg`/`png`), 현재 미노출. 기본값은 `jpeg` | **낮음** — 새 기능 |

---

## 3. 비디오 모델 파라미터 비교

### 3-1. Sora 2 (OpenAI)

> 공식 문서: [OpenAI Videos API Reference](https://developers.openai.com/api/reference/resources/videos/methods/create/)

#### 공식 API 지원 파라미터 전체 목록

| 파라미터 | 타입 | 필수 | 허용값 | 기본값 | 설명 |
|---|---|---|---|---|---|
| `model` | string | Y | `sora-2`, `sora-2-pro` | — | 모델 ID |
| `prompt` | string | Y | — | — | 비디오 설명 |
| `seconds` | int | N | `4`, `8`, `12`, `16`, `20` | — | 영상 길이 (**초**) |
| `size` | string | N | `720x1280`, `1280x720`, `1024x1792`, `1792x1024` | — | 출력 크기 (WxH) |
| `input_reference` | array | N | `[{"image_url": "..."}]` | — | image-to-video 참조 이미지 (객체 배열) |

> **주의**: 공식 파라미터 이름은 `seconds`이지 `duration`이 아님.
> **주의**: 공식 파라미터 이름은 `size` (WxH 문자열)이지 `aspect_ratio`가 아님.
> **주의**: `input_reference`는 `{"image_url": "..."}` 객체의 배열 형태.

**프론트엔드**:

| 항목 | 프론트엔드 | 공식 API |
|---|---|---|
| model_id | `sora-2` / `sora-2-pro` | `sora-2`, `sora-2-pro` |
| aspectRatio | 16:9, 9:16 | N/A — `size`로 전달 (`1280x720`, `720x1280` 등) |
| duration | 4, 8, 16, 20초 | N/A — `seconds`로 전달 (`4`, `8`, `12`, `16`, `20`) |

**백엔드**:

| 항목 | 백엔드 | 공식 API |
|---|---|---|
| aspect_ratio | `aspect_ratio` 키로 전달 | **`size`** (WxH 문자열) — **파라미터 이름+형식 틀림** |
| duration | `duration` 키로 전달 (2~16) | **`seconds`** — **파라미터 이름 틀림** |
| image_url | `"image_url"` 직접 전달 | **`input_reference: [{"image_url": "..."}]`** — **구조 틀림** |

**불일치 사항 (공식 스펙 기준)**:

| 항목 | 문제 | 심각도 |
|---|---|---|
| **파라미터 이름: duration → seconds** | BE에서 `duration`으로 전달하지만 공식 API는 `seconds` | **높음** — API 호출 실패 가능 |
| **파라미터 이름: aspect_ratio → size** | BE에서 `aspect_ratio` 비율값으로 전달하지만 공식 API는 `size` WxH 문자열 (`1280x720` 등) | **높음** — API 호출 실패 가능 |
| **input_reference 구조** | BE에서 `image_url` 직접 전달, 공식 API는 `[{"image_url": "..."}]` 객체 배열 | **높음** — image-to-video 실패 가능 |
| **sora-2-pro** | FE에 있으나 BE에 미등록. 공식 API에서 `sora-2-pro` 모델 지원 | **중간** — 기능 확장 가능 |
| **seconds 허용값** | 공식: `4`, `8`, `12`, `16`, `20`. FE: 4, 8, 16, 20 (12초 누락). BE: 2~16 (20초 초과) | **중간** — FE에 12초 추가, BE 범위 조정 필요 |

---

### 3-2. Veo 3 (Google)

> 공식 문서: [Vertex AI Veo API](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/model-reference/veo-video-generation)

#### 공식 API 지원 파라미터 전체 목록

| 파라미터 | 타입 | 필수 | 허용값 | 기본값 | 설명 |
|---|---|---|---|---|---|
| `prompt` | string | Y | — | — | 비디오 설명 |
| `aspectRatio` | string | N | `"16:9"`, `"9:16"` | `"16:9"` | 종횡비 |
| `durationSeconds` | **string** | N | `"4"`, `"6"`, `"8"` | — | 영상 길이 (**문자열**) |
| `resolution` | string | N | `"720p"`, `"1080p"`, `"4k"` | — | 출력 해상도 |
| `seed` | uint32 | N | — | — | 재현성 시드 |
| `image` | object | N | `{"bytesBase64Encoded": "...", "mimeType": "..."}` 또는 `{"gcsUri": "..."}` | — | image-to-video 입력 |

> **주의**: `durationSeconds`는 **문자열 타입** (`"4"`, `"6"`, `"8"`)이지 정수가 아님.

**프론트엔드**:

| 항목 | 프론트엔드 | 공식 API |
|---|---|---|
| model_id | `veo-3.1` / `veo-3.1-fast` | `veo-3:predict` |
| aspectRatio | 16:9, 9:16 | `"16:9"`, `"9:16"` |
| duration | 4, 6, 8초 | `"4"`, `"6"`, `"8"` (문자열) |
| resolution | 720p, 1080p, 4K | `"720p"`, `"1080p"`, `"4k"` |

**불일치 사항 (공식 스펙 기준)**:

| 항목 | 문제 | 심각도 |
|---|---|---|
| **durationSeconds 타입** | BE에서 int로 전달하지만 공식 API는 **문자열** (`"4"`, `"6"`, `"8"`) | **높음** — 타입 불일치로 API 에러 가능 |
| **resolution 미전달** | FE에 UI 있고 공식 API 지원, 하지만 BE에서 API에 **미전달** | **높음** — 사용자 선택 무시 |
| **veo-3.1-fast** | FE에 있으나 BE에 미등록 | **중간** — 기능 미동작 |
| **seed** | 공식 API 지원, 현재 BE/FE 미지원 | **낮음** — 새 기능 |
| **image (i2v)** | 공식 API에서 image-to-video 지원. BE에서 `{"uri": url}` 구조로 전달 — 공식 구조와 일치 여부 검증 필요 | **중간** |

---

### 3-3. Kling v2 Master (fal.ai)

> 공식 문서: [fal.ai Kling Video v2 Master](https://fal.ai/models/fal-ai/kling-video/v2/master/text-to-video/api)

#### 공식 API 지원 파라미터 전체 목록

| 파라미터 | 타입 | 필수 | 허용값 | 기본값 | 설명 |
|---|---|---|---|---|---|
| `prompt` | string | Y | — | — | 비디오 설명 |
| `duration` | int | N | `5`, `10` | `5` | 영상 길이 (**5 또는 10만 가능**) |
| `aspect_ratio` | string | N | `"16:9"`, `"9:16"`, `"1:1"` | `"16:9"` | 종횡비 |
| `negative_prompt` | string | N | — | `"blur, distort, and low quality"` | 제외 요소 |
| `cfg_scale` | float | N | — | `0.5` | classifier-free guidance 강도 |

> **주의**: `seed` 파라미터는 Kling v2 Master에서 **미지원**.
> **주의**: `duration`은 `5` 또는 `10`만 가능. 다른 값 불가.

**프론트엔드** (`kling-3.0-pro`):

| 파라미터 | UI 타입 | 옵션/범위 |
|---|---|---|
| aspectRatio | select | 16:9, 9:16, 1:1 |
| duration | select | 3~15초 (13가지 옵션) |
| negativePrompt | text | 자유 입력 |
| cfgScale | slider | 0~1 (step 0.05) |

**불일치 사항 (공식 스펙 기준)**:

| 항목 | 문제 | 심각도 |
|---|---|---|
| **duration 범위** | FE: 3~15초 (13가지), BE: 2~16. 공식 API: **`5` 또는 `10`만 가능** | **높음** — 대부분의 값이 유효하지 않음 |
| **negative_prompt** | FE에서 입력 UI 제공, 공식 API 지원 (기본값: `"blur, distort, and low quality"`), 하지만 **BE에서 API에 미전달** | **높음** — 사용자 입력 무시 |
| **cfg_scale** | FE에서 슬라이더 제공, 공식 API 지원 (기본값: `0.5`), 하지만 **BE에서 API에 미전달** | **높음** — 사용자 설정 무시 |
| **aspectRatio 옵션** | FE 3가지 = 공식 API 3가지. 정확히 일치 | 없음 — 정상 |

---

## 4. 공통 구조적 문제

### 4-1. 파라미터 네이밍 변환 누락

프론트엔드(camelCase)와 백엔드(snake_case) 간 변환 레이어가 없음.

| 프론트엔드 키 | 백엔드 필드 | 공식 API 파라미터 | 상태 |
|---|---|---|---|
| `aspectRatio` | `aspect_ratio` | 모델마다 다름 (`aspectRatio`, `size`, `image_size`, `aspect_ratio`) | 변환 필요 |
| `numImages` | _(없음)_ | `n` (OpenAI), `sampleCount` (Google Vertex), 미지원 (fal.ai Flux 2 Pro), 미확인 (Gemini) | 스키마 미정의 |
| `negativePrompt` | `negative_prompt` (GenerateRequest 최상위) | `negativePrompt` (Google), `negative_prompt` (fal.ai Kling), 미지원 (Flux 2 Pro, OpenAI) | 변환 필요 |
| `guidanceScale` | `guidance_scale` | **Flux 2 Pro에서 미지원** | FE/BE 제거 필요 |
| `steps` | `num_steps` | **Flux 2 Pro에서 미지원** | FE/BE 제거 필요 |
| `seed` | _(없음)_ | `seed` (Google, Flux), 미지원 (Kling) | 스키마 미정의 |
| `cfgScale` | _(없음)_ | `cfg_scale` (Kling) | 스키마 미정의 |
| `resolution` | _(없음)_ | `resolution` (Veo) | 스키마 미정의 |

> 현재 FE에서 `GenerateRequest`를 구성하는 변환 로직이 구현되어 있지 않음 (`PromptInput`의 `onSubmit`에서 raw params를 그대로 전달).

### 4-2. AspectRatio Enum 제한

백엔드 `AspectRatio` enum (`schemas.py:92-97`):
```python
class AspectRatio(str, Enum):
    square = "1:1"
    landscape = "16:9"
    portrait = "9:16"
    standard = "4:3"
    standard_portrait = "3:4"
```

프론트엔드에서 제공하는 비율 중 다음은 **BE validation 실패**:
- `3:2`, `2:3`, `4:5`, `5:4`, `1:4`, `4:1`, `1:8`, `8:1`, `21:9`

**공식 API 기준 지원 비율**:
- Imagen 4: `1:1`, `16:9`, `9:16`, `4:3`, `3:4` — BE enum과 일치
- GPT Image: `1024x1024`, `1536x1024`, `1024x1536`, `auto` — 비율이 아닌 size로 전달
- Flux 2 Pro: 6가지 preset + 커스텀 — 비율이 아닌 preset 이름으로 전달
- Kling: `16:9`, `9:16`, `1:1`
- Veo: `16:9`, `9:16`
- Sora: size로 전달 (`1280x720` 등)

### 4-3. GenerateParams에 누락된 필드

| 필드 | 사용하는 모델 | 공식 API 지원 | 현황 |
|---|---|---|---|
| `seed` | Imagen 4, Flux, Veo | 지원 | `**params`로 우회 전달되지만 스키마 미정의 |
| `num_images` / `n` / `sampleCount` | Imagen 4, GPT Image | 지원 (Flux 2 Pro 미지원, Gemini 미확인) | 스키마 미정의, BE 하드코딩 |
| `cfg_scale` | Kling | 지원 | 스키마 미정의 |
| `resolution` | Veo | 지원 | 스키마 미정의 |
| `negative_prompt` | Imagen 4, Kling | 지원 (Flux 2 Pro, GPT Image **미지원**) | `GenerateRequest` 최상위에 있으나 전달 경로 불완전 |
| `guidance_scale` | _(없음)_ | **Flux 2 Pro 미지원** | BE에서 선언만 되어 있고 실제 미전달. 선언 자체 제거 필요 |
| `num_steps` | _(없음)_ | **Flux 2 Pro 미지원** | BE에서 선언만 되어 있고 실제 미전달. 선언 자체 제거 필요 |

---

## 5. 관련 파일 위치

### 프론트엔드

| 용도 | 파일 |
|---|---|
| 모델/파라미터 정의 | `frontend/src/components/PromptInput/const.ts` |
| 타입 정의 (UI) | `frontend/src/components/PromptInput/types.ts` |
| API 타입 정의 | `frontend/src/types/api.ts` |
| API 클라이언트 | `frontend/src/services/api.ts` |
| 프롬프트 상태 | `frontend/src/stores/promptStore.ts` |
| 생성 상태 | `frontend/src/stores/generation.ts` |

### 백엔드

| 용도 | 파일 |
|---|---|
| 모델 목록/엔드포인트 | `backend/app/api/models.py` |
| 생성 엔드포인트 | `backend/app/api/generation.py` |
| 요청/응답 스키마 | `backend/app/models/schemas.py` |
| 모델→Provider 라우팅 | `backend/app/services/model_router.py` |
| Google Provider (Vertex AI) | `backend/app/services/providers/google.py` |
| Gemini Provider | `backend/app/services/providers/gemini.py` |
| OpenAI Provider | `backend/app/services/providers/openai_provider.py` |
| fal.ai Provider | `backend/app/services/providers/fal.py` |

---

## 6. 검증 출처

| Provider | 문서 URL |
|---|---|
| OpenAI GPT Image | [developers.openai.com/api/reference/resources/images/methods/generate](https://developers.openai.com/api/reference/resources/images/methods/generate) |
| OpenAI Sora 2 | [developers.openai.com/api/reference/resources/videos/methods/create](https://developers.openai.com/api/reference/resources/videos/methods/create/) |
| Google Imagen 4 (Vertex AI) | [docs.cloud.google.com/vertex-ai/generative-ai/docs/model-reference/imagen-api](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/model-reference/imagen-api) |
| Google Gemini (generateContent) | [ai.google.dev/api/generate-content](https://ai.google.dev/api/generate-content) |
| Google Veo 3 | [docs.cloud.google.com/vertex-ai/generative-ai/docs/model-reference/veo-video-generation](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/model-reference/veo-video-generation) |
| fal.ai Flux 2 Pro | [fal.ai/models/fal-ai/flux-2-pro](https://fal.ai/models/fal-ai/flux-2-pro) |
| fal.ai Kling v2 Master | [fal.ai/models/fal-ai/kling-video/v2/master/text-to-video/api](https://fal.ai/models/fal-ai/kling-video/v2/master/text-to-video/api) |

---

## 7. 권장 수정 우선순위 (공식 스펙 기준)

### P0 (치명적 — API 호출 실패 가능)
1. **Sora 2 파라미터 이름 수정**: `duration` → `seconds`, `aspect_ratio` → `size`, `image_url` → `input_reference` 구조
2. **GPT Image size 값 수정**: `1792x1024` → `1536x1024`, `1024x1792` → `1024x1536`
3. **모델 ID 통일**: FE ↔ BE 모델 ID 매핑 테이블 구성 또는 ID 통일 (`nano-banana-pro`는 해결됨 ✓)
4. **미등록 모델 처리**: `nano-banana-2`, `veo-3.1-fast`, `sora-2-pro` — BE에 추가하거나 FE에서 제거

### P1 (높음 — 사용자 입력이 무시되거나 잘못된 UI 제공)
5. **Flux 2 Pro: 미지원 파라미터 제거**: FE에서 `negativePrompt`, `guidanceScale`, `steps`, `numImages` UI 제거. BE에서 `guidance_scale`, `num_steps` supported_params 제거
6. **Kling duration 제한**: FE 옵션을 `5`, `10`만으로 제한 (공식 API 허용값)
7. **Kling negative_prompt, cfg_scale BE 전달**: FE에서 입력받지만 BE에서 API에 미전달 중
8. **GPT Image quality 매핑 수정**: `"hd"→"high"` 추가 또는 FE를 `low`/`medium`/`high`/`auto` 4단계로 변경
9. **GPT Image style 제거**: BE `supported_params`에서 제거 (gpt-image-1 미지원)
10. **Veo durationSeconds 타입 수정**: int → string (`"4"`, `"6"`, `"8"`)
11. **Veo resolution BE 전달**: FE에서 선택한 값을 실제 API에 전달
12. **numImages/sampleCount 지원**: Imagen 4 (`sampleCount` 1~4), GPT Image (`n` 1~10) — FE 선택값 BE에서 실제 전달
13. **Nano Banana Pro numImages 미전달**: FE에서 1~4 선택 가능하지만 BE `supported_params`에 미포함, API 호출에서도 전달하지 않음
14. **Nano Banana Pro aspectRatio 옵션 제한**: FE 10가지 중 BE enum에 없는 5가지(`3:2`, `2:3`, `4:5`, `5:4`, `21:9`)는 validation 실패
15. **FE→BE 파라미터 변환 레이어 구현**: camelCase → snake_case 변환 + 키 이름 매핑
16. **AspectRatio FE 옵션 정리**: 각 모델별 공식 API 지원 비율만 FE에 노출

### P2 (중간 — 기능 개선)
17. **seed 스키마 정의**: `GenerateParams`에 `seed` 필드 추가 (Imagen 4, Flux, Veo에서 사용)
18. **Imagen 4 negativePrompt 활성화**: 코드 주석 수정 + FE UI 노출 + BE 전달
19. **GPT Image background 지원**: 투명 배경 기능 노출
20. **Flux 2 Pro safety_tolerance 노출**: 안전 필터 수준 설정
21. **sora-2-pro BE 등록**: 공식 API에서 지원하는 모델

### P3 (낮음 — 부가 기능)
22. **Imagen 4 enhancePrompt 제어**: 자동 프롬프트 향상 끄기 옵션
23. **Imagen 4 language 지원**: 한국어 프롬프트 최적화 (`"ko"`)
24. **output_format 노출**: GPT Image (`png`/`jpeg`/`webp`), Flux 2 Pro (`jpeg`/`png`)
25. **Imagen 4 sampleImageSize**: `"1K"` / `"2K"` 해상도 선택
