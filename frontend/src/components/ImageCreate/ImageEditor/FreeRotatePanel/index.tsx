"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";

import type { FreeRotatePanelProps } from "./types";

const PRESETS = [-90, -45, 0, 45, 90];

export function FreeRotatePanel({
  onApply,
  onCancel,
  onChange,
}: FreeRotatePanelProps) {
  const t = useTranslations("ImageEditor");
  const [degrees, setDegrees] = useState(0);

  const updateDegrees = (d: number) => {
    setDegrees(d);
    onChange?.(d);
  };

  return (
    <div className="flex flex-1 flex-col gap-4">
      {/* 각도 슬라이더 */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <p className="text-[13px] font-[600] text-foreground">
            {t("rotateAngle")}
          </p>
          <span className="text-[12px] font-[500] tabular-nums text-muted-foreground">
            {degrees}°
          </span>
        </div>
        <input
          type="range"
          min={-180}
          max={180}
          step={1}
          value={degrees}
          onChange={(e) => updateDegrees(Number(e.target.value))}
          className="filter-slider h-1.5 w-full cursor-pointer appearance-none rounded-full bg-neutral-300 accent-white dark:bg-neutral-700"
        />
      </div>

      {/* 프리셋 */}
      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map((d) => (
          <button
            key={d}
            onClick={() => updateDegrees(d)}
            className={cn(
              "cursor-pointer rounded-lg px-3.5 py-2 text-[12px] font-[500] transition-all active:opacity-80",
              degrees === d
                ? "bg-foreground text-background"
                : "bg-neutral-50 text-muted-foreground hover:bg-neutral-100 hover:text-foreground dark:bg-neutral-800/60 dark:hover:bg-neutral-800 dark:hover:text-white",
            )}
          >
            {d}°
          </button>
        ))}
      </div>

      {/* 취소 / 적용 */}
      <div className="sticky bottom-0 z-10 mt-auto -mx-5 flex items-center gap-2 bg-white px-5 pt-4 pb-4 dark:bg-neutral-950">
        <button
          onClick={onCancel}
          className="flex flex-1 cursor-pointer items-center justify-center rounded-lg bg-neutral-50 py-2.5 text-[13px] font-[500] text-muted-foreground transition-all hover:bg-neutral-100 hover:text-foreground active:opacity-80 dark:bg-neutral-800/60 dark:hover:bg-neutral-800 dark:hover:text-white"
        >
          {t("reset")}
        </button>
        <button
          onClick={() => onApply(degrees)}
          disabled={degrees === 0}
          className="flex flex-1 cursor-pointer items-center justify-center rounded-lg bg-primary py-2.5 text-[13px] font-[600] text-white transition-all hover:opacity-90 active:opacity-80 disabled:pointer-events-none disabled:opacity-30"
        >
          {t("applyRotate")}
        </button>
      </div>
    </div>
  );
}
