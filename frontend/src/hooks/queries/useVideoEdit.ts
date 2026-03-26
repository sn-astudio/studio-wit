import { useMutation, useQueryClient } from "@tanstack/react-query";
import { videoEditApi } from "@/services/api";
import type {
  CaptureFrameRequest,
  FilterRequest,
  MergeRequest,
  ReverseRequest,
  SpeedRequest,
  TrimRequest,
  TextOverlayRequest,
  WatermarkRequest,
  SubtitlesRequest,
  ExtractAudioRequest,
  RemoveAudioRequest,
  ReplaceAudioRequest,
  AdjustVolumeRequest,
  MixAudioRequest,
  ChangeResolutionRequest,
  VideoToGifRequest,
  ExtractThumbnailsRequest,
  RotateRequest,
  ChangeFpsRequest,
  CropRequest,
  LetterboxRequest,
  DetectScenesRequest,
  SplitSceneRequest,
  SaveEditRequest,
} from "@/types/api";
import { queryKeys } from "./keys";

export function useTrimVideo() {
  return useMutation({
    mutationFn: (body: TrimRequest) => videoEditApi.trim(body),
  });
}

export function useUploadVideo() {
  return useMutation({
    mutationFn: (file: File) => videoEditApi.upload(file),
  });
}

export function useCaptureFrame() {
  return useMutation({
    mutationFn: (body: CaptureFrameRequest) => videoEditApi.captureFrame(body),
  });
}

export function useMergeVideos() {
  return useMutation({
    mutationFn: (body: MergeRequest) => videoEditApi.merge(body),
  });
}

export function useSpeedVideo() {
  return useMutation({
    mutationFn: (body: SpeedRequest) => videoEditApi.speed(body),
  });
}

export function useReverseVideo() {
  return useMutation({
    mutationFn: (body: ReverseRequest) => videoEditApi.reverse(body),
  });
}

export function useFilterVideo() {
  return useMutation({
    mutationFn: (body: FilterRequest) => videoEditApi.filter(body),
  });
}

export function useTextOverlayVideo() {
  return useMutation({
    mutationFn: (body: TextOverlayRequest) => videoEditApi.textOverlay(body),
  });
}

export function useWatermarkVideo() {
  return useMutation({
    mutationFn: (body: WatermarkRequest) => videoEditApi.watermark(body),
  });
}

export function useSubtitlesVideo() {
  return useMutation({
    mutationFn: (body: SubtitlesRequest) => videoEditApi.subtitles(body),
  });
}

export function useExtractAudio() {
  return useMutation({
    mutationFn: (body: ExtractAudioRequest) => videoEditApi.extractAudio(body),
  });
}

export function useRemoveAudio() {
  return useMutation({
    mutationFn: (body: RemoveAudioRequest) => videoEditApi.removeAudio(body),
  });
}

export function useReplaceAudio() {
  return useMutation({
    mutationFn: (body: ReplaceAudioRequest) => videoEditApi.replaceAudio(body),
  });
}

export function useAdjustVolume() {
  return useMutation({
    mutationFn: (body: AdjustVolumeRequest) => videoEditApi.adjustVolume(body),
  });
}

export function useMixAudio() {
  return useMutation({
    mutationFn: (body: MixAudioRequest) => videoEditApi.mixAudio(body),
  });
}

export function useChangeResolution() {
  return useMutation({
    mutationFn: (body: ChangeResolutionRequest) => videoEditApi.changeResolution(body),
  });
}

export function useVideoToGif() {
  return useMutation({
    mutationFn: (body: VideoToGifRequest) => videoEditApi.videoToGif(body),
  });
}

export function useExtractThumbnails() {
  return useMutation({
    mutationFn: (body: ExtractThumbnailsRequest) => videoEditApi.extractThumbnails(body),
  });
}

export function useChangeFps() {
  return useMutation({
    mutationFn: (body: ChangeFpsRequest) => videoEditApi.changeFps(body),
  });
}

export function useRotateVideo() {
  return useMutation({
    mutationFn: (body: RotateRequest) => videoEditApi.rotate(body),
  });
}

export function useCropVideo() {
  return useMutation({
    mutationFn: (body: CropRequest) => videoEditApi.crop(body),
  });
}

export function useLetterbox() {
  return useMutation({
    mutationFn: (body: LetterboxRequest) => videoEditApi.letterbox(body),
  });
}

export function useDetectScenes() {
  return useMutation({
    mutationFn: (body: DetectScenesRequest) => videoEditApi.detectScenes(body),
  });
}

export function useSplitScene() {
  return useMutation({
    mutationFn: (body: SplitSceneRequest) => videoEditApi.splitScene(body),
  });
}

export function useSaveEdit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: SaveEditRequest) => videoEditApi.saveEdit(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.generation.all });
    },
  });
}
