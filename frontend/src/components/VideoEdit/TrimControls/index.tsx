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
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-5">
        <div>
          <span className="text-[12px] font-[500] text-muted-foreground/60">{t("trimStart")}</span>
          <p className="mt-0.5 text-[15px] font-[600] tabular-nums text-foreground">
            {formatTime(trimStart)}
          </p>
        </div>
        <span className="text-muted-foreground/30">→</span>
        <div>
          <span className="text-[12px] font-[500] text-muted-foreground/60">{t("trimEnd")}</span>
          <p className="mt-0.5 text-[15px] font-[600] tabular-nums text-foreground">
            {formatTime(trimEnd)}
          </p>
        </div>
        <div className="ml-1">
          <span className="text-[12px] font-[500] text-muted-foreground/60">{t("trimDuration")}</span>
          <p className="mt-0.5 text-[15px] font-[600] tabular-nums text-primary">
            {formatTime(trimDuration)}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onReset}
          disabled={isFullRange || isTrimming}
          className="flex h-9 cursor-pointer items-center rounded-lg bg-neutral-100 px-4 text-[13px] font-[500] text-muted-foreground transition-colors hover:bg-neutral-200 hover:text-foreground disabled:pointer-events-none disabled:opacity-30 dark:bg-neutral-800/60 dark:hover:bg-neutral-800 dark:hover:text-white"
        >
          {t("reset")}
        </button>
        <button
          onClick={onTrim}
          disabled={isFullRange || isTrimming}
          className="flex h-9 cursor-pointer items-center gap-1.5 rounded-lg bg-primary px-4 text-[13px] font-[600] text-white transition-colors hover:opacity-90 disabled:pointer-events-none disabled:opacity-30"
        >
          {isTrimming && <Loader2 className="size-3.5 animate-spin" />}
          {t("apply")}
        </button>
      </div>
    </div>
  );
}
