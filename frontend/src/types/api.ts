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
  num_steps?: number;
  duration?: number;
  input_image_url?: string;
}

export interface GenerateRequest {
  model_id: string;
  prompt: string;
  negative_prompt?: string;
  params?: GenerateParams;
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
  created_at: string;
  user: GalleryUser;
  like_count: number;
  is_liked: boolean;
}

export interface GalleryListResponse {
  items: GalleryItem[];
  next_cursor: string | null;
  has_more: boolean;
}

export interface LikeToggleResponse {
  is_liked: boolean;
  like_count: number;
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

export interface SaveEditRequest {
  result_url: string;
  edit_type: string;
  prompt?: string;
  params_json?: string;
}

export interface SaveEditResponse {
  id: string;
  result_url: string;
}
