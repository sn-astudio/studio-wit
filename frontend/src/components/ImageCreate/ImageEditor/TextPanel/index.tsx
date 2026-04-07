"use client";

import { useCallback } from "react";
import { Bold, Italic } from "lucide-react";
import { useTranslations } from "next-intl";

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
    <div className="flex flex-1 flex-col gap-3">
      {/* 텍스트 입력 */}
      <div className="space-y-1.5">
        <p className="text-[13px] font-[600] text-foreground">{t("textContent")}</p>
        <input
          type="text"
          value={settings.text}
          onChange={(e) => handleChange("text", e.target.value)}
          placeholder={t("textPlaceholder")}
          autoFocus
          className="w-full rounded-lg bg-neutral-50 px-3 py-2 text-[13px] text-foreground placeholder:text-muted-foreground/40 outline-none dark:bg-neutral-800/60"
        />
      </div>

      {/* 폰트 + 크기 + 볼드/이탈릭 */}
      <div className="flex items-end gap-1.5">
        <div className="flex-1">
          <select
            value={settings.fontFamily}
            onChange={(e) => handleChange("fontFamily", e.target.value)}
            className="w-full appearance-none rounded-lg bg-neutral-50 px-3 pr-8 py-2 text-[13px] text-foreground outline-none dark:bg-neutral-800/60"
          >
            {FONT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div className="w-16">
          <input
            type="number"
            min={8}
            max={200}
            value={settings.fontSize}
            onChange={(e) => handleChange("fontSize", Number(e.target.value))}
            className="w-full rounded-lg bg-neutral-50 px-2.5 py-2 text-[13px] tabular-nums text-foreground outline-none dark:bg-neutral-800/60"
          />
        </div>
        <button
          onClick={() => handleChange("bold", !settings.bold)}
          className={cn(
            "flex size-[34px] shrink-0 cursor-pointer items-center justify-center rounded-lg transition-colors active:opacity-80",
            settings.bold
              ? "bg-foreground text-background"
              : "bg-neutral-50 text-muted-foreground hover:bg-neutral-100 hover:text-foreground dark:bg-neutral-800/60 dark:hover:bg-neutral-800 dark:hover:text-white",
          )}
        >
          <Bold className="size-4" />
        </button>
        <button
          onClick={() => handleChange("italic", !settings.italic)}
          className={cn(
            "flex size-[34px] shrink-0 cursor-pointer items-center justify-center rounded-lg transition-colors active:opacity-80",
            settings.italic
              ? "bg-foreground text-background"
              : "bg-neutral-50 text-muted-foreground hover:bg-neutral-100 hover:text-foreground dark:bg-neutral-800/60 dark:hover:bg-neutral-800 dark:hover:text-white",
          )}
        >
          <Italic className="size-4" />
        </button>
      </div>

      {/* 색상 */}
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-[600] text-foreground">{t("color")}</p>
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-[500] tabular-nums text-muted-foreground">{settings.color}</span>
          <input
            type="color"
            value={settings.color}
            onChange={(e) => handleChange("color", e.target.value)}
            className="size-6 cursor-pointer rounded-md border border-neutral-200 bg-transparent dark:border-neutral-700"
          />
        </div>
      </div>

      {/* 초기화 / 적용 */}
      <div className="sticky bottom-0 z-10 mt-auto -mx-5 flex items-center gap-2 bg-white px-5 pt-4 pb-4 dark:bg-neutral-950">
        <button
          onClick={onClear}
          className="flex flex-1 cursor-pointer items-center justify-center rounded-lg bg-neutral-50 py-2.5 text-[13px] font-[500] text-muted-foreground transition-all hover:bg-neutral-100 hover:text-foreground active:opacity-80 dark:bg-neutral-800/60 dark:hover:bg-neutral-800 dark:hover:text-white"
        >
          {t("clearDrawing")}
        </button>
        <button
          onClick={onApply}
          disabled={!settings.text.trim() || !isPlaced}
          className="flex flex-1 cursor-pointer items-center justify-center rounded-lg bg-primary py-2.5 text-[13px] font-[600] text-white transition-all hover:opacity-90 active:opacity-80 disabled:pointer-events-none disabled:opacity-30"
        >
          {t("applyText")}
        </button>
      </div>
    </div>
  );
}
