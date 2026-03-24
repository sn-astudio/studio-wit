"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Clock, Film, Loader2 } from "lucide-react";

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
    <div className="flex flex-1 flex-col overflow-hidden border-t border-zinc-800/80">
      <div className="flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-1.5">
          <Clock className="size-3 text-zinc-600" />
          <span className="text-[11px] font-medium text-zinc-500">
            {t("recentGenerations")}
          </span>
        </div>
        {hasItems && onToggleExpand && (
          <button
            onClick={onToggleExpand}
            className="cursor-pointer text-[11px] text-zinc-600 transition-colors hover:text-zinc-400"
          >
            {expanded ? t("showLess") : t("viewAll")}
          </button>
        )}
      </div>

      {/* 모델 필터 */}
      {hasItems && availableModels.length > 1 && (
        <div className="flex items-center gap-0.5 px-4 pb-2">
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
        </div>
      )}

      {!hasItems ? (
        <div className="flex w-full items-center justify-center py-6">
          <div className="text-center">
            <Film className="mx-auto size-6 text-zinc-800" />
            <p className="mt-1.5 text-xs text-zinc-600">{t("noHistory")}</p>
          </div>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-3">
          <div className="columns-2 gap-2 sm:columns-3 lg:columns-4">
            {generations.map((gen) => (
              <div key={gen.id} className="mb-2 break-inside-avoid">
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
