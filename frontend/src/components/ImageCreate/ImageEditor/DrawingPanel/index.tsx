"use client";

import { useCallback } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/Button";

import type { DrawingPanelProps } from "./types";

export function DrawingPanel({
  settings,
  onChange,
  onApply,
  onClear,
  isEraser = false,
  isMosaic = false,
}: DrawingPanelProps) {
  const t = useTranslations("ImageEditor");

  const handleChange = useCallback(
    <K extends keyof typeof settings>(key: K, val: (typeof settings)[K]) => {
      onChange({ ...settings, [key]: val });
    },
    [settings, onChange],
  );

  return (
    <div className="border-t border-zinc-800 px-4 py-3">
      <div className="space-y-3">
        {!isEraser && !isMosaic && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-400">{t("color")}</span>
            <input
              type="color"
              value={settings.color}
              onChange={(e) => handleChange("color", e.target.value)}
              className="size-6 cursor-pointer rounded border border-zinc-700 bg-transparent"
            />
            <span className="text-xs text-zinc-300">{settings.color}</span>
          </div>
        )}

        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-400">
              {t("brushSize")}
            </span>
            <span className="text-xs font-medium text-zinc-300">
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
            className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-zinc-800 accent-primary"
          />
        </div>

        {!isMosaic && (
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-400">{t("opacity")}</span>
              <span className="text-xs font-medium text-zinc-300">
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
              className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-zinc-800 accent-primary"
            />
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center justify-end gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onClear}
          className="cursor-pointer"
        >
          {t("clearDrawing")}
        </Button>
        <Button size="sm" onClick={onApply} className="cursor-pointer">
          {t("applyDrawing")}
        </Button>
      </div>
    </div>
  );
}
