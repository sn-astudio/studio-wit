"use client";

import { useTranslations } from "next-intl";
import { Clock, Film } from "lucide-react";

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

  const { data } = useGenerationHistory(
    token ? { type: "video", limit: 12 } : undefined,
  );

  const generations =
    data?.pages.flatMap((page) => page.generations) ?? [];

  const hasItems = token && generations.length > 0;

  return (
    <div className={`border-t border-zinc-800/80 ${expanded ? "flex flex-1 flex-col overflow-hidden" : ""}`}>
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

      {!hasItems ? (
        <div className="flex w-full items-center justify-center py-6">
          <div className="text-center">
            <Film className="mx-auto size-6 text-zinc-800" />
            <p className="mt-1.5 text-xs text-zinc-600">{t("noHistory")}</p>
          </div>
        </div>
      ) : expanded ? (
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-3">
          <div className="columns-3 gap-1.5 sm:columns-4 lg:columns-6">
            {generations.map((gen) => (
              <div key={gen.id} className="mb-1.5 break-inside-avoid">
                <HistoryCard gen={gen} onSelect={onSelect} />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto px-4 pb-3">
          <div className="grid auto-cols-[8rem] grid-rows-[4.5rem_4.5rem] gap-1.5 [grid-auto-flow:column_dense] sm:auto-cols-[10rem] sm:grid-rows-[5.625rem_5.625rem]">
            {generations.map((gen) => {
              const isVertical = gen.aspect_ratio === "9:16";
              return (
                <div key={gen.id} className={isVertical ? "row-span-2" : ""}>
                  <HistoryCard gen={gen} onSelect={onSelect} />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
