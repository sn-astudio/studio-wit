"use client";

import { useTranslations } from "next-intl";

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
    <div className="flex items-center justify-between">
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
      </div>
      <div className="text-right">
        <span className="text-[12px] font-[500] text-muted-foreground/60">{t("trimDuration")}</span>
        <p className="mt-0.5 text-[15px] font-[600] tabular-nums text-primary">
          {formatTime(trimDuration)}
        </p>
      </div>
    </div>
  );
}
