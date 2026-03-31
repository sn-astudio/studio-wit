"use client";

import { useCallback } from "react";
import { Circle, Minus, MoveRight, Square } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

import type { ShapeType } from "../types";
import type { ShapePanelProps } from "./types";

const SHAPE_OPTIONS: { type: ShapeType; icon: typeof Square }[] = [
  { type: "rect", icon: Square },
  { type: "circle", icon: Circle },
  { type: "line", icon: Minus },
  { type: "arrow", icon: MoveRight },
];

export function ShapePanel({
  settings,
  onChange,
  onApply,
  onClear,
}: ShapePanelProps) {
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
        <div className="flex items-center gap-1">
          {SHAPE_OPTIONS.map(({ type, icon: Icon }) => (
            <Button
              key={type}
              variant="ghost"
              size="sm"
              onClick={() => handleChange("type", type)}
              className={cn(
                "cursor-pointer",
                settings.type === type && "bg-primary/20 text-primary",
              )}
            >
              <Icon className="size-4" />
            </Button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-400">{t("color")}</span>
          <input
            type="color"
            value={settings.color}
            onChange={(e) => handleChange("color", e.target.value)}
            className="size-6 cursor-pointer rounded border border-zinc-700 bg-transparent"
          />
          <label className="flex items-center gap-1 text-xs text-zinc-400">
            <input
              type="checkbox"
              checked={settings.fill}
              onChange={(e) => handleChange("fill", e.target.checked)}
              className="accent-primary"
            />
            {t("fill")}
          </label>
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-400">
              {t("strokeWidth")}
            </span>
            <span className="text-xs font-medium text-zinc-300">
              {settings.strokeWidth}px
            </span>
          </div>
          <input
            type="range"
            min={1}
            max={20}
            step={1}
            value={settings.strokeWidth}
            onChange={(e) =>
              handleChange("strokeWidth", Number(e.target.value))
            }
            className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-zinc-800 accent-primary"
          />
        </div>
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
          {t("applyShape")}
        </Button>
      </div>
    </div>
  );
}
