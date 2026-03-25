"use client";

import { useCallback } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/Button";

import { FILTER_RANGES } from "../const";
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
    <div className="border-t border-zinc-800 px-4 py-3">
      <div className="space-y-3">
        {(
          Object.keys(FILTER_RANGES) as Array<keyof typeof FILTER_RANGES>
        ).map((key) => {
          const range = FILTER_RANGES[key];
          return (
            <div key={key} className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-400">{t(key)}</span>
                <span className="text-xs font-medium text-zinc-300">
                  {values[key]}%
                </span>
              </div>
              <input
                type="range"
                min={range.min}
                max={range.max}
                step={range.step}
                value={values[key]}
                onChange={(e) => handleChange(key, Number(e.target.value))}
                className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-zinc-800 accent-primary"
              />
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex items-center justify-end gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onReset}
          className="cursor-pointer"
        >
          {t("reset")}
        </Button>
        <Button size="sm" onClick={onApply} className="cursor-pointer">
          {t("applyFilter")}
        </Button>
      </div>
    </div>
  );
}
