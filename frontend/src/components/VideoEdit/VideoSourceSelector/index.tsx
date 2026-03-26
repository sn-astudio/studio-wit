"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Download,
  Upload,
  Loader2,
  Plus,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Button } from "@/components/ui/Button";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
} from "@/components/ui/Select";
import { useGenerationHistory } from "@/hooks/queries/useGeneration";
import { useUploadVideo } from "@/hooks/queries/useVideoEdit";
import { videoEditApi } from "@/services/api";
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
  const [isExpanded, setIsExpanded] = useState(true);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkDownloading, setIsBulkDownloading] = useState(false);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

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

  const availableModels = [
    ...new Set(allGenerations.map((g) => g.model_id)),
  ];

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
        if (mergeMode && onAddToMerge) {
          onAddToMerge(result.url, file.name);
        } else {
          onSourceSelected({
            url: result.url,
            duration: result.duration,
            width: result.width,
            height: result.height,
            name: file.name,
          });
        }
      } catch {
        toast.error(t("uploadError"));
      }
    },
    [uploadMutation, onSourceSelected, mergeMode, onAddToMerge],
  );

  const handleSelectVideo = useCallback(
    (gen: (typeof allGenerations)[0]) => {
      if (selectMode) {
        toggleSelect(gen.id);
        return;
      }
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
    },
    [onSelectVideo, mergeMode, onAddToMerge, onSourceSelected, selectMode, toggleSelect],
  );

  const handleBulkDownload = useCallback(async () => {
    const selected = allGenerations.filter(
      (g) => selectedIds.has(g.id) && g.result_url,
    );
    if (selected.length === 0) return;
    setIsBulkDownloading(true);
    try {
      const blob = await videoEditApi.bulkDownload({
        urls: selected.map((g) => g.result_url!),
        filenames: selected.map((g, i) => `${g.model_id}_${i + 1}.mp4`),
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `videos_${selected.length}.zip`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
      toast.success(t("bulkDownloadSuccess", { count: selected.length }));
      setSelectMode(false);
      setSelectedIds(new Set());
    } catch {
      toast.error(t("bulkDownloadError"));
    } finally {
      setIsBulkDownloading(false);
    }
  }, [allGenerations, selectedIds, t]);

  const uploading = uploadMutation.isPending || isLoading;
  const hasItems = completedVideos.length > 0;

  return (
    <div className="space-y-2">
      {/* 헤더: 업로드 + 필터 + 접기 */}
      <div className="flex items-center justify-between px-0.5">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1.5 text-xs"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Upload className="size-3.5" />
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

          {/* 모델 필터 */}
          {hasItems && availableModels.length > 1 && (
            <Select value={modelFilter} onValueChange={setModelFilter}>
              <SelectTrigger className="h-6 w-auto min-w-[80px] gap-1 border-zinc-400 bg-zinc-100/60 px-2 text-[11px] dark:border-zinc-700 dark:bg-zinc-800/60">
                {modelFilter === "all" ? t("filterAll") : modelFilter}
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("filterAll")}</SelectItem>
                {availableModels.map((model) => (
                  <SelectItem key={model} value={model}>
                    {model}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="flex items-center gap-2">
          {hasItems && !mergeMode && (
            <button
              onClick={() => { setSelectMode((v) => !v); setSelectedIds(new Set()); }}
              className={`flex items-center gap-1 text-[11px] font-medium transition-colors ${
                selectMode
                  ? "text-primary"
                  : "text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
              }`}
            >
              {selectMode ? <X className="size-3" /> : <Download className="size-3" />}
              {selectMode ? t("cancelSelect") : t("bulkDownload")}
            </button>
          )}
          {hasItems && (
            <button
              onClick={() => setIsExpanded((v) => !v)}
              className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
            >
              {isExpanded ? (
                <ChevronUp className="size-3.5" />
              ) : (
                <ChevronDown className="size-3.5" />
              )}
              {completedVideos.length}
            </button>
          )}
        </div>
      </div>

      {/* 그리드 */}
      {hasItems && isExpanded && (
        <>
          {mergeMode && (
            <p className="flex items-center gap-1.5 text-xs text-primary">
              <Plus className="size-3" />
              {t("clickToAddClip")}
            </p>
          )}
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4 lg:grid-cols-5 sm:gap-2">
            {completedVideos.map((gen) => (
              <div
                key={gen.id}
                role="button"
                tabIndex={0}
                onClick={() => handleSelectVideo(gen)}
                className="relative"
              >
                {selectMode && (
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleSelect(gen.id); }}
                    className={`absolute top-1 left-1 z-10 flex size-5 items-center justify-center rounded border-2 transition-colors ${
                      selectedIds.has(gen.id)
                        ? "border-primary bg-primary text-white"
                        : "border-zinc-300 bg-black/40 dark:border-zinc-600"
                    }`}
                  >
                    {selectedIds.has(gen.id) && <Check className="size-3" />}
                  </button>
                )}
              <div
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
                    : "border-zinc-200 hover:border-zinc-400 dark:border-zinc-800 dark:hover:border-zinc-600"
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
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    downloadVideo(
                      gen.result_url!,
                      `${gen.model_id}_${gen.id.slice(0, 8)}.mp4`,
                    );
                  }}
                  className="absolute top-1 right-1 z-10 flex size-6 cursor-pointer items-center justify-center rounded-full bg-black/60 text-zinc-200 opacity-100 hover:bg-black/80 hover:text-white sm:top-1.5 sm:right-1.5 sm:size-7 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100"
                >
                  <Download className="size-3 sm:size-4" />
                </button>
                {/* 프롬프트 오버레이 */}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-1 pt-3 sm:p-1.5 sm:pt-4 sm:opacity-0 sm:transition-opacity sm:duration-200 sm:group-hover:opacity-100">
                  <p className="truncate text-[9px] text-zinc-300 sm:text-[10px]">
                    {gen.prompt}
                  </p>
                </div>
              </div>
              </div>
            ))}
          </div>
          {/* 선택 모드 하단 바 (fixed) */}
          {selectMode && selectedIds.size > 0 && (
            <div className="fixed inset-x-0 bottom-0 z-50 border-t border-zinc-200 bg-background/95 px-4 py-2.5 backdrop-blur-sm dark:border-zinc-800">
              <div className="mx-auto flex max-w-screen-xl items-center justify-between">
                <span className="text-xs font-medium text-primary">
                  {t("selectedCount", { count: selectedIds.size })}
                </span>
                <Button
                  size="sm"
                  className="gap-1.5"
                  onClick={handleBulkDownload}
                  disabled={isBulkDownloading}
                >
                  {isBulkDownloading ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Download className="size-3.5" />
                  )}
                  {t("downloadZip")}
                </Button>
              </div>
            </div>
          )}
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
