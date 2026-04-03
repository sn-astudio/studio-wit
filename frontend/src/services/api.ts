/**
 * 백엔드 API 클라이언트
 * - JWT 자동 첨부
 * - 에러 응답 파싱
 * - 타입 안전한 요청/응답
 */

import type {
  AuthVerifyRequest,
  AuthVerifyResponse,
  CommentItem,
  CommentListResponse,
  ErrorResponse,
  GalleryItemDetail,
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
  CreativePresetRequest,
  CreativePresetResponse,
  ShortsConvertRequest,
  ShortsConvertResponse,
  CollageRequest,
  CollageResponse,
  BeforeAfterRequest,
  BeforeAfterResponse,
  PollOverlayRequest,
  PollOverlayResponse,
  QuizOverlayRequest,
  QuizOverlayResponse,
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

// ── 토큰 자동 갱신 ──

/** 갱신 중복 방지: 진행 중인 갱신 Promise */
let refreshPromise: Promise<boolean> | null = null;

/**
 * NextAuth 세션에서 idToken을 가져와 백엔드 JWT를 재발급받는다.
 * 동시에 여러 요청이 401을 받아도 갱신은 1번만 수행된다.
 */
async function tryRefreshToken(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      // NextAuth 세션에서 idToken 가져오기
      const sessionRes = await fetch("/api/auth/session");
      if (!sessionRes.ok) return false;
      const session = await sessionRes.json();
      const idToken = session?.idToken;
      if (!idToken) return false;

      // 백엔드에 JWT 재발급 요청
      const verifyRes = await fetch(`${BASE_URL}/api/auth/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_token: idToken }),
      });
      if (!verifyRes.ok) return false;

      const data = await verifyRes.json();
      accessToken = data.access_token;

      // localStorage + auth store 갱신 (이벤트로 전달)
      try {
        localStorage.setItem(
          "wit_auth",
          JSON.stringify({ token: data.access_token, user: data.user }),
        );
      } catch {}
      window.dispatchEvent(
        new CustomEvent("auth:refreshed", {
          detail: { token: data.access_token, user: data.user },
        }),
      );

      return true;
    } catch {
      return false;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
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
  _isRetry = false,
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
    // 401 → 토큰 만료: 자동 갱신 시도
    if (res.status === 401 && accessToken && !_isRetry) {
      const refreshed = await tryRefreshToken();
      if (refreshed) {
        // 새 토큰으로 원래 요청 재시도 (1회만)
        return request<T>(path, options, true);
      }
      // 갱신 실패 → 로그아웃
      accessToken = null;
      try {
        localStorage.removeItem("wit_auth");
      } catch {}
      window.dispatchEvent(new CustomEvent("auth:expired"));
    }

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

  /** 단일 아이템 상세 조회 */
  get(generationId: string) {
    return request<GalleryItemDetail>(`/api/gallery/${generationId}`);
  },

  /** 좋아요 토글 */
  toggleLike(generationId: string) {
    return request<LikeToggleResponse>(
      `/api/gallery/${generationId}/like`,
      { method: "POST" },
    );
  },

  /** 댓글 목록 조회 */
  listComments(generationId: string, params?: { cursor?: string; limit?: number }) {
    const searchParams = new URLSearchParams();
    if (params?.cursor) searchParams.set("cursor", params.cursor);
    if (params?.limit) searchParams.set("limit", String(params.limit));
    const qs = searchParams.toString();
    return request<CommentListResponse>(
      `/api/gallery/${generationId}/comments${qs ? `?${qs}` : ""}`,
    );
  },

  /** 댓글 작성 */
  createComment(generationId: string, content: string) {
    return request<CommentItem>(
      `/api/gallery/${generationId}/comments`,
      { method: "POST", body: JSON.stringify({ content }) },
    );
  },

  /** 댓글 삭제 */
  deleteComment(commentId: number) {
    return request<{ ok: boolean }>(
      `/api/gallery/comments/${commentId}`,
      { method: "DELETE" },
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

  /** 크리에이티브 프리셋 적용 */
  creativePreset(body: CreativePresetRequest) {
    return request<CreativePresetResponse>("/api/video/creative-preset", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  /** 쇼츠/릴스 변환 */
  shortsConvert(body: ShortsConvertRequest) {
    return request<ShortsConvertResponse>("/api/video/shorts-convert", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  /** 영상 콜라주 */
  collage(body: CollageRequest) {
    return request<CollageResponse>("/api/video/collage", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  /** 비포/애프터 비교 영상 */
  beforeAfter(body: BeforeAfterRequest) {
    return request<BeforeAfterResponse>("/api/video/before-after", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  /** 투표 오버레이 */
  pollOverlay(body: PollOverlayRequest) {
    return request<PollOverlayResponse>("/api/video/poll-overlay", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  /** 퀴즈 오버레이 */
  quizOverlay(body: QuizOverlayRequest) {
    return request<QuizOverlayResponse>("/api/video/quiz-overlay", {
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
