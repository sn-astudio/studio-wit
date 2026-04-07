"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Film, Loader2, Upload, X } from "lucide-react";
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
import type { Generation } from "@/types/api";
import type { HistorySelectModalProps } from "./types";

export function HistorySelectModal({
  isOpen,
  onClose,
  onSelect,
  onMultiSelect,
  multiSelect,
}: HistorySelectModalProps) {
  const t = useTranslations("VideoEdit");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadMutation = useUploadVideo();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
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

  const apiGenerations =
    historyData?.pages.flatMap((p) => p.generations) ?? [];

  // localStorage mock video generations
  const [mockGenerations] = useState<Generation[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const saved = localStorage.getItem("mock-video-generations");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const allGenerations = [...mockGenerations, ...apiGenerations];

  const availableModels = [...new Set(allGenerations.map((g) => g.model_id))];

  const filteredGenerations =
    modelFilter === "all"
      ? allGenerations
      : allGenerations.filter((g) => g.model_id === modelFilter);

  // 무한 스크롤
  const observerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = observerRef.current;
    if (!el || !isOpen) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage)
          fetchNextPage();
      },
      { threshold: 0.1 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, isOpen]);

  // 모달 닫을 때 초기화
  useEffect(() => {
    if (!isOpen) {
      setSelectedIds(new Set());
      setModelFilter("all");
    }
  }, [isOpen]);

  // ESC 닫기
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSingleSelect = useCallback(
    async (gen: (typeof allGenerations)[number]) => {
      onSelect?.({
        url: gen.result_url!,
        duration: 0,
        width: 0,
        height: 0,
        name: gen.prompt?.slice(0, 30) || gen.model_id,
        aspectRatio: gen.aspect_ratio ?? undefined,
      });
      onClose();
    },
    [onSelect, onClose],
  );

  const handleMultiConfirm = useCallback(() => {
    const selected = allGenerations
      .filter((g) => selectedIds.has(g.id))
      .map((g) => ({
        url: g.result_url!,
        name: g.prompt?.slice(0, 30) || g.model_id,
      }));
    onMultiSelect?.(selected);
    onClose();
  }, [allGenerations, selectedIds, onMultiSelect, onClose]);

  const handleFileUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      e.target.value = "";
      try {
        const result = await uploadMutation.mutateAsync(file);
        if (multiSelect) {
          onMultiSelect?.([{ url: result.url, name: file.name }]);
        } else {
          onSelect?.({
            url: result.url,
            duration: result.duration,
            width: result.width,
            height: result.height,
            name: file.name,
          });
        }
        onClose();
      } catch {
        toast.error(t("uploadError"));
      }
    },
    [uploadMutation, multiSelect, onSelect, onMultiSelect, onClose, t],
  );

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="mx-4 flex h-[80vh] w-full max-w-2xl flex-col rounded-2xl border-2 border-neutral-200 bg-white shadow-lg dark:border-neutral-800/80 dark:bg-neutral-950/95"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4 dark:border-neutral-800/60">
          <h3 className="text-base font-semibold text-foreground">
            {multiSelect ? t("selectVideosForMerge") : t("selectVideo")}
          </h3>
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={handleFileUpload}
            />
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadMutation.isPending}
            >
              {uploadMutation.isPending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Upload className="size-3.5" />
              )}
              {t("uploadVideo")}
            </Button>
            <button
              onClick={onClose}
              className="flex size-9 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-neutral-100 hover:text-foreground dark:hover:bg-neutral-800"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>

        {/* 모델 필터 */}
        {availableModels.length > 1 && (
          <div className="border-b border-neutral-200 px-5 py-3 dark:border-neutral-800">
            <Select value={modelFilter} onValueChange={setModelFilter}>
              <SelectTrigger className="h-9 w-full">
                <span className="text-sm">
                  {modelFilter === "all" ? t("filterAll") : modelFilter}
                </span>
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
          </div>
        )}

        {/* 비디오 그리드 */}
        <div className="flex-1 overflow-y-auto p-4">
          {filteredGenerations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-neutral-500">
              <Film className="mb-3 size-12" />
              <p className="text-sm">{t("noVideos")}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {filteredGenerations
                .filter((g) => g.result_url)
                .map((gen) => (
                  <button
                    key={gen.id}
                    onClick={() =>
                      multiSelect
                        ? toggleSelect(gen.id)
                        : handleSingleSelect(gen)
                    }
                    className={`group relative overflow-hidden rounded-xl border transition-all ${
                      selectedIds.has(gen.id)
                        ? "border-primary ring-2 ring-primary/30"
                        : "border-neutral-200 hover:border-neutral-400 dark:border-neutral-700 dark:hover:border-neutral-500"
                    }`}
                  >
                    <video
                      src={gen.result_url!}
                      className="aspect-video w-full object-cover"
                      muted
                      preload="metadata"
                      onMouseEnter={(e) =>
                        (e.target as HTMLVideoElement)
                          .play()
                          .catch(() => {})
                      }
                      onMouseLeave={(e) => {
                        const v = e.target as HTMLVideoElement;
                        v.pause();
                        v.currentTime = 0;
                      }}
                    />
                    {multiSelect && selectedIds.has(gen.id) && (
                      <div className="absolute top-2 right-2 flex size-6 items-center justify-center rounded-full bg-primary text-white">
                        <Check className="size-3.5" />
                      </div>
                    )}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                      <p className="truncate text-[11px] text-white">
                        {gen.prompt?.slice(0, 40) || gen.model_id}
                      </p>
                    </div>
                  </button>
                ))}
              <div ref={observerRef} className="h-4" />
            </div>
          )}
        </div>

        {/* 다중 선택 확인 버튼 */}
        {multiSelect && selectedIds.size > 0 && (
          <div className="border-t border-neutral-200 px-5 py-3 dark:border-neutral-800">
            <Button className="w-full" onClick={handleMultiConfirm}>
              {t("selectedCount", { count: selectedIds.size })}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
