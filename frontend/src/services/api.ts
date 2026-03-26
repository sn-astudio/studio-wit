/**
 * 백엔드 API 클라이언트
 * - JWT 자동 첨부
 * - 에러 응답 파싱
 * - 타입 안전한 요청/응답
 */

import type {
  AuthVerifyRequest,
  AuthVerifyResponse,
  ErrorResponse,
  GalleryListResponse,
  GenerateRequest,
  GenerateResponse,
  GenerationListResponse,
  GenerationStatus,
  ImageUploadResponse,
  LikeToggleResponse,
  ModelListResponse,
  ModelType,
  TrimRequest,
  TrimResponse,
  VideoInfoResponse,
  VideoUploadResponse,
  CaptureFrameRequest,
  CaptureFrameResponse,
  MergeRequest,
  MergeResponse,
  SpeedRequest,
  SpeedResponse,
  ReverseRequest,
  ReverseResponse,
  FilterRequest,
  FilterResponse,
  SaveEditRequest,
  SaveEditResponse,
} from "@/types/api";

// ── 설정 ──

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// ── 토큰 관리 ──

let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

// ── 공통 fetch 래퍼 ──

class ApiError extends Error {
  code: string;
  status: number;
  details?: Record<string, unknown>;

  constructor(status: number, error: ErrorResponse["error"]) {
    super(error.message);
    this.name = "ApiError";
    this.code = error.code;
    this.status = status;
    this.details = error.details;
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as ErrorResponse | null;
    throw new ApiError(
      res.status,
      body?.error ?? { code: "UNKNOWN", message: res.statusText },
    );
  }

  return res.json() as Promise<T>;
}

// ── Auth API ──

export const authApi = {
  /** Google ID Token → JWT 발급 */
  verify(body: AuthVerifyRequest) {
    return request<AuthVerifyResponse>("/api/auth/verify", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },
};

// ── Models API ──

export const modelsApi = {
  /** 사용 가능한 AI 모델 목록 */
  list(type?: ModelType) {
    const params = type ? `?type=${type}` : "";
    return request<ModelListResponse>(`/api/models${params}`);
  },
};

// ── Generation API ──

export const generationApi = {
  /** 이미지/비디오 생성 요청 (202) */
  create(body: GenerateRequest) {
    return request<GenerateResponse>("/api/generate", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  /** 생성 상태 조회 (Polling) */
  get(generationId: string) {
    return request<GenerateResponse>(`/api/generation/${generationId}`);
  },

  /** 내 생성 이력 목록 */
  list(params?: {
    type?: ModelType;
    status?: GenerationStatus;
    cursor?: string;
    limit?: number;
  }) {
    const searchParams = new URLSearchParams();
    if (params?.type) searchParams.set("type", params.type);
    if (params?.status) searchParams.set("status", params.status);
    if (params?.cursor) searchParams.set("cursor", params.cursor);
    if (params?.limit) searchParams.set("limit", String(params.limit));
    const qs = searchParams.toString();
    return request<GenerationListResponse>(
      `/api/generations${qs ? `?${qs}` : ""}`,
    );
  },
};

// ── Gallery API ──

export const galleryApi = {
  /** 공개 갤러리 조회 */
  list(params?: {
    type?: ModelType;
    model_id?: string;
    sort?: "recent" | "popular";
    cursor?: string;
    limit?: number;
  }) {
    const searchParams = new URLSearchParams();
    if (params?.type) searchParams.set("type", params.type);
    if (params?.model_id) searchParams.set("model_id", params.model_id);
    if (params?.sort) searchParams.set("sort", params.sort);
    if (params?.cursor) searchParams.set("cursor", params.cursor);
    if (params?.limit) searchParams.set("limit", String(params.limit));
    const qs = searchParams.toString();
    return request<GalleryListResponse>(
      `/api/gallery${qs ? `?${qs}` : ""}`,
    );
  },

  /** 좋아요 토글 */
  toggleLike(generationId: string) {
    return request<LikeToggleResponse>(
      `/api/gallery/${generationId}/like`,
      { method: "POST" },
    );
  },
};

// ── Image Upload API ──

export const imageApi = {
  /** 이미지 파일 업로드 (multipart) → CDN URL */
  async upload(file: File): Promise<ImageUploadResponse> {
    const formData = new FormData();
    formData.append("file", file);

    const headers: Record<string, string> = {};
    if (accessToken) {
      headers["Authorization"] = `Bearer ${accessToken}`;
    }

    const res = await fetch(`${BASE_URL}/api/upload-image`, {
      method: "POST",
      headers,
      body: formData,
    });

    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as ErrorResponse | null;
      throw new ApiError(
        res.status,
        body?.error ?? { code: "UNKNOWN", message: res.statusText },
      );
    }

    return res.json() as Promise<ImageUploadResponse>;
  },
};

// ── Video Edit API ──

const BASE_URL_RAW = BASE_URL;

export const videoEditApi = {
  /** 비디오 트리밍 */
  trim(body: TrimRequest) {
    return request<TrimResponse>("/api/video/trim", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  /** 비디오 파일 업로드 (multipart) */
  async upload(file: File): Promise<VideoUploadResponse> {
    const formData = new FormData();
    formData.append("file", file);

    const headers: Record<string, string> = {};
    if (accessToken) {
      headers["Authorization"] = `Bearer ${accessToken}`;
    }

    const res = await fetch(`${BASE_URL_RAW}/api/video/upload`, {
      method: "POST",
      headers,
      body: formData,
    });

    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as ErrorResponse | null;
      throw new ApiError(
        res.status,
        body?.error ?? { code: "UNKNOWN", message: res.statusText },
      );
    }

    return res.json() as Promise<VideoUploadResponse>;
  },

  /** 비디오 메타데이터 조회 */
  info(url: string) {
    return request<VideoInfoResponse>("/api/video/info", {
      method: "POST",
      body: JSON.stringify({ url }),
    });
  },

  /** 비디오 프레임 캡처 */
  captureFrame(body: CaptureFrameRequest) {
    return request<CaptureFrameResponse>("/api/video/capture-frame", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  /** 비디오 합치기 */
  merge(body: MergeRequest) {
    return request<MergeResponse>("/api/video/merge", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  /** 비디오 속도 변경 */
  speed(body: SpeedRequest) {
    return request<SpeedResponse>("/api/video/speed", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  /** 비디오 역재생 */
  reverse(body: ReverseRequest) {
    return request<ReverseResponse>("/api/video/reverse", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  /** 비디오 필터 적용 */
  filter(body: FilterRequest) {
    return request<FilterResponse>("/api/video/filter", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  /** 편집 결과 저장 (merge 등 자동 저장되지 않은 결과를 히스토리에 저장) */
  saveEdit(body: SaveEditRequest) {
    return request<SaveEditResponse>("/api/video/save-edit", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },
};

export { ApiError };
