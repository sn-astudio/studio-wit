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
    <div className="flex items-center justify-between rounded-xl bg-zinc-900/60 px-4 py-3">
      <div className="flex items-center gap-4">
        <div className="space-y-0.5">
          <span className="text-[10px] text-zinc-500">{t("trimStart")}</span>
          <p className="text-sm font-mono text-zinc-200">
            {formatTime(trimStart)}
          </p>
        </div>
        <div className="text-zinc-600">→</div>
        <div className="space-y-0.5">
          <span className="text-[10px] text-zinc-500">{t("trimEnd")}</span>
          <p className="text-sm font-mono text-zinc-200">
            {formatTime(trimEnd)}
          </p>
        </div>
        <div className="ml-2 space-y-0.5">
          <span className="text-[10px] text-zinc-500">{t("trimDuration")}</span>
          <p className="text-sm font-mono text-primary">
            {formatTime(trimDuration)}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5"
          onClick={onReset}
          disabled={isFullRange || isTrimming}
        >
          <RotateCcw className="size-3.5" />
          {t("reset")}
        </Button>
        <Button
          size="sm"
          className="gap-1.5"
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
