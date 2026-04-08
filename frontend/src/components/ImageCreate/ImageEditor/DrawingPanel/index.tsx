"use client";

import { useCallback } from "react";
import { useTranslations } from "next-intl";

import type { DrawingPanelProps } from "./types";

export function DrawingPanel({
  settings,
  onChange,
  onApply,
  onClear,
  isEraser = false,
  isMosaic = false,
  hasContent = false,
}: DrawingPanelProps) {
  const t = useTranslations("ImageEditor");

  const handleChange = useCallback(
    <K extends keyof typeof settings>(key: K, val: (typeof settings)[K]) => {
      onChange({ ...settings, [key]: val });
    },
    [settings, onChange],
  );

  return (
    <div className="flex flex-1 flex-col gap-4">
      {/* 색상 */}
      {!isEraser && !isMosaic && (
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-[600] text-foreground">{t("color")}</span>
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-[500] tabular-nums text-muted-foreground">{settings.color}</span>
            <input
              type="color"
              value={settings.color}
              onChange={(e) => handleChange("color", e.target.value)}
              className="size-6 cursor-pointer rounded-md border border-neutral-200 bg-transparent dark:border-neutral-700"
            />
          </div>
        </div>
      )}

      {/* 브러시 크기 */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-[600] text-foreground">
            {t("brushSize")}
          </span>
          <span className="text-[12px] font-[500] tabular-nums text-muted-foreground">
            {settings.size}px
          </span>
        </div>
        <input
          type="range"
          min={1}
          max={50}
          step={1}
          value={settings.size}
          onChange={(e) => handleChange("size", Number(e.target.value))}
          className="filter-slider h-1.5 w-full cursor-pointer appearance-none rounded-full bg-neutral-300 accent-white dark:bg-neutral-700"
          style={{ "--slider-pct": `${((settings.size - 1) / (50 - 1)) * 100}%` } as React.CSSProperties}
        />
      </div>

      {/* 투명도 */}
      {!isMosaic && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-[600] text-foreground">{t("opacity")}</span>
            <span className="text-[12px] font-[500] tabular-nums text-muted-foreground">
              {settings.opacity}%
            </span>
          </div>
          <input
            type="range"
            min={1}
            max={100}
            step={1}
            value={settings.opacity}
            onChange={(e) => handleChange("opacity", Number(e.target.value))}
            className="filter-slider h-1.5 w-full cursor-pointer appearance-none rounded-full bg-neutral-300 accent-white dark:bg-neutral-700"
            style={{ "--slider-pct": `${((settings.opacity - 1) / (100 - 1)) * 100}%` } as React.CSSProperties}
          />
        </div>
      )}

      {/* 초기화 / 적용 */}
      <div className="sticky bottom-0 z-10 mt-auto -mx-5 flex items-center gap-2 bg-white px-5 pt-4 pb-4 dark:bg-neutral-950">
        <button
          onClick={onClear}
          className="flex flex-1 cursor-pointer items-center justify-center rounded-lg bg-neutral-50 py-2.5 text-[13px] font-[500] text-muted-foreground transition-all hover:bg-neutral-100 hover:text-foreground active:opacity-80 dark:bg-neutral-800/60 dark:hover:bg-neutral-800 dark:hover:text-white"
        >
          {t("clearDrawing")}
        </button>
        <button
          onClick={onApply}
          disabled={!hasContent}
          className="flex flex-1 cursor-pointer items-center justify-center rounded-lg bg-primary py-2.5 text-[13px] font-[600] text-white transition-all hover:opacity-90 active:opacity-80 disabled:cursor-not-allowed disabled:opacity-30"
        >
          {t("applyDrawing")}
        </button>
      </div>
    </div>
  );
}
