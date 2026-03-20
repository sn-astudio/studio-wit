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
      ) : (
        <div className={expanded ? "min-h-0 flex-1 overflow-y-auto" : ""}>
          <div
            className={`grid gap-2.5 px-4 pb-3 [grid-auto-flow:dense] ${
              expanded
                ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4"
                : "grid-cols-2 sm:grid-cols-3"
            }`}
          >
            {generations.map((gen) => (
              <HistoryCard key={gen.id} gen={gen} onSelect={onSelect} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
