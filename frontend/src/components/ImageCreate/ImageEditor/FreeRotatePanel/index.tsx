"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/Button";

import type { FreeRotatePanelProps } from "./types";

export function FreeRotatePanel({ onApply, onCancel }: FreeRotatePanelProps) {
  const t = useTranslations("ImageEditor");
  const [degrees, setDegrees] = useState(0);

  return (
    <div className="border-t border-zinc-800 px-4 py-3">
      <div className="space-y-3">
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-400">{t("rotateAngle")}</span>
            <span className="text-xs font-medium text-zinc-300">
              {degrees}°
            </span>
          </div>
          <input
            type="range"
            min={-180}
            max={180}
            step={1}
            value={degrees}
            onChange={(e) => setDegrees(Number(e.target.value))}
            className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-zinc-800 accent-primary"
          />
        </div>

        <div className="flex items-center gap-1">
          {[-90, -45, 0, 45, 90].map((d) => (
            <Button
              key={d}
              variant="ghost"
              size="sm"
              onClick={() => setDegrees(d)}
              className="cursor-pointer text-xs"
            >
              {d}°
            </Button>
          ))}
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
        <Button
          size="sm"
          onClick={() => onApply(degrees)}
          disabled={degrees === 0}
          className="cursor-pointer"
        >
          {t("applyRotate")}
        </Button>
      </div>
    </div>
  );
}
