/**
 * 백엔드 API 스키마와 동기화된 TypeScript 타입 정의
 */

// ── 공통 ──

export interface ErrorDetail {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface ErrorResponse {
  error: ErrorDetail;
}

// ── Auth ──

export interface AuthVerifyRequest {
  id_token: string;
}

export interface UserInfo {
  id: string;
  email: string;
  name: string;
  profile_image: string | null;
}

export interface AuthVerifyResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: UserInfo;
}

// ── Models ──

export type ModelType = "image" | "video";
export type ProviderName = "google" | "openai" | "fal";

export interface AIModel {
  id: string;
  name: string;
  provider: ProviderName;
  type: ModelType;
  description: string;
  supported_params: string[];
  is_async: boolean;
}

export interface ModelListResponse {
  models: AIModel[];
}

// ── Generation ──

export type GenerationStatus = "pending" | "processing" | "completed" | "failed";
export type AspectRatio = "1:1" | "16:9" | "9:16" | "4:3" | "3:4";

export interface GenerateParams {
  aspect_ratio?: AspectRatio;
  style?: string;
  quality?: string;
  guidance_scale?: number;
  cfg_scale?: number;
  num_steps?: number;
  duration?: number;
  input_image_url?: string;
}

export interface GenerateRequest {
  model_id: string;
  prompt: string;
  negative_prompt?: string;
  params?: GenerateParams;
  is_public?: boolean;
}

export interface GenerationError {
  code: string;
  message: string;
}

export interface Generation {
  id: string;
  model_id: string;
  type: ModelType;
  status: GenerationStatus;
  prompt: string;
  progress: number | null;
  created_at: string;
  completed_at: string | null;
  result_url: string | null;
  thumbnail_url: string | null;
  aspect_ratio: string | null;
  error: GenerationError | null;
}

export interface GenerateResponse {
  generation: Generation;
}

export interface GenerationListResponse {
  generations: Generation[];
  next_cursor: string | null;
  has_more: boolean;
}

// ── Gallery ──

export interface GalleryUser {
  id: string;
  name: string;
  profile_image: string | null;
}

export interface GalleryItem {
  id: string;
  type: ModelType;
  model_id: string;
  model_name: string;
  prompt: string;
  result_url: string;
  thumbnail_url: string | null;
  aspect_ratio: string | null;
  created_at: string;
  user: GalleryUser;
  like_count: number;
  comment_count: number;
  is_liked: boolean;
}

export type GalleryItemDetail = GalleryItem;

export interface GalleryListResponse {
  items: GalleryItem[];
  next_cursor: string | null;
  has_more: boolean;
}

export interface LikeToggleResponse {
  is_liked: boolean;
  like_count: number;
}

// ── Comments ──

export interface CommentItem {
  id: number;
  content: string;
  created_at: string;
  user: GalleryUser;
}

export interface CommentListResponse {
  comments: CommentItem[];
  next_cursor: string | null;
  has_more: boolean;
}

// ── Image Upload ──

export interface ImageUploadResponse {
  url: string;
}

// ── Video Edit ──

export interface TrimRequest {
  source_url: string;
  start_time: number;
  end_time: number;
}

export interface TrimResponse {
  result_url: string;
  duration: number;
}

export interface VideoUploadResponse {
  url: string;
  duration: number;
  width: number;
  height: number;
}

export interface VideoInfoResponse {
  duration: number;
  width: number;
  height: number;
  fps: number;
}

export interface CaptureFrameRequest {
  source_url: string;
  timestamp: number;
}

export interface CaptureFrameResponse {
  image_url: string;
}

export interface MergeRequest {
  video_urls: string[];
}

export interface MergeResponse {
  result_url: string;
  duration: number;
}

export interface SpeedRequest {
  source_url: string;
  speed: number;
}

export interface SpeedResponse {
  result_url: string;
}

export interface ReverseRequest {
  source_url: string;
}

export interface ReverseResponse {
  result_url: string;
}

export interface FilterRequest {
  source_url: string;
  filter_name: string;
  params?: Record<string, number>;
}

export interface FilterResponse {
  result_url: string;
}

export interface TextOverlayRequest {
  source_url: string;
  text: string;
  position?: "top" | "center" | "bottom";
  font_size?: number;
  color?: string;
  start_time?: number;
  end_time?: number;
}

export interface TextOverlayResponse {
  result_url: string;
}

export interface WatermarkRequest {
  source_url: string;
  mode: "text" | "image";
  text?: string;
  image_url?: string;
  position?: "top-left" | "top-right" | "bottom-left" | "bottom-right" | "center";
  opacity?: number;
  font_size?: number;
  color?: string;
  image_scale?: number;
}

export interface WatermarkResponse {
  result_url: string;
}

export interface SubtitleItem {
  text: string;
  start_time: number;
  end_time: number;
  position?: "top" | "center" | "bottom";
  font_size?: number;
  color?: string;
  border_w?: number;
  border_color?: string;
  box_color?: string;
}

export interface SubtitlesRequest {
  source_url: string;
  subtitles: SubtitleItem[];
}

export interface SubtitlesResponse {
  result_url: string;
}

// 오디오
export interface ExtractAudioRequest { source_url: string; }
export interface ExtractAudioResponse { audio_url: string; }
export interface RemoveAudioRequest { source_url: string; }
export interface RemoveAudioResponse { result_url: string; }
export interface ReplaceAudioRequest { source_url: string; audio_url: string; }
export interface ReplaceAudioResponse { result_url: string; }
export interface AdjustVolumeRequest { source_url: string; volume: number; }
export interface AdjustVolumeResponse { result_url: string; }
export interface MixAudioRequest { source_url: string; audio_url: string; original_volume: number; mix_volume: number; }
export interface MixAudioResponse { result_url: string; }

export interface ChangeResolutionRequest { source_url: string; resolution: string; }
export interface ChangeResolutionResponse { result_url: string; }

export interface VideoToGifRequest { source_url: string; start_time?: number; end_time?: number; width?: number; fps?: number; }
export interface VideoToGifResponse { gif_url: string; }

export interface ExtractThumbnailsRequest { source_url: string; count?: number; }
export interface ExtractThumbnailsResponse { thumbnails: string[]; }

export interface CropRequest { source_url: string; x: number; y: number; width: number; height: number; }
export interface CropResponse { result_url: string; }

export interface LetterboxRequest { source_url: string; target_ratio: string; color?: string; }
export interface LetterboxResponse { result_url: string; }

export interface RotateRequest { source_url: string; transform: string; }
export interface RotateResponse { result_url: string; }

export interface ChangeFpsRequest { source_url: string; fps: number; }
export interface ChangeFpsResponse { result_url: string; }

// 장면 분할
export interface DetectScenesRequest { source_url: string; threshold?: number; min_scene_duration?: number; }
export interface SceneInfo { index: number; start: number; end: number; duration: number; }
export interface DetectScenesResponse { scenes: SceneInfo[]; }
export interface SplitSceneRequest { source_url: string; start_time: number; end_time: number; }
export interface SplitSceneResponse { result_url: string; }

// 크리에이티브 프리셋
export interface CreativePresetRequest { source_url: string; preset: string; params?: Record<string, string>; }
export interface CreativePresetResponse { result_url: string; }

// 쇼츠/릴스 변환
export interface ShortsConvertRequest { source_url: string; crop_x?: string; }
export interface ShortsConvertResponse { result_url: string; }

// 영상 콜라주
export interface CollageRequest { video_urls: string[]; layout?: string; output_width?: number; output_height?: number; }
export interface CollageResponse { result_url: string; }

// 비포/애프터
export interface BeforeAfterRequest { before_url: string; after_url: string; mode?: string; output_width?: number; output_height?: number; }
export interface BeforeAfterResponse { result_url: string; }

// 투표 오버레이
export interface PollQuestionItem { question: string; option_a: string; option_b: string; start: number; end: number; }
export interface PollOverlayRequest { source_url: string; questions: PollQuestionItem[]; text_color?: string; accent_color?: string; }
export interface PollOverlayResponse { result_url: string; }

// 퀴즈 오버레이
export interface QuizQuestionItem { question: string; choices: string[]; answer_index: number; start: number; end: number; reveal_after: number; }
export interface QuizOverlayRequest { source_url: string; questions: QuizQuestionItem[]; text_color?: string; }
export interface QuizOverlayResponse { result_url: string; }

// 일괄 다운로드
export interface BulkDownloadRequest { urls: string[]; filenames?: string[]; }

// ── Compose ──

export interface ComposeRequest {
  baseImageUrl: string;
  referenceImageUrl: string;
  prompt: string;
}

export interface ComposeResponse {
  resultUrl: string;
}

export interface SaveEditRequest {
  result_url: string;
  edit_type: string;
  prompt?: string;
  params_json?: string;
  is_public?: boolean;
}

export interface SaveEditResponse {
  id: string;
  result_url: string;
}
