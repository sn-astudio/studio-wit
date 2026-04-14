"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Sun, Palette, Sparkles, Undo2, Redo2 } from "lucide-react";

import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/Tooltip";

import { cn } from "@/lib/utils";
import { useImageEditorStore } from "@/stores/imageEditor";
import { FILTER_RANGES } from "@/components/ImageCreate/ImageEditor/const";
import { FILTER_UNITS, hasFilterChanges, applyFilterToCanvas, applySharpen, applyVignette, applyNoise } from "@/components/ImageCreate/ImageEditor/utils";
import type { FilterValues } from "@/components/ImageCreate/ImageEditor/types";

import type { ImageFilterPanelProps } from "./types";

type FilterTool = "lighting" | "color" | "effects" | null;

const LIGHTING_KEYS: Array<keyof typeof FILTER_RANGES> = ["brightness", "contrast", "opacity"];
const COLOR_KEYS: Array<keyof typeof FILTER_RANGES> = ["saturate", "hueRotate", "grayscale", "sepia", "invert"];
const EFFECT_KEYS: Array<keyof typeof FILTER_RANGES> = ["blur", "sharpen", "vignette", "noise"];

export function ImageFilterPanel({ canvasRef, onToolActiveChange }: ImageFilterPanelProps) {
  const t = useTranslations("ImageEditor");
  const filterValues = useImageEditorStore((s) => s.filterValues);
  const setFilterValues = useImageEditorStore((s) => s.setFilterValues);
  const resetFilterValues = useImageEditorStore((s) => s.resetFilterValues);

  const historyIndex = useImageEditorStore((s) => s.historyIndex);
  const historyLength = useImageEditorStore((s) => s.historyLength);
  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < historyLength - 1;

  const [activeTool, setActiveTool] = useState<FilterTool>(null);

  const handleChange = useCallback(
    (key: keyof FilterValues, val: number) => {
      setFilterValues({ ...filterValues, [key]: val });
    },
    [filterValues, setFilterValues],
  );

  const handleApply = useCallback(() => {
    const canvas = canvasRef.current?.getMainCanvas();
    if (!canvas) return;

    const hasCssChanges = hasFilterChanges(filterValues);
    if (hasCssChanges) {
      canvasRef.current?.pushSnapshot();
      const baked = applyFilterToCanvas(canvas, filterValues);
      canvasRef.current?.replaceMainCanvas(baked);
    }

    if (filterValues.sharpen > 0) {
      canvasRef.current?.pushSnapshot();
      const result = applySharpen(canvasRef.current?.getMainCanvas()!, filterValues.sharpen);
      canvasRef.current?.replaceMainCanvas(result);
    }
    if (filterValues.vignette > 0) {
      canvasRef.current?.pushSnapshot();
      const result = applyVignette(canvasRef.current?.getMainCanvas()!, filterValues.vignette);
      canvasRef.current?.replaceMainCanvas(result);
    }
    if (filterValues.noise > 0) {
      canvasRef.current?.pushSnapshot();
      const result = applyNoise(canvasRef.current?.getMainCanvas()!, filterValues.noise);
      canvasRef.current?.replaceMainCanvas(result);
    }

    resetFilterValues();
    setActiveTool(null);
  }, [canvasRef, filterValues, resetFilterValues]);

  const handleReset = useCallback(() => {
    resetFilterValues();
  }, [resetFilterValues]);

  const handleToolChange = useCallback((tool: FilterTool) => {
    setActiveTool((prev) => (prev === tool ? null : tool));
  }, []);

  useEffect(() => {
    onToolActiveChange?.(activeTool !== null);
  }, [activeTool, onToolActiveChange]);

  const tools = [
    { id: "lighting" as const, icon: Sun, label: t("lighting") },
    { id: "color" as const, icon: Palette, label: t("color") },
    { id: "effects" as const, icon: Sparkles, label: t("effects") },
  ];

  const currentKeys =
    activeTool === "lighting" ? LIGHTING_KEYS :
    activeTool === "color" ? COLOR_KEYS :
    activeTool === "effects" ? EFFECT_KEYS :
    [];

  const hasChanges = hasFilterChanges(filterValues);

  const renderSlider = (key: keyof typeof FILTER_RANGES) => {
    const range = FILTER_RANGES[key];
    return (
      <div key={key} className="space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-[600] text-foreground">{t(key)}</span>
          <span className="text-[12px] font-[500] tabular-nums text-muted-foreground">
            {filterValues[key]}{FILTER_UNITS[key] ?? "%"}
          </span>
        </div>
        <input
          type="range"
          min={range.min}
          max={range.max}
          step={range.step}
          value={filterValues[key]}
          onChange={(e) => handleChange(key, Number(e.target.value))}
          className="filter-slider h-1.5 w-full cursor-pointer appearance-none rounded-full bg-neutral-300 accent-white dark:bg-neutral-700"
          style={{ "--slider-pct": `${((filterValues[key] - range.min) / (range.max - range.min)) * 100}%` } as React.CSSProperties}
        />
      </div>
    );
  };

  return (
    <div className="flex flex-1 flex-col gap-4">
      {/* 소도구 그리드 */}
      <div className="grid grid-cols-4 gap-2">
        {tools.map((tool) => {
          const Icon = tool.icon;
          return (
            <button
              key={tool.id}
              onClick={() => handleToolChange(tool.id)}
              className={cn(
                "flex cursor-pointer flex-col items-center gap-2 rounded-xl py-3.5 text-[12px] font-[500] transition-all active:opacity-80",
                activeTool === tool.id
                  ? "bg-foreground text-background"
                  : "bg-neutral-50 text-muted-foreground hover:bg-neutral-100 hover:text-foreground dark:bg-neutral-800/60 dark:hover:bg-neutral-800 dark:hover:text-white",
              )}
            >
              <Icon className="size-5" strokeWidth={1.5} />
              {tool.label}
            </button>
          );
        })}
      </div>

      {/* undo/redo */}
      <TooltipProvider delay={0} closeDelay={0}>
        <div className="mx-auto flex w-fit items-center gap-0.5 rounded-full bg-neutral-100 px-1.5 py-1.5 dark:bg-neutral-800/60">
          <Tooltip>
            <TooltipTrigger
              render={
                <button
                  onClick={() => canvasRef.current?.undo()}
                  disabled={!canUndo}
                  className="flex size-9 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-neutral-200 hover:text-foreground disabled:pointer-events-none disabled:opacity-30 dark:hover:bg-neutral-700"
                >
                  <Undo2 className="size-[18px]" />
                </button>
              }
            />
            <TooltipContent>{t("undo")}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger
              render={
                <button
                  onClick={() => canvasRef.current?.redo()}
                  disabled={!canRedo}
                  className="flex size-9 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-neutral-200 hover:text-foreground disabled:pointer-events-none disabled:opacity-30 dark:hover:bg-neutral-700"
                >
                  <Redo2 className="size-[18px]" />
                </button>
              }
            />
            <TooltipContent>{t("redo")}</TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>

      {/* 슬라이더 패널 */}
      {activeTool && (
        <>
          <div className="h-px bg-neutral-100 dark:bg-neutral-800" />
          <div className="space-y-5">
            {currentKeys.map(renderSlider)}
          </div>
          <div className="sticky bottom-0 z-10 mt-auto -mx-5 flex items-center gap-2 bg-white px-5 pt-4 pb-4 dark:bg-neutral-950">
            <button
              onClick={handleReset}
              className="flex flex-1 cursor-pointer items-center justify-center rounded-lg bg-neutral-50 py-2.5 text-[13px] font-[500] text-muted-foreground transition-all hover:bg-neutral-100 hover:text-foreground active:opacity-80 dark:bg-neutral-800/60 dark:hover:bg-neutral-800 dark:hover:text-white"
            >
              {t("reset")}
            </button>
            <button
              onClick={handleApply}
              disabled={!hasChanges}
              className="flex flex-1 cursor-pointer items-center justify-center rounded-lg bg-primary py-2.5 text-[13px] font-[600] text-white transition-all hover:opacity-90 active:opacity-80 disabled:pointer-events-none disabled:opacity-30"
            >
              {t("apply")}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
