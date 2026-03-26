"use client";

import { Scissors, RotateCcw, Download, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/Button";

import { formatTime } from "../VideoTimeline/utils";
import type { TrimControlsProps } from "./types";

export function TrimControls({
  trimStart,
  trimEnd,
  duration,
  isTrimming,
  onTrim,
  onReset,
}: TrimControlsProps) {
  const t = useTranslations("VideoEdit");

  const trimDuration = trimEnd - trimStart;
  const isFullRange = trimStart === 0 && trimEnd >= duration - 0.1;

  return (
    <div className="flex flex-col gap-2 rounded-xl bg-zinc-100/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-0 dark:bg-zinc-900/60">
      <div className="flex items-center gap-4">
        <div className="space-y-0.5">
          <span className="text-[10px] text-zinc-500">{t("trimStart")}</span>
          <p className="font-mono text-sm text-zinc-700 dark:text-zinc-200">
            {formatTime(trimStart)}
          </p>
        </div>
        <div className="text-zinc-600 dark:text-zinc-600">→</div>
        <div className="space-y-0.5">
          <span className="text-[10px] text-zinc-500">{t("trimEnd")}</span>
          <p className="font-mono text-sm text-zinc-700 dark:text-zinc-200">
            {formatTime(trimEnd)}
          </p>
        </div>
        <div className="ml-2 space-y-0.5">
          <span className="text-[10px] text-zinc-500">
            {t("trimDuration")}
          </span>
          <p className="font-mono text-sm text-primary">
            {formatTime(trimDuration)}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="flex-1 gap-1.5 sm:flex-none"
          onClick={onReset}
          disabled={isFullRange || isTrimming}
        >
          <RotateCcw className="size-3.5" />
          {t("reset")}
        </Button>
        <Button
          size="sm"
          className="flex-1 gap-1.5 sm:flex-none"
          onClick={onTrim}
          disabled={isFullRange || isTrimming}
        >
          {isTrimming ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Scissors className="size-3.5" />
          )}
          {t("trim")}
        </Button>
      </div>
    </div>
  );
}
