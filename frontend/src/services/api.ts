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
  TextOverlayRequest,
  TextOverlayResponse,
  WatermarkRequest,
  WatermarkResponse,
  SubtitlesRequest,
  SubtitlesResponse,
  ExtractAudioRequest,
  ExtractAudioResponse,
  RemoveAudioRequest,
  RemoveAudioResponse,
  ReplaceAudioRequest,
  ReplaceAudioResponse,
  AdjustVolumeRequest,
  AdjustVolumeResponse,
  MixAudioRequest,
  MixAudioResponse,
  SaveEditRequest,
  SaveEditResponse,
  ChangeResolutionRequest,
  ChangeResolutionResponse,
  VideoToGifRequest,
  VideoToGifResponse,
  ExtractThumbnailsRequest,
  ExtractThumbnailsResponse,
  CropRequest,
  CropResponse,
  LetterboxRequest,
  LetterboxResponse,
  RotateRequest,
  RotateResponse,
  ChangeFpsRequest,
  ChangeFpsResponse,
  DetectScenesRequest,
  DetectScenesResponse,
  SplitSceneRequest,
  SplitSceneResponse,
  BulkDownloadRequest,
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

  /** 텍스트 오버레이 */
  textOverlay(body: TextOverlayRequest) {
    return request<TextOverlayResponse>("/api/video/text-overlay", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  /** 워터마크 추가 */
  watermark(body: WatermarkRequest) {
    return request<WatermarkResponse>("/api/video/watermark", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  /** 자막 추가 */
  subtitles(body: SubtitlesRequest) {
    return request<SubtitlesResponse>("/api/video/subtitles", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  /** 오디오 추출 */
  extractAudio(body: ExtractAudioRequest) {
    return request<ExtractAudioResponse>("/api/video/extract-audio", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  /** 오디오 제거 */
  removeAudio(body: RemoveAudioRequest) {
    return request<RemoveAudioResponse>("/api/video/remove-audio", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  /** 오디오 교체 */
  replaceAudio(body: ReplaceAudioRequest) {
    return request<ReplaceAudioResponse>("/api/video/replace-audio", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  /** 볼륨 조절 */
  adjustVolume(body: AdjustVolumeRequest) {
    return request<AdjustVolumeResponse>("/api/video/adjust-volume", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  /** BGM 믹싱 */
  mixAudio(body: MixAudioRequest) {
    return request<MixAudioResponse>("/api/video/mix-audio", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  /** 해상도 변환 */
  changeResolution(body: ChangeResolutionRequest) {
    return request<ChangeResolutionResponse>("/api/video/change-resolution", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  /** FPS 변환 */
  changeFps(body: ChangeFpsRequest) {
    return request<ChangeFpsResponse>("/api/video/change-fps", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  /** 회전/뒤집기 */
  rotate(body: RotateRequest) {
    return request<RotateResponse>("/api/video/rotate", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  /** 크롭 */
  crop(body: CropRequest) {
    return request<CropResponse>("/api/video/crop", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  /** 레터박스 */
  letterbox(body: LetterboxRequest) {
    return request<LetterboxResponse>("/api/video/letterbox", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  /** 썸네일 추출 */
  extractThumbnails(body: ExtractThumbnailsRequest) {
    return request<ExtractThumbnailsResponse>("/api/video/extract-thumbnails", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  /** GIF 변환 */
  videoToGif(body: VideoToGifRequest) {
    return request<VideoToGifResponse>("/api/video/to-gif", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  /** 장면 감지 */
  detectScenes(body: DetectScenesRequest) {
    return request<DetectScenesResponse>("/api/video/detect-scenes", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  /** 장면 분할 */
  splitScene(body: SplitSceneRequest) {
    return request<SplitSceneResponse>("/api/video/split-scene", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  /** 일괄 다운로드 (ZIP) */
  async bulkDownload(body: BulkDownloadRequest): Promise<Blob> {
    const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    const token = getAccessToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const res = await fetch(`${BASE}/api/video/bulk-download`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error("Bulk download failed");
    return res.blob();
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
