"use client";

import { useCallback } from "react";
import { useTranslations } from "next-intl";

import { FILTER_RANGES } from "../const";
import { FILTER_UNITS } from "../utils";
import type { FilterValues } from "../types";
import type { FilterPanelProps } from "./types";

export function FilterPanel({
  values,
  onChange,
  onApply,
  onReset,
}: FilterPanelProps) {
  const t = useTranslations("ImageEditor");

  const handleChange = useCallback(
    (key: keyof FilterValues, val: number) => {
      onChange({ ...values, [key]: val });
    },
    [values, onChange],
  );

  return (
    <div className="flex flex-1 flex-col">
      <div className="mb-4 space-y-5">
        {(
          Object.keys(FILTER_RANGES) as Array<keyof typeof FILTER_RANGES>
        ).map((key) => {
          const range = FILTER_RANGES[key];
          return (
            <div key={key} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-[500] text-muted-foreground">{t(key)}</span>
                <span className="text-[13px] font-[500] tabular-nums text-foreground">
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
              />
            </div>
          );
        })}
      </div>
      <div className="sticky bottom-0 z-10 mt-auto -mx-5 flex items-center gap-2 bg-white px-5 pt-4 pb-4 dark:bg-[#161616]">
        <button
          onClick={onReset}
          className="flex flex-1 cursor-pointer items-center justify-center rounded-lg bg-neutral-50 py-2.5 text-[13px] font-[500] text-muted-foreground transition-all hover:bg-neutral-100 hover:text-foreground active:opacity-80 dark:bg-neutral-800/60 dark:hover:bg-neutral-800 dark:hover:text-white"
        >
          {t("reset")}
        </button>
        <button
          onClick={onApply}
          className="flex flex-1 cursor-pointer items-center justify-center rounded-lg bg-primary py-2.5 text-[13px] font-[600] text-white transition-all hover:opacity-90 active:opacity-80"
        >
          {t("applyFilter")}
        </button>
      </div>
    </div>
  );
}
