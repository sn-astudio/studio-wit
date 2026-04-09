"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from "react";
import { ImageIcon, Loader2, Type } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { useNotifyOnComplete } from "@/hooks/useNotifyOnComplete";
import { useWatermarkVideo } from "@/hooks/queries/useVideoEdit";
import { useVideoEditStore } from "@/stores/videoEditStore";

import type { WatermarkPanelProps, WatermarkPanelRef } from "./types";

const WM_POSITION_PRESETS = [
  { id: "top-left", labelKey: "wmTopLeft" },
  { id: "top-right", labelKey: "wmTopRight" },
  { id: "bottom-left", labelKey: "wmBottomLeft" },
  { id: "bottom-right", labelKey: "wmBottomRight" },
  { id: "center", labelKey: "wmCenter" },
] as const;

const COLOR_PRESETS = ["white", "black", "#ef4444", "#eab308"] as const;

export const WatermarkPanel = forwardRef<WatermarkPanelRef, WatermarkPanelProps>(function WatermarkPanel({
  sourceUrl,
  onEffectApplied,
  onDirty,
  onStateChange,
}, ref) {
  const t = useTranslations("VideoEdit");
  const notify = useNotifyOnComplete();
  const watermarkMutation = useWatermarkVideo();

  const wmMode = useVideoEditStore((s) => s.effects.wmMode);
  const wmText = useVideoEditStore((s) => s.effects.wmText);
  const wmPosition = useVideoEditStore((s) => s.effects.wmPosition);
  const wmOpacity = useVideoEditStore((s) => s.effects.wmOpacity);
  const wmFontSize = useVideoEditStore((s) => s.effects.wmFontSize);
  const wmColor = useVideoEditStore((s) => s.effects.wmColor);
  const wmImageScale = useVideoEditStore((s) => s.effects.wmImageScale);
  const setEffect = useVideoEditStore((s) => s.setEffect);

  const [wmImageFile, setWmImageFile] = useState<File | null>(null);

  const canApply = !!sourceUrl && !watermarkMutation.isPending &&
    ((wmMode === "text" && !!wmText.trim()) || (wmMode === "image" && !!wmImageFile));

  useEffect(() => {
    onStateChange?.({ canApply, isPending: watermarkMutation.isPending });
  }, [canApply, watermarkMutation.isPending, onStateChange]);

  const handleReset = useCallback(() => {
    setEffect("wmMode", "text");
    setEffect("wmText", "");
    setEffect("wmPosition", "bottom-right");
    setEffect("wmOpacity", 0.7);
    setEffect("wmFontSize", 24);
    setEffect("wmColor", "white");
    setEffect("wmImageScale", 20);
    setWmImageFile(null);
  }, [setEffect]);

  const handleApply = useCallback(async () => {
    if (!sourceUrl) return;
    if (wmMode === "text" && !wmText.trim()) return;
    if (wmMode === "image" && !wmImageFile) return;

    try {
      let imageUrl: string | undefined;
      if (wmMode === "image" && wmImageFile) {
        imageUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(wmImageFile);
        });
      }

      const result = await watermarkMutation.mutateAsync({
        source_url: sourceUrl,
        mode: wmMode,
        text: wmMode === "text" ? wmText.trim() : undefined,
        image_url: imageUrl,
        position: wmPosition as "top-left" | "top-right" | "bottom-left" | "bottom-right" | "center",
        opacity: wmOpacity,
        font_size: wmFontSize,
        color: wmColor,
        image_scale: wmImageScale,
      });
      onEffectApplied?.(result.result_url);
      toast.success(t("effectApplied"));
      notify(t("effectApplied"));
    } catch {
      toast.error(t("effectError"));
    }
  }, [sourceUrl, wmMode, wmText, wmImageFile, wmPosition, wmOpacity, wmFontSize, wmColor, wmImageScale, watermarkMutation, onEffectApplied, t, notify]);

  useImperativeHandle(ref, () => ({ reset: handleReset, apply: handleApply }), [handleReset, handleApply]);

  return (
    <div className="flex flex-1 flex-col gap-5">
      {/* 모드 선택 */}
      <div className="space-y-2.5">
        <p className="text-[13px] font-[600] text-foreground">{t("wmModeLabel")}</p>
        <div className="flex gap-1.5">
          <button
            onClick={() => setEffect("wmMode", "text")}
            className={`flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg py-2 text-[12px] font-[500] transition-all active:opacity-80 ${
              wmMode === "text"
                ? "bg-foreground text-background"
                : "bg-neutral-50 text-muted-foreground hover:bg-neutral-100 hover:text-foreground dark:bg-neutral-800/60 dark:hover:bg-neutral-800 dark:hover:text-white"
            }`}
          >
            <Type className="size-3.5" />
            {t("wmText")}
          </button>
          <button
            onClick={() => setEffect("wmMode", "image")}
            className={`flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg py-2 text-[12px] font-[500] transition-all active:opacity-80 ${
              wmMode === "image"
                ? "bg-foreground text-background"
                : "bg-neutral-50 text-muted-foreground hover:bg-neutral-100 hover:text-foreground dark:bg-neutral-800/60 dark:hover:bg-neutral-800 dark:hover:text-white"
            }`}
          >
            <ImageIcon className="size-3.5" />
            {t("wmImage")}
          </button>
        </div>
      </div>

      {/* 텍스트 모드 */}
      {wmMode === "text" && (
        <>
          <div className="space-y-2.5">
            <p className="text-[13px] font-[600] text-foreground">{t("wmTextLabel")}</p>
            <input
              value={wmText}
              onChange={(e) => { setEffect("wmText", e.target.value); onDirty?.(); }}
              placeholder={t("wmTextPlaceholder")}
              maxLength={100}
              className="h-9 w-full rounded-lg bg-neutral-50 px-3 text-[13px] text-foreground placeholder:text-muted-foreground/40 focus:outline-none dark:bg-neutral-800/60"
            />
          </div>

          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-[600] text-foreground">{t("fontSize")}</span>
              <span className="text-[12px] font-[500] tabular-nums text-muted-foreground">{wmFontSize}px</span>
            </div>
            <input
              type="range"
              min={10}
              max={100}
              step={2}
              value={wmFontSize}
              onChange={(e) => setEffect("wmFontSize", Number(e.target.value))}
              className="filter-slider h-1.5 w-full cursor-pointer appearance-none rounded-full bg-neutral-300 accent-white dark:bg-neutral-700"
              style={{ "--slider-pct": `${((wmFontSize - 10) / 90) * 100}%` } as React.CSSProperties}
            />
          </div>

          <div className="space-y-2.5">
            <p className="text-[13px] font-[600] text-foreground">{t("textColor")}</p>
            <div className="flex items-center gap-2">
              {COLOR_PRESETS.map((c) => (
                <button
                  key={c}
                  onClick={() => setEffect("wmColor", c)}
                  className={`size-7 cursor-pointer rounded-full border-2 transition-all ${
                    wmColor === c
                      ? "border-foreground scale-110"
                      : "border-neutral-300 hover:border-neutral-500 dark:border-neutral-700 dark:hover:border-neutral-500"
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
              <input
                type="color"
                value={wmColor.startsWith("#") ? wmColor : wmColor === "white" ? "#ffffff" : "#000000"}
                onChange={(e) => setEffect("wmColor", e.target.value)}
                className="size-7 cursor-pointer rounded-full border-2 border-neutral-300 bg-transparent p-0 dark:border-neutral-700"
              />
            </div>
          </div>
        </>
      )}

      {/* 이미지 모드 */}
      {wmMode === "image" && (
        <>
          <div className="space-y-2.5">
            <p className="text-[13px] font-[600] text-foreground">{t("wmImageLabel")}</p>
            <label className="flex cursor-pointer items-center gap-2.5 rounded-lg bg-neutral-50 px-4 py-3 text-[12px] font-[500] text-muted-foreground transition-all hover:bg-neutral-100 hover:text-foreground dark:bg-neutral-800/60 dark:hover:bg-neutral-800 dark:hover:text-white">
              <ImageIcon className="size-5 shrink-0" strokeWidth={1.5} />
              <span className="flex-1 truncate">{wmImageFile ? wmImageFile.name : t("wmSelectImage")}</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) { setWmImageFile(file); onDirty?.(); }
                  e.target.value = "";
                }}
              />
            </label>
          </div>

          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-[600] text-foreground">{t("wmImageSize")}</span>
              <span className="text-[12px] font-[500] tabular-nums text-muted-foreground">{wmImageScale}%</span>
            </div>
            <input
              type="range"
              min={5}
              max={80}
              step={5}
              value={wmImageScale}
              onChange={(e) => setEffect("wmImageScale", Number(e.target.value))}
              className="filter-slider h-1.5 w-full cursor-pointer appearance-none rounded-full bg-neutral-300 accent-white dark:bg-neutral-700"
              style={{ "--slider-pct": `${((wmImageScale - 5) / 75) * 100}%` } as React.CSSProperties}
            />
          </div>
        </>
      )}

      {/* 위치 선택 */}
      <div className="space-y-2.5">
        <p className="text-[13px] font-[600] text-foreground">{t("wmPositionLabel")}</p>
        <div className="flex flex-wrap gap-1.5">
          {WM_POSITION_PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => setEffect("wmPosition", p.id)}
              className={`cursor-pointer rounded-lg px-3.5 py-2 text-[12px] font-[500] transition-all active:opacity-80 ${
                wmPosition === p.id
                  ? "bg-foreground text-background"
                  : "bg-neutral-50 text-muted-foreground hover:bg-neutral-100 hover:text-foreground dark:bg-neutral-800/60 dark:hover:bg-neutral-800 dark:hover:text-white"
              }`}
            >
              {t(p.labelKey)}
            </button>
          ))}
        </div>
      </div>

      {/* 투명도 */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-[600] text-foreground">{t("wmOpacity")}</span>
          <span className="text-[12px] font-[500] tabular-nums text-muted-foreground">{(wmOpacity * 100).toFixed(0)}%</span>
        </div>
        <input
          type="range"
          min={0.1}
          max={1}
          step={0.1}
          value={wmOpacity}
          onChange={(e) => setEffect("wmOpacity", Number(e.target.value))}
          className="filter-slider h-1.5 w-full cursor-pointer appearance-none rounded-full bg-neutral-300 accent-white dark:bg-neutral-700"
          style={{ "--slider-pct": `${((wmOpacity - 0.1) / 0.9) * 100}%` } as React.CSSProperties}
        />
      </div>
    </div>
  );
});
