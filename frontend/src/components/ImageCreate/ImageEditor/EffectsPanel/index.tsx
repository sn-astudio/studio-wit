"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import type { EffectsPanelProps } from "./types";

export function EffectsPanel({
  onApplySharpen,
  onApplyVignette,
  onApplyNoise,
  onCancel,
}: EffectsPanelProps) {
  const t = useTranslations("ImageEditor");
  const [sharpen, setSharpen] = useState(0);
  const [vignette, setVignette] = useState(0);
  const [noise, setNoise] = useState(0);

  const hasChanges = sharpen > 0 || vignette > 0 || noise > 0;

  const handleReset = () => {
    setSharpen(0);
    setVignette(0);
    setNoise(0);
  };

  const handleApply = () => {
    if (sharpen > 0) onApplySharpen(sharpen);
    if (vignette > 0) onApplyVignette(vignette);
    if (noise > 0) onApplyNoise(noise);
    onCancel();
  };

  const effects = [
    { label: t("sharpen"), value: sharpen, set: setSharpen, min: 0, max: 10, unit: "" },
    { label: t("vignette"), value: vignette, set: setVignette, min: 0, max: 100, unit: "%" },
    { label: t("noise"), value: noise, set: setNoise, min: 0, max: 100, unit: "%" },
  ];

  return (
    <div className="flex flex-1 flex-col gap-4">
      {effects.map((fx) => (
        <div key={fx.label} className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-[600] text-foreground">
              {fx.label}
            </span>
            <span className="text-[12px] font-[500] tabular-nums text-muted-foreground">
              {fx.value}{fx.unit}
            </span>
          </div>
          <input
            type="range"
            min={fx.min}
            max={fx.max}
            step={1}
            value={fx.value}
            onChange={(e) => fx.set(Number(e.target.value))}
            className="filter-slider h-1.5 w-full cursor-pointer appearance-none rounded-full bg-neutral-300 accent-white dark:bg-neutral-700"
          />
        </div>
      ))}

      {/* 초기화 / 적용 */}
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
    </div>
  );
}
