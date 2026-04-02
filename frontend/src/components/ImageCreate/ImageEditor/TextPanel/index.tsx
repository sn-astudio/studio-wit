"use client";

import { useCallback } from "react";
import { Bold, Italic, MousePointerClick } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

import type { TextPanelProps } from "./types";

const FONT_OPTIONS = [
  { label: "Sans-serif", value: "sans-serif" },
  { label: "Serif", value: "serif" },
  { label: "Monospace", value: "monospace" },
];

export function TextPanel({
  settings,
  onChange,
  onApply,
  onClear,
}: TextPanelProps) {
  const t = useTranslations("ImageEditor");

  const isPlaced = settings.placedX !== null && settings.placedY !== null;

  const handleChange = useCallback(
    <K extends keyof typeof settings>(key: K, val: (typeof settings)[K]) => {
      onChange({ ...settings, [key]: val });
    },
    [settings, onChange],
  );

  return (
    <div className="border-t border-zinc-800 px-4 py-3">
      <div className="space-y-3">
        {/* 안내 문구 */}
        <div
          className={cn(
            "flex items-center gap-2 rounded-lg px-3 py-2 text-xs",
            isPlaced
              ? "bg-primary/10 text-primary"
              : "bg-zinc-800 text-zinc-400",
          )}
        >
          <MousePointerClick className="size-4 shrink-0" />
          <span>
            {!settings.text.trim()
              ? t("textStepInput")
              : isPlaced
                ? t("textStepPlaced")
                : t("textStepClick")}
          </span>
        </div>

        <div className="space-y-1">
          <label className="text-xs text-zinc-400">{t("textContent")}</label>
          <input
            type="text"
            value={settings.text}
            onChange={(e) => handleChange("text", e.target.value)}
            placeholder={t("textPlaceholder")}
            autoFocus
            className="w-full rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-sm text-zinc-200 outline-none focus:border-primary"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex-1 space-y-1">
            <label className="text-xs text-zinc-400">{t("font")}</label>
            <select
              value={settings.fontFamily}
              onChange={(e) => handleChange("fontFamily", e.target.value)}
              className="w-full rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-sm text-zinc-200 outline-none"
            >
              {FONT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="w-20 space-y-1">
            <label className="text-xs text-zinc-400">{t("fontSize")}</label>
            <input
              type="number"
              min={8}
              max={200}
              value={settings.fontSize}
              onChange={(e) =>
                handleChange("fontSize", Number(e.target.value))
              }
              className="w-full rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-sm text-zinc-200 outline-none focus:border-primary"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-400">{t("color")}</span>
          <input
            type="color"
            value={settings.color}
            onChange={(e) => handleChange("color", e.target.value)}
            className="size-6 cursor-pointer rounded border border-zinc-700 bg-transparent"
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleChange("bold", !settings.bold)}
            className={cn(
              "cursor-pointer",
              settings.bold && "bg-primary/20 text-primary",
            )}
          >
            <Bold className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleChange("italic", !settings.italic)}
            className={cn(
              "cursor-pointer",
              settings.italic && "bg-primary/20 text-primary",
            )}
          >
            <Italic className="size-4" />
          </Button>
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
        <Button
          size="sm"
          onClick={onApply}
          disabled={!settings.text.trim() || !isPlaced}
          className="cursor-pointer"
        >
          {t("applyText")}
        </Button>
      </div>
    </div>
  );
}
