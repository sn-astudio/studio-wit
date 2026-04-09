"use client";

import { useCallback } from "react";
import { useTranslations } from "next-intl";

import { DEFAULT_FILTER_VALUES, FILTER_RANGES } from "../const";
import { FILTER_UNITS, hasFilterChanges } from "../utils";
import type { FilterValues } from "../types";
import type { FilterPanelProps } from "./types";

// CSS filter 키와 효과 키를 분리
const CSS_FILTER_KEYS: Array<keyof typeof FILTER_RANGES> = [
  "brightness", "contrast", "saturate", "hueRotate", "grayscale", "sepia", "blur", "invert", "opacity",
];
const EFFECT_KEYS: Array<keyof typeof FILTER_RANGES> = [
  "sharpen", "vignette", "noise",
];

export function FilterPanel({
  values,
  onChange,
  onApply,
  onReset,
  onApplySharpen,
  onApplyVignette,
  onApplyNoise,
}: FilterPanelProps) {
  const t = useTranslations("ImageEditor");

  const hasChanges = hasFilterChanges(values);

  const handleChange = useCallback(
    (key: keyof FilterValues, val: number) => {
      onChange({ ...values, [key]: val });
    },
    [values, onChange],
  );

  const handleApply = useCallback(() => {
    // CSS 필터 적용
    onApply();
    // 효과 적용
    if (values.sharpen > 0) onApplySharpen?.(values.sharpen);
    if (values.vignette > 0) onApplyVignette?.(values.vignette);
    if (values.noise > 0) onApplyNoise?.(values.noise);
  }, [onApply, onApplySharpen, onApplyVignette, onApplyNoise, values]);

  const renderSlider = (key: keyof typeof FILTER_RANGES) => {
    const range = FILTER_RANGES[key];
    return (
      <div key={key} className="space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-[600] text-foreground">{t(key)}</span>
          <span className="text-[12px] font-[500] tabular-nums text-muted-foreground">
            {values[key]}{FILTER_UNITS[key] ?? "%"}
          </span>
        </div>
        <input
          type="range"
          min={range.min}
          max={range.max}
          step={range.step}
          value={values[key]}
          onChange={(e) => handleChange(key, Number(e.target.value))}
          className="filter-slider h-1.5 w-full cursor-pointer appearance-none rounded-full bg-neutral-300 accent-white dark:bg-neutral-700"
          style={{ "--slider-pct": `${((values[key] - range.min) / (range.max - range.min)) * 100}%` } as React.CSSProperties}
        />
      </div>
    );
  };

  return (
    <div className="flex flex-1 flex-col">
      <div className="mb-4 space-y-5">
        {CSS_FILTER_KEYS.map(renderSlider)}
        {EFFECT_KEYS.map(renderSlider)}
      </div>
      <div className="sticky bottom-0 z-10 mt-auto -mx-5 flex items-center gap-2 bg-white px-5 pt-4 pb-4 dark:bg-neutral-950">
        <button
          onClick={onReset}
          className="flex flex-1 cursor-pointer items-center justify-center rounded-lg bg-neutral-50 py-2.5 text-[13px] font-[500] text-muted-foreground transition-all hover:bg-neutral-100 hover:text-foreground active:opacity-80 dark:bg-neutral-800/60 dark:hover:bg-neutral-800 dark:hover:text-white"
        >
          {t("reset")}
        </button>
        <button
          onClick={handleApply}
          disabled={!hasChanges}
          className="flex flex-1 cursor-pointer items-center justify-center rounded-lg bg-primary py-2.5 text-[13px] font-[600] text-white transition-all hover:opacity-90 active:opacity-80 disabled:pointer-events-none disabled:opacity-30"
        >
          {t("applyFilter")}
        </button>
      </div>
    </div>
  );
}
