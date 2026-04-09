"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle } from "react";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { useNotifyOnComplete } from "@/hooks/useNotifyOnComplete";
import { useTextOverlayVideo } from "@/hooks/queries/useVideoEdit";
import { useVideoEditStore } from "@/stores/videoEditStore";

import type { TextOverlayPanelProps, TextOverlayPanelRef } from "./types";

interface TextStylePreset {
  id: string;
  nameKey: string;
  fontSize: number;
  color: string;
  position: string;
  preview: { text: string; border: string; boxBg?: string };
}

const TEXT_STYLE_PRESETS: TextStylePreset[] = [
  { id: "default", nameKey: "txtPresetDefault", fontSize: 36, color: "white", position: "bottom", preview: { text: "#ffffff", border: "#000000" } },
  { id: "title", nameKey: "txtPresetTitle", fontSize: 56, color: "white", position: "center", preview: { text: "#ffffff", border: "#000000" } },
  { id: "caption", nameKey: "txtPresetCaption", fontSize: 24, color: "white", position: "bottom", preview: { text: "#ffffff", border: "transparent", boxBg: "rgba(0,0,0,0.6)" } },
  { id: "highlight", nameKey: "txtPresetHighlight", fontSize: 42, color: "#eab308", position: "center", preview: { text: "#eab308", border: "#000000" } },
  { id: "neon", nameKey: "txtPresetNeon", fontSize: 40, color: "#39ff14", position: "center", preview: { text: "#39ff14", border: "#ff00ff" } },
  { id: "cinematic", nameKey: "txtPresetCinematic", fontSize: 48, color: "white", position: "bottom", preview: { text: "#ffffff", border: "transparent", boxBg: "rgba(0,0,0,0.5)" } },
];

const POSITION_PRESETS = [
  { id: "top-left", labelKey: "positionTopLeft" },
  { id: "top", labelKey: "positionTop" },
  { id: "top-right", labelKey: "positionTopRight" },
  { id: "center-left", labelKey: "positionCenterLeft" },
  { id: "center", labelKey: "positionCenter" },
  { id: "center-right", labelKey: "positionCenterRight" },
  { id: "bottom-left", labelKey: "positionBottomLeft" },
  { id: "bottom", labelKey: "positionBottom" },
  { id: "bottom-right", labelKey: "positionBottomRight" },
] as const;

const COLOR_PRESETS = ["white", "black", "#ef4444", "#eab308", "#39ff14", "#3b82f6"] as const;

export const TextOverlayPanel = forwardRef<TextOverlayPanelRef, TextOverlayPanelProps>(function TextOverlayPanel({
  sourceUrl,
  onEffectApplied,
  onDirty,
  onStateChange,
}, ref) {
  const t = useTranslations("VideoEdit");
  const notify = useNotifyOnComplete();
  const textMutation = useTextOverlayVideo();

  const overlayText = useVideoEditStore((s) => s.effects.overlayText);
  const textPosition = useVideoEditStore((s) => s.effects.textPosition);
  const fontSize = useVideoEditStore((s) => s.effects.fontSize);
  const textColor = useVideoEditStore((s) => s.effects.textColor);
  const selectedTextPreset = useVideoEditStore((s) => s.effects.selectedTextPreset);
  const setEffect = useVideoEditStore((s) => s.setEffect);

  const canApply = !!sourceUrl && !!overlayText.trim() && !textMutation.isPending;

  useEffect(() => {
    onStateChange?.({ canApply, isPending: textMutation.isPending });
  }, [canApply, textMutation.isPending, onStateChange]);

  const handleReset = useCallback(() => {
    setEffect("overlayText", "");
    setEffect("textPosition", "bottom");
    setEffect("fontSize", 36);
    setEffect("textColor", "white");
    setEffect("selectedTextPreset", "default");
  }, [setEffect]);

  const handleApply = useCallback(async () => {
    if (!sourceUrl || !overlayText.trim()) return;
    try {
      const result = await textMutation.mutateAsync({
        source_url: sourceUrl,
        text: overlayText.trim(),
        position: textPosition as "top" | "center" | "bottom",
        font_size: fontSize,
        color: textColor,
      });
      onEffectApplied?.(result.result_url);
      toast.success(t("effectApplied"));
      notify(t("effectApplied"));
    } catch {
      toast.error(t("effectError"));
    }
  }, [sourceUrl, overlayText, textPosition, fontSize, textColor, textMutation, onEffectApplied, t, notify]);

  useImperativeHandle(ref, () => ({ reset: handleReset, apply: handleApply }), [handleReset, handleApply]);

  return (
    <div className="flex flex-1 flex-col gap-5">
      {/* 스타일 프리셋 */}
      <div className="space-y-2.5">
        <p className="text-[13px] font-[600] text-foreground">{t("textStylePreset")}</p>
        <div className="grid grid-cols-3 gap-2">
          {TEXT_STYLE_PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => {
                setEffect("selectedTextPreset", preset.id);
                setEffect("fontSize", preset.fontSize);
                setEffect("textColor", preset.color);
                setEffect("textPosition", preset.position);
                onDirty?.();
              }}
              className={`flex cursor-pointer flex-col items-center gap-1.5 rounded-lg py-2.5 text-[11px] font-[500] transition-all active:opacity-80 ${
                selectedTextPreset === preset.id
                  ? "bg-foreground text-background"
                  : "bg-neutral-50 text-muted-foreground hover:bg-neutral-100 hover:text-foreground dark:bg-neutral-800/60 dark:hover:bg-neutral-800 dark:hover:text-white"
              }`}
            >
              <div className="flex h-6 items-center justify-center">
                <span
                  className="truncate text-[10px] font-bold leading-none"
                  style={{
                    color: selectedTextPreset === preset.id ? "inherit" : preset.preview.text,
                    WebkitTextStroke: preset.preview.border !== "transparent" && selectedTextPreset !== preset.id
                      ? `1px ${preset.preview.border}` : undefined,
                    backgroundColor: preset.preview.boxBg && selectedTextPreset !== preset.id ? preset.preview.boxBg : undefined,
                    padding: preset.preview.boxBg ? "1px 4px" : undefined,
                    borderRadius: preset.preview.boxBg ? "2px" : undefined,
                  }}
                >
                  Aa가나
                </span>
              </div>
              {t(preset.nameKey)}
            </button>
          ))}
        </div>
      </div>

      {/* 텍스트 입력 */}
      <div className="space-y-2.5">
        <p className="text-[13px] font-[600] text-foreground">{t("textInput")}</p>
        <textarea
          value={overlayText}
          onChange={(e) => { setEffect("overlayText", e.target.value); onDirty?.(); }}
          placeholder={t("textPlaceholder")}
          rows={2}
          maxLength={200}
          className="w-full resize-none rounded-lg bg-neutral-50 px-3 py-2.5 text-[13px] text-foreground placeholder:text-muted-foreground/40 focus:outline-none dark:bg-neutral-800/60"
        />
      </div>

      {/* 위치 선택 */}
      <div className="space-y-2.5">
        <p className="text-[13px] font-[600] text-foreground">{t("textPositionLabel")}</p>
        <div className="grid grid-cols-3 gap-1.5">
          {POSITION_PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => { setEffect("textPosition", p.id); setEffect("selectedTextPreset", "custom"); }}
              className={`cursor-pointer rounded-lg py-2 text-[11px] font-[500] transition-all active:opacity-80 ${
                textPosition === p.id
                  ? "bg-foreground text-background"
                  : "bg-neutral-50 text-muted-foreground hover:bg-neutral-100 hover:text-foreground dark:bg-neutral-800/60 dark:hover:bg-neutral-800 dark:hover:text-white"
              }`}
            >
              {t(p.labelKey)}
            </button>
          ))}
        </div>
      </div>

      {/* 폰트 크기 */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-[600] text-foreground">{t("fontSize")}</span>
          <span className="text-[12px] font-[500] tabular-nums text-muted-foreground">{fontSize}px</span>
        </div>
        <input
          type="range"
          min={10}
          max={100}
          step={2}
          value={fontSize}
          onChange={(e) => { setEffect("fontSize", Number(e.target.value)); setEffect("selectedTextPreset", "custom"); }}
          className="filter-slider h-1.5 w-full cursor-pointer appearance-none rounded-full bg-neutral-300 accent-white dark:bg-neutral-700"
          style={{ "--slider-pct": `${((fontSize - 10) / 90) * 100}%` } as React.CSSProperties}
        />
      </div>

      {/* 색상 */}
      <div className="space-y-2.5">
        <p className="text-[13px] font-[600] text-foreground">{t("textColor")}</p>
        <div className="flex items-center gap-2">
          {COLOR_PRESETS.map((c) => (
            <button
              key={c}
              onClick={() => { setEffect("textColor", c); setEffect("selectedTextPreset", "custom"); }}
              className={`size-7 cursor-pointer rounded-full border-2 transition-all ${
                textColor === c
                  ? "border-foreground scale-110"
                  : "border-neutral-300 hover:border-neutral-500 dark:border-neutral-700 dark:hover:border-neutral-500"
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
          <input
            type="color"
            value={textColor.startsWith("#") ? textColor : textColor === "white" ? "#ffffff" : "#000000"}
            onChange={(e) => { setEffect("textColor", e.target.value); setEffect("selectedTextPreset", "custom"); }}
            className="size-7 cursor-pointer rounded-full border-2 border-neutral-300 bg-transparent p-0 dark:border-neutral-700"
          />
        </div>
      </div>
    </div>
  );
});
