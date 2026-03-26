"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Clock, Film, Loader2 } from "lucide-react";

import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
} from "@/components/ui/Select";
import { useAuthStore } from "@/stores/auth";
import { useGenerationHistory } from "@/hooks/queries/useGeneration";

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

  const handleSelect = useCallback(
    (gen: import("@/types/api").Generation) => {
      onSelect?.(gen);
      if (expanded && onToggleExpand) {
        onToggleExpand();
      }
    },
    [onSelect, expanded, onToggleExpand],
  );

  const allGenerations =
    data?.pages
      .flatMap((page) => page.generations)
      .filter((g) => g.status !== "failed") ?? [];

  const availableModels = [...new Set(allGenerations.map((g) => g.model_id))];

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
        {hasItems && onToggleExpand && (
          <button
            onClick={onToggleExpand}
            className="cursor-pointer text-[11px] font-medium text-primary/80 transition-colors hover:text-primary dark:text-primary/70 dark:hover:text-primary"
          >
            {expanded ? t("showLess") : t("viewAll")}
          </button>
        )}
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
          <div className="grid grid-cols-2 gap-1.5 sm:columns-3 sm:block sm:gap-2 lg:columns-4">
            {generations.map((gen) => (
              <div key={gen.id} className="sm:mb-2 sm:break-inside-avoid">
                <HistoryCard gen={gen} onSelect={handleSelect} />
              </div>
            ))}
          </div>
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
