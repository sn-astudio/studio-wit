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
  LikeToggleResponse,
  ModelListResponse,
  ModelType,
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

export { ApiError };
