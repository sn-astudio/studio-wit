"use client";

import { useTranslations } from "next-intl";
import { Clock, ImageIcon } from "lucide-react";

import { useAuthStore } from "@/stores/auth";
import { useGenerationHistory } from "@/hooks/queries/useGeneration";

import type { GenerationHistoryProps } from "./types";
import { HistoryCard } from "./HistoryCard";

export function GenerationHistory({
  onSelect,
  expanded = false,
  onToggleExpand,
}: GenerationHistoryProps) {
  const t = useTranslations("ImageCreate");
  const token = useAuthStore((s) => s.token);

  const { data } = useGenerationHistory(
    token ? { type: "image", limit: 12 } : undefined,
  );

  const generations =
    data?.pages.flatMap((page) => page.generations) ?? [];

  const hasItems = token && generations.length > 0;

  return (
    <div
      className={`border-t border-border/60 ${expanded ? "flex flex-1 flex-col overflow-hidden" : ""}`}
    >
      <div className="flex items-center justify-between px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2">
          <Clock className="size-3.5 text-muted-foreground/50" />
          <span className="text-xs font-medium tracking-wide text-muted-foreground">
            {t("recentGenerations")}
          </span>
        </div>
        {hasItems && onToggleExpand && (
          <button
            onClick={onToggleExpand}
            className="cursor-pointer text-xs font-medium text-muted-foreground/60 transition-colors hover:text-foreground"
          >
            {expanded ? t("showLess") : t("viewAll")}
          </button>
        )}
      </div>

      {!hasItems ? (
        <div className="flex w-full items-center justify-center py-10">
          <div className="text-center">
            <ImageIcon className="mx-auto size-8 text-muted-foreground/20" />
            <p className="mt-3 text-sm text-muted-foreground/50">{t("noHistory")}</p>
          </div>
        </div>
      ) : (
        <div className={expanded ? "min-h-0 flex-1 overflow-y-auto" : ""}>
          <div
            className={`grid gap-3 px-4 pb-5 sm:px-6 [grid-auto-flow:dense] ${
              expanded
                ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
                : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4"
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
