"use client";

import { useCallback, useState } from "react";
import { Link2, Link2Off } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/Button";

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
    <div className="border-t border-zinc-800 px-4 py-3">
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="flex-1 space-y-1">
            <label className="text-xs text-zinc-400">{t("width")}</label>
            <input
              type="number"
              min={1}
              max={10000}
              value={width}
              onChange={(e) => handleWidthChange(Number(e.target.value))}
              className="w-full rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-sm text-zinc-200 outline-none focus:border-primary"
            />
          </div>

          <button
            type="button"
            onClick={() => setLockAspect((v) => !v)}
            className="mt-5 cursor-pointer text-zinc-400 hover:text-zinc-200"
          >
            {lockAspect ? (
              <Link2 className="size-4" />
            ) : (
              <Link2Off className="size-4" />
            )}
          </button>

          <div className="flex-1 space-y-1">
            <label className="text-xs text-zinc-400">{t("height")}</label>
            <input
              type="number"
              min={1}
              max={10000}
              value={height}
              onChange={(e) => handleHeightChange(Number(e.target.value))}
              className="w-full rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-sm text-zinc-200 outline-none focus:border-primary"
            />
          </div>
        </div>

        <div className="flex items-center gap-1">
          {RESIZE_PRESETS.map((preset) => (
            <Button
              key={preset.label}
              variant="ghost"
              size="sm"
              onClick={() => handlePreset(preset.factor)}
              className="cursor-pointer text-xs"
            >
              {preset.label}
            </Button>
          ))}
        </div>

        <p className="text-xs text-zinc-500">
          {t("original")}: {currentWidth} × {currentHeight}px
        </p>
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
          onClick={() => onApply(width, height)}
          disabled={width === currentWidth && height === currentHeight}
          className="cursor-pointer"
        >
          {t("applyResize")}
        </Button>
      </div>
    </div>
  );
}
