"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/Button";

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

  return (
    <div className="border-t border-zinc-800 px-4 py-3">
      <div className="space-y-3">
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-400">{t("sharpen")}</span>
            <div className="flex items-center gap-1">
              <span className="text-xs font-medium text-zinc-300">
                {sharpen}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onApplySharpen(sharpen)}
                disabled={sharpen === 0}
                className="cursor-pointer text-xs"
              >
                {t("apply")}
              </Button>
            </div>
          </div>
          <input
            type="range"
            min={0}
            max={10}
            step={1}
            value={sharpen}
            onChange={(e) => setSharpen(Number(e.target.value))}
            className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-zinc-800 accent-primary"
          />
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-400">{t("vignette")}</span>
            <div className="flex items-center gap-1">
              <span className="text-xs font-medium text-zinc-300">
                {vignette}%
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onApplyVignette(vignette)}
                disabled={vignette === 0}
                className="cursor-pointer text-xs"
              >
                {t("apply")}
              </Button>
            </div>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={vignette}
            onChange={(e) => setVignette(Number(e.target.value))}
            className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-zinc-800 accent-primary"
          />
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-400">{t("noise")}</span>
            <div className="flex items-center gap-1">
              <span className="text-xs font-medium text-zinc-300">
                {noise}%
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onApplyNoise(noise)}
                disabled={noise === 0}
                className="cursor-pointer text-xs"
              >
                {t("apply")}
              </Button>
            </div>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={noise}
            onChange={(e) => setNoise(Number(e.target.value))}
            className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-zinc-800 accent-primary"
          />
        </div>
      </div>

      <div className="mt-3 flex items-center justify-end gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onCancel}
          className="cursor-pointer"
        >
          {t("cancel")}
        </Button>
      </div>
    </div>
  );
}
