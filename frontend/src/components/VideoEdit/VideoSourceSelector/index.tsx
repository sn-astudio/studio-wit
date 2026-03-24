"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Download, Upload, Loader2, Plus } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/Button";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/Tooltip";
import { TooltipProvider } from "@/components/ui/Tooltip";
import { useGenerationHistory } from "@/hooks/queries/useGeneration";
import { useUploadVideo } from "@/hooks/queries/useVideoEdit";
import { downloadVideo } from "../utils";
import type { VideoSourceSelectorProps } from "./types";

export function VideoSourceSelector({
  onSourceSelected,
  isLoading,
  mergeMode,
  onAddToMerge,
  onSelectVideo,
}: VideoSourceSelectorProps) {
  const t = useTranslations("VideoEdit");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadMutation = useUploadVideo();
  const [modelFilter, setModelFilter] = useState<string>("all");

  const {
    data: historyData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useGenerationHistory({
    type: "video",
    status: "completed",
    limit: 20,
  });

  const observerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = observerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const allGenerations =
    historyData?.pages.flatMap((p) => p.generations) ?? [];

  // 사용 가능한 모델 목록 추출
  const availableModels = [
    ...new Set(allGenerations.map((g) => g.model_id)),
  ];

  // 모델 필터 적용
  const completedVideos =
    modelFilter === "all"
      ? allGenerations
      : allGenerations.filter((g) => g.model_id === modelFilter);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      e.target.value = "";

      try {
        const result = await uploadMutation.mutateAsync(file);
        onSourceSelected({
          url: result.url,
          duration: result.duration,
          width: result.width,
          height: result.height,
          name: file.name,
        });
      } catch {
        // TODO: toast error
      }
    },
    [uploadMutation, onSourceSelected],
  );

  const uploading = uploadMutation.isPending || isLoading;

  return (
    <div className="space-y-3">
      {/* 업로드 버튼 */}
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
        >
          {uploading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Upload className="size-4" />
          )}
          {t("uploadVideo")}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={handleFileChange}
        />
        <span className="text-xs text-zinc-500">{t("orSelectFromHistory")}</span>
      </div>

      {/* 모델 필터 */}
      {availableModels.length > 1 && (
        <div className="flex items-center gap-0.5 rounded-lg bg-zinc-800/60 p-0.5">
          <button
            onClick={() => setModelFilter("all")}
            className={`rounded-md px-2.5 py-1 text-xs transition-colors ${
              modelFilter === "all"
                ? "bg-zinc-700 text-zinc-100"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            {t("filterAll")}
          </button>
          {availableModels.map((model) => (
            <button
              key={model}
              onClick={() => setModelFilter(model)}
              className={`rounded-md px-2.5 py-1 text-xs transition-colors ${
                modelFilter === model
                  ? "bg-zinc-700 text-zinc-100"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {model}
            </button>
          ))}
        </div>
      )}

      {completedVideos.length > 0 && (
        <>
          {mergeMode && (
            <p className="flex items-center gap-1.5 text-xs text-primary">
              <Plus className="size-3" />
              {t("clickToAddClip")}
            </p>
          )}
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
            {completedVideos.map((gen) => (
              <div
                key={gen.id}
                role="button"
                tabIndex={0}
                onClick={() => {
                  if (onSelectVideo) {
                    onSelectVideo(gen.result_url!, gen.prompt);
                  } else if (mergeMode && onAddToMerge) {
                    onAddToMerge(gen.result_url!, gen.prompt.slice(0, 30));
                  } else {
                    onSourceSelected({
                      url: gen.result_url!,
                      duration: 0,
                      width: 0,
                      height: 0,
                      name: gen.prompt.slice(0, 30),
                    });
                  }
                }}
                onMouseEnter={(e) => {
                  const video = e.currentTarget.querySelector("video");
                  video?.play().catch(() => {});
                }}
                onMouseLeave={(e) => {
                  const video = e.currentTarget.querySelector("video");
                  if (video) {
                    video.pause();
                    video.currentTime = 0;
                  }
                }}
                className={`group relative aspect-video cursor-pointer overflow-hidden rounded-lg border transition-colors ${
                  mergeMode
                    ? "border-primary/30 hover:border-primary"
                    : "border-zinc-800 hover:border-zinc-600"
                }`}
              >
                <video
                  src={gen.result_url!}
                  poster={gen.thumbnail_url ?? undefined}
                  preload="metadata"
                  className="absolute inset-0 size-full object-cover"
                  muted
                  loop
                  playsInline
                />
                {/* 합치기 모드: + 오버레이 */}
                {mergeMode && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity group-hover:opacity-100">
                    <Plus className="size-6 text-primary" />
                  </div>
                )}
                {/* 다운로드 버튼 */}
                <TooltipProvider delay={200}>
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            downloadVideo(gen.result_url!, `${gen.model_id}_${gen.id.slice(0, 8)}.mp4`);
                          }}
                          className="absolute top-1.5 right-1.5 flex size-7 cursor-pointer items-center justify-center rounded-full bg-black/60 text-zinc-200 opacity-0 transition-opacity hover:bg-black/80 hover:text-white group-hover:opacity-100"
                        />
                      }
                    >
                      <Download className="size-4" />
                    </TooltipTrigger>
                    <TooltipContent>{t("download")}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-1.5 pt-4 opacity-0 transition-opacity group-hover:opacity-100">
                  <p className="truncate text-[9px] text-zinc-300">
                    {gen.prompt}
                  </p>
                </div>
              </div>
            ))}
          </div>
          {/* 무한 스크롤 트리거 */}
          <div ref={observerRef} className="h-1" />
          {isFetchingNextPage && (
            <div className="flex justify-center py-2">
              <Loader2 className="size-4 animate-spin text-zinc-500" />
            </div>
          )}
        </>
      )}
    </div>
  );
}
