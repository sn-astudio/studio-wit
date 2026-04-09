"use client";

import { useCallback, useState } from "react";
import { Link2, Link2Off } from "lucide-react";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";

import { RESIZE_PRESETS } from "../const";
import type { ResizePanelProps } from "./types";

export function ResizePanel({
  currentWidth,
  currentHeight,
  onApply,
  onCancel,
  onChange,
}: ResizePanelProps) {
  const t = useTranslations("ImageEditor");
  const [width, setWidth] = useState(currentWidth);
  const [height, setHeight] = useState(currentHeight);
  const [lockAspect, setLockAspect] = useState(true);
  const aspect = currentWidth / currentHeight;

  const updateSize = useCallback(
    (w: number, h: number) => {
      setWidth(w);
      setHeight(h);
      onChange?.(w, h);
    },
    [onChange],
  );

  const handleWidthChange = useCallback(
    (val: number) => {
      const w = Math.max(1, Math.round(val));
      const h = lockAspect ? Math.max(1, Math.round(w / aspect)) : height;
      updateSize(w, h);
    },
    [lockAspect, aspect, height, updateSize],
  );

  const handleHeightChange = useCallback(
    (val: number) => {
      const h = Math.max(1, Math.round(val));
      const w = lockAspect ? Math.max(1, Math.round(h * aspect)) : width;
      updateSize(w, h);
    },
    [lockAspect, aspect, width, updateSize],
  );

  const handlePreset = useCallback(
    (factor: number) => {
      const w = Math.max(1, Math.round(currentWidth * factor));
      const h = Math.max(1, Math.round(currentHeight * factor));
      updateSize(w, h);
    },
    [currentWidth, currentHeight, updateSize],
  );

  return (
    <div className="flex flex-1 flex-col gap-4">
      {/* 크기 입력 */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[13px] font-[600] text-foreground">
            {t("resize")}
          </p>
          <span className="text-[12px] font-[500] tabular-nums text-muted-foreground">
            {t("original")}: {currentWidth} × {currentHeight}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 space-y-2">
            <label className="text-[12px] font-[500] text-muted-foreground">{t("width")}</label>
            <input
              type="number"
              min={1}
              max={10000}
              value={width}
              onChange={(e) => handleWidthChange(Number(e.target.value))}
              className="w-full rounded-lg bg-neutral-50 px-3 py-2 text-[13px] tabular-nums text-foreground outline-none dark:bg-neutral-800/60"
            />
          </div>

          <button
            type="button"
            onClick={() => setLockAspect((v) => !v)}
            className="mt-6 cursor-pointer text-muted-foreground transition-colors hover:text-foreground"
          >
            {lockAspect ? (
              <Link2 className="size-4" />
            ) : (
              <Link2Off className="size-4" />
            )}
          </button>

          <div className="flex-1 space-y-2">
            <label className="text-[12px] font-[500] text-muted-foreground">{t("height")}</label>
            <input
              type="number"
              min={1}
              max={10000}
              value={height}
              onChange={(e) => handleHeightChange(Number(e.target.value))}
              className="w-full rounded-lg bg-neutral-50 px-3 py-2 text-[13px] tabular-nums text-foreground outline-none dark:bg-neutral-800/60"
            />
          </div>
        </div>
      </div>

      {/* 프리셋 */}
      <div className="flex flex-wrap gap-1.5">
        {RESIZE_PRESETS.map((preset) => {
          const isActive =
            width === Math.round(currentWidth * preset.factor) &&
            height === Math.round(currentHeight * preset.factor);
          return (
            <button
              key={preset.label}
              onClick={() => handlePreset(preset.factor)}
              className={cn(
                "cursor-pointer rounded-lg px-3.5 py-2 text-[12px] font-[500] transition-all active:opacity-80",
                isActive
                  ? "bg-foreground text-background"
                  : "bg-neutral-50 text-muted-foreground hover:bg-neutral-100 hover:text-foreground dark:bg-neutral-800/60 dark:hover:bg-neutral-800 dark:hover:text-white",
              )}
            >
              {preset.label}
            </button>
          );
        })}
      </div>

      {/* 취소 / 적용 */}
      <div className="sticky bottom-0 z-10 mt-auto -mx-5 flex items-center gap-2 bg-white px-5 pt-4 pb-4 dark:bg-neutral-950">
        <button
          onClick={() => { updateSize(currentWidth, currentHeight); onCancel(); }}
          className="flex flex-1 cursor-pointer items-center justify-center rounded-lg bg-neutral-50 py-2.5 text-[13px] font-[500] text-muted-foreground transition-all hover:bg-neutral-100 hover:text-foreground active:opacity-80 dark:bg-neutral-800/60 dark:hover:bg-neutral-800 dark:hover:text-white"
        >
          {t("reset")}
        </button>
        <button
          onClick={() => onApply(width, height)}
          disabled={width === currentWidth && height === currentHeight}
          className="flex flex-1 cursor-pointer items-center justify-center rounded-lg bg-primary py-2.5 text-[13px] font-[600] text-white transition-all hover:opacity-90 active:opacity-80 disabled:pointer-events-none disabled:opacity-30"
        >
          {t("applyResize")}
        </button>
      </div>
    </div>
  );
}
