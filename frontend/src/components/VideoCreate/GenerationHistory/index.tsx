"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Clock, Download, Film, Loader2, X } from "lucide-react";
import { toast } from "sonner";

import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
} from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { useAuthStore } from "@/stores/auth";
import { useGenerationHistory } from "@/hooks/queries/useGeneration";
import { videoEditApi } from "@/services/api";

import type { GenerationHistoryProps } from "./types";
import { HistoryCard } from "./HistoryCard";

export function GenerationHistory({
  onSelect,
  expanded = false,
  onToggleExpand,
}: GenerationHistoryProps) {
  const t = useTranslations("VideoCreate");
  const token = useAuthStore((s) => s.token);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useGenerationHistory(
    token ? { type: "video", limit: 20 } : undefined,
  );

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

  const [modelFilter, setModelFilter] = useState<string>("all");
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

  const handleSelect = useCallback(
    (gen: import("@/types/api").Generation) => {
      if (selectMode) {
        toggleSelect(gen.id);
        return;
      }
      onSelect?.(gen);
      if (expanded && onToggleExpand) {
        onToggleExpand();
      }
    },
    [onSelect, expanded, onToggleExpand, selectMode, toggleSelect],
  );

  const allGenerations =
    data?.pages
      .flatMap((page) => page.generations)
      .filter((g) => g.status !== "failed") ?? [];

  const availableModels = [...new Set(allGenerations.map((g) => g.model_id))];

  const handleBulkDownload = useCallback(async () => {
    const selected = allGenerations.filter(
      (g) => selectedIds.has(g.id) && g.result_url,
    );
    if (selected.length === 0) return;

    setIsBulkDownloading(true);
    try {
      const blob = await videoEditApi.bulkDownload({
        urls: selected.map((g) => g.result_url!),
        filenames: selected.map(
          (g, i) => `${g.model_id}_${i + 1}.mp4`,
        ),
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `videos_${selected.length}.zip`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
      toast.success(t("bulkDownloadSuccess", { count: selected.length }));
      setSelectMode(false);
      setSelectedIds(new Set());
    } catch {
      toast.error(t("bulkDownloadError"));
    } finally {
      setIsBulkDownloading(false);
    }
  }, [allGenerations, selectedIds, t]);

  const generations =
    modelFilter === "all"
      ? allGenerations
      : allGenerations.filter((g) => g.model_id === modelFilter);

  const hasItems = token && allGenerations.length > 0;

  return (
    <div className="border-t border-zinc-300 dark:border-zinc-800/80">
      <div className="flex items-center justify-between px-2.5 py-1.5 sm:px-4 sm:py-2">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <Clock className="size-3 text-zinc-600 dark:text-zinc-600" />
            <span className="text-[11px] font-medium text-zinc-500">
              {t("recentGenerations")}
            </span>
          </div>
          {/* 모델 필터 셀렉트 */}
          {hasItems && availableModels.length > 1 && (
            <Select
              value={modelFilter}
              onValueChange={setModelFilter}
            >
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
          {hasItems && (
            <button
              onClick={() => {
                setSelectMode((v) => !v);
                setSelectedIds(new Set());
              }}
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
          {hasItems && onToggleExpand && (
            <button
              onClick={onToggleExpand}
              className="cursor-pointer text-[11px] font-medium text-primary/80 transition-colors hover:text-primary dark:text-primary/70 dark:hover:text-primary"
            >
              {expanded ? t("showLess") : t("viewAll")}
            </button>
          )}
        </div>
      </div>

      {!hasItems ? (
        <div className="flex w-full items-center justify-center py-6">
          <div className="text-center">
            <Film className="mx-auto size-6 text-zinc-300 dark:text-zinc-800" />
            <p className="mt-1.5 text-xs text-zinc-600 dark:text-zinc-600">{t("noHistory")}</p>
          </div>
        </div>
      ) : (
        <div className="px-2.5 pb-3 sm:px-4">
          <div className="grid grid-cols-2 gap-1.5 sm:columns-3 sm:block sm:gap-2">
            {generations.map((gen) => (
              <div key={gen.id} className="relative sm:mb-2 sm:break-inside-avoid">
                {selectMode && (
                  <button
                    onClick={() => toggleSelect(gen.id)}
                    className={`absolute top-1 left-1 z-10 flex size-5 items-center justify-center rounded border-2 transition-colors ${
                      selectedIds.has(gen.id)
                        ? "border-primary bg-primary text-white"
                        : "border-zinc-300 bg-black/40 dark:border-zinc-600"
                    }`}
                  >
                    {selectedIds.has(gen.id) && <Check className="size-3" />}
                  </button>
                )}
                <HistoryCard gen={gen} onSelect={handleSelect} />
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
          <div ref={observerRef} className="h-1" />
          {isFetchingNextPage && (
            <div className="flex justify-center py-2">
              <Loader2 className="size-4 animate-spin text-zinc-500" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
