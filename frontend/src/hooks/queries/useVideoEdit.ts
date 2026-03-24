import { useMutation, useQueryClient } from "@tanstack/react-query";
import { videoEditApi } from "@/services/api";
import type {
  CaptureFrameRequest,
  FilterRequest,
  MergeRequest,
  ReverseRequest,
  SpeedRequest,
  TrimRequest,
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

export function useSaveEdit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: SaveEditRequest) => videoEditApi.saveEdit(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.generation.all });
    },
  });
}
