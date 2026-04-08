"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from "react";
import { Check, Download, Globe, Loader2, Lock, Save } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Button } from "@/components/ui/Button";
import { useNotifyOnComplete } from "@/hooks/useNotifyOnComplete";
import { useCropVideo } from "@/hooks/queries/useVideoEdit";

import type { CropPanelProps, CropPanelRef } from "./types";

const RATIO_PRESETS = ["16:9", "9:16", "4:3", "3:4", "1:1", "21:9"];

export const CropPanel = forwardRef<CropPanelRef, CropPanelProps>(function CropPanel({
  sourceUrl,
  videoWidth,
  videoHeight,
  onCropApplied,
  onSave,
  onDirty,
  onStateChange,
}, ref) {
  const t = useTranslations("VideoEdit");
  const notify = useNotifyOnComplete();
  const cropMutation = useCropVideo();

  // 크롭 좌표
  const [cropX, setCropX] = useState(0);
  const [cropY, setCropY] = useState(0);
  const [cropW, setCropW] = useState(videoWidth || 1280);
  const [cropH, setCropH] = useState(videoHeight || 720);
  const [activePreset, setActivePreset] = useState<string | null>(() => {
    const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
    const d = gcd(videoWidth, videoHeight);
    const ratio = `${videoWidth / d}:${videoHeight / d}`;
    return RATIO_PRESETS.includes(ratio) ? ratio : null;
  });

  // 결과 저장
  const [pendingResult, setPendingResult] = useState<string | null>(null);
  const [isPublicSave, setIsPublicSave] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const isOriginal = cropX === 0 && cropY === 0 && cropW === videoWidth && cropH === videoHeight;

  useEffect(() => {
    onStateChange?.({ isOriginal, isPending: cropMutation.isPending });
  }, [isOriginal, cropMutation.isPending, onStateChange]);

  // 크롭 프리셋
  const applyCropPreset = useCallback(
    (ratio: string) => {
      const [rw, rh] = ratio.split(":").map(Number);
      const targetW = Math.min(videoWidth, Math.floor(videoHeight * (rw / rh)));
      const targetH = Math.min(videoHeight, Math.floor(videoWidth * (rh / rw)));
      const finalW = Math.min(targetW, videoWidth);
      const finalH = Math.min(targetH, videoHeight);
      setCropX(Math.floor((videoWidth - finalW) / 2));
      setCropY(Math.floor((videoHeight - finalH) / 2));
      setCropW(finalW);
      setCropH(finalH);
      setActivePreset(ratio);
      onDirty?.();
    },
    [videoWidth, videoHeight, onDirty],
  );

  const handleReset = useCallback(() => {
    setCropX(0);
    setCropY(0);
    setCropW(videoWidth || 1280);
    setCropH(videoHeight || 720);
    setActivePreset(null);
  }, [videoWidth, videoHeight]);

  const handleCrop = useCallback(async () => {
    if (!sourceUrl) return;
    try {
      const result = await cropMutation.mutateAsync({
        source_url: sourceUrl,
        x: cropX,
        y: cropY,
        width: cropW,
        height: cropH,
      });
      setPendingResult(result.result_url);
      onCropApplied?.(result.result_url);
      toast.success(t("cropApplied"));
      notify(t("cropApplied"));
    } catch {
      toast.error(t("cropError"));
    }
  }, [sourceUrl, cropX, cropY, cropW, cropH, cropMutation, onCropApplied, t, notify]);

  useImperativeHandle(ref, () => ({
    reset: handleReset,
    apply: handleCrop,
  }));

  // DB 저장
  const handleSave = useCallback(async () => {
    if (!pendingResult) return;
    setIsSaving(true);
    try {
      await onSave?.(pendingResult, isPublicSave);
      toast.success(t("saved"));
      setPendingResult(null);
    } catch {
      toast.error(t("saveError"));
    } finally {
      setIsSaving(false);
    }
  }, [pendingResult, isPublicSave, onSave, t]);

  // 로컬 다운로드
  const handleDownload = useCallback(async () => {
    if (!pendingResult) return;
    try {
      const resp = await fetch(pendingResult);
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `cropped_${Date.now()}.mp4`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error(t("cropError"));
    }
  }, [pendingResult, t]);

  return (
    <div className="flex min-h-full flex-col gap-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-[600] text-foreground">{t("cropTitle")}</p>
        <span className="text-[12px] font-[500] tabular-nums text-muted-foreground">
          {t("cropCurrentSize")}: {videoWidth} x {videoHeight}
        </span>
      </div>

      {/* 좌표 입력 */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <label className="text-[12px] font-[500] text-muted-foreground">X</label>
          <input
            type="number"
            min={0}
            value={cropX}
            onChange={(e) => { setCropX(Number(e.target.value)); setActivePreset(null); onDirty?.(); }}
            className="w-full rounded-lg bg-neutral-50 px-3 py-2 text-[13px] tabular-nums text-foreground outline-none dark:bg-neutral-800/60"
          />
        </div>
        <div className="space-y-2">
          <label className="text-[12px] font-[500] text-muted-foreground">Y</label>
          <input
            type="number"
            min={0}
            value={cropY}
            onChange={(e) => { setCropY(Number(e.target.value)); setActivePreset(null); onDirty?.(); }}
            className="w-full rounded-lg bg-neutral-50 px-3 py-2 text-[13px] tabular-nums text-foreground outline-none dark:bg-neutral-800/60"
          />
        </div>
        <div className="space-y-2">
          <label className="text-[12px] font-[500] text-muted-foreground">{t("cropWidth")}</label>
          <input
            type="number"
            min={1}
            value={cropW}
            onChange={(e) => { setCropW(Number(e.target.value)); setActivePreset(null); onDirty?.(); }}
            className="w-full rounded-lg bg-neutral-50 px-3 py-2 text-[13px] tabular-nums text-foreground outline-none dark:bg-neutral-800/60"
          />
        </div>
        <div className="space-y-2">
          <label className="text-[12px] font-[500] text-muted-foreground">{t("cropHeight")}</label>
          <input
            type="number"
            min={1}
            value={cropH}
            onChange={(e) => { setCropH(Number(e.target.value)); setActivePreset(null); onDirty?.(); }}
            className="w-full rounded-lg bg-neutral-50 px-3 py-2 text-[13px] tabular-nums text-foreground outline-none dark:bg-neutral-800/60"
          />
        </div>
      </div>

      {/* 비율 프리셋 */}
      <div className="space-y-2.5">
        <label className="text-[12px] font-[500] text-muted-foreground">{t("cropPreset")}</label>
        <div className="flex flex-wrap gap-1.5">
          {RATIO_PRESETS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => applyCropPreset(r)}
              className={`cursor-pointer rounded-lg px-3.5 py-2 text-[12px] font-[500] transition-all active:opacity-80 ${
                activePreset === r
                  ? "bg-foreground text-background"
                  : "bg-neutral-50 text-muted-foreground hover:bg-neutral-100 hover:text-foreground dark:bg-neutral-800/60 dark:hover:bg-neutral-800 dark:hover:text-white"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* 결과 저장/다운로드 */}
      {pendingResult && (
        <div className="animate-in fade-in slide-in-from-bottom-2 space-y-2.5 rounded-lg border border-primary/30 bg-primary/5 px-3 py-3 duration-200">
          <div className="flex items-center gap-2">
            <div className="flex size-5 items-center justify-center rounded-full bg-primary/20">
              <Check className="size-3 text-primary" />
            </div>
            <p className="text-[12px] font-[500] text-primary">{t("cropResultReady")}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsPublicSave(!isPublicSave)}
              className="flex items-center gap-1 rounded-lg bg-neutral-50 px-2.5 py-1.5 text-[12px] font-[500] text-muted-foreground transition-all hover:bg-neutral-100 hover:text-foreground active:opacity-80 dark:bg-neutral-800/60 dark:hover:bg-neutral-800 dark:hover:text-white"
            >
              {isPublicSave ? <Globe className="size-3" /> : <Lock className="size-3" />}
              {isPublicSave ? t("public") : t("private")}
            </button>
            <Button size="sm" className="flex-1 gap-1.5" onClick={handleSave} disabled={isSaving}>
              {isSaving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
              {t("saveToGallery")}
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5" onClick={handleDownload}>
              <Download className="size-3.5" />
              {t("download")}
            </Button>
          </div>
        </div>
      )}

    </div>
  );
});
