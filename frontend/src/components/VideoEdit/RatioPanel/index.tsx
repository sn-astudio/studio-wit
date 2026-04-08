"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from "react";
import { Check, Download, Globe, Loader2, Lock, Save } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Button } from "@/components/ui/Button";
import { useNotifyOnComplete } from "@/hooks/useNotifyOnComplete";
import { useLetterbox } from "@/hooks/queries/useVideoEdit";
import { videoEditApi } from "@/services/api";

import type { RatioPanelProps, RatioPanelRef } from "./types";

const RATIO_PRESETS = ["16:9", "9:16", "4:3", "3:4", "1:1", "21:9"];
const COLOR_PRESETS = [
  { id: "black", label: "Black", hex: "#000000" },
  { id: "white", label: "White", hex: "#ffffff" },
  { id: "0x1a1a2e", label: "Dark Blue", hex: "#1a1a2e" },
];

type ConvertMode = "letterbox" | "crop";

export const RatioPanel = forwardRef<RatioPanelRef, RatioPanelProps>(function RatioPanel({
  sourceUrl,
  onRatioApplied,
  onSave,
  onDirty,
  onStateChange,
}, ref) {
  const t = useTranslations("VideoEdit");
  const notify = useNotifyOnComplete();
  const letterboxMutation = useLetterbox();
  const [shortsLoading, setShortsLoading] = useState(false);

  const isPending = letterboxMutation.isPending || shortsLoading;

  const [targetRatio, setTargetRatio] = useState<string | null>(null);
  const [mode, setMode] = useState<ConvertMode>("letterbox");
  const [padColor, setPadColor] = useState("black");
  const [shortsCropX, setShortsCropX] = useState("center");

  // 결과 저장
  const [pendingResult, setPendingResult] = useState<string | null>(null);
  const [isPublicSave, setIsPublicSave] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const canApply = !!targetRatio;

  useEffect(() => {
    onStateChange?.({ canApply, isPending });
  }, [canApply, isPending, onStateChange]);

  const handleReset = useCallback(() => {
    setTargetRatio(null);
    setMode("letterbox");
    setPadColor("black");
    setShortsCropX("center");
  }, []);

  const handleApply = useCallback(async () => {
    if (!sourceUrl || !targetRatio) return;

    if (mode === "crop") {
      // 쇼츠 크롭
      setShortsLoading(true);
      try {
        const res = await videoEditApi.shortsConvert({
          source_url: sourceUrl,
          crop_x: shortsCropX,
        });
        setPendingResult(res.result_url);
        onRatioApplied?.(res.result_url);
        toast.success(t("shortsSuccess"));
        notify(t("shortsSuccess"));
      } catch {
        toast.error(t("shortsError"));
      } finally {
        setShortsLoading(false);
      }
    } else {
      // 레터박스
      try {
        const result = await letterboxMutation.mutateAsync({
          source_url: sourceUrl,
          target_ratio: targetRatio,
          color: padColor,
        });
        setPendingResult(result.result_url);
        onRatioApplied?.(result.result_url);
        toast.success(t("letterboxApplied"));
        notify(t("letterboxApplied"));
      } catch {
        toast.error(t("cropError"));
      }
    }
  }, [sourceUrl, targetRatio, mode, padColor, shortsCropX, letterboxMutation, onRatioApplied, t, notify]);

  useImperativeHandle(ref, () => ({
    reset: handleReset,
    apply: handleApply,
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
      a.download = `ratio_${Date.now()}.mp4`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error(t("cropError"));
    }
  }, [pendingResult, t]);

  return (
    <div className="flex flex-col gap-5">
      {/* 목표 비율 */}
      <div className="space-y-2.5">
        <label className="text-[12px] font-[500] text-muted-foreground">{t("letterboxRatio")}</label>
        <div className="flex flex-wrap gap-1.5">
          {RATIO_PRESETS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => { setTargetRatio(targetRatio === r ? null : r); onDirty?.(); }}
              className={`cursor-pointer rounded-lg px-3.5 py-2 text-[12px] font-[500] transition-all active:opacity-80 ${
                targetRatio === r
                  ? "bg-foreground text-background"
                  : "bg-neutral-50 text-muted-foreground hover:bg-neutral-100 hover:text-foreground dark:bg-neutral-800/60 dark:hover:bg-neutral-800 dark:hover:text-white"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* 변환 방식 */}
      {targetRatio && (
        <>
          <div className="space-y-2.5">
            <label className="text-[12px] font-[500] text-muted-foreground">{t("convertMode")}</label>
            <div className="flex gap-1.5">
              <button
                onClick={() => setMode("letterbox")}
                className={`flex flex-1 cursor-pointer items-center justify-center rounded-lg py-2 text-[12px] font-[500] transition-all active:opacity-80 ${
                  mode === "letterbox"
                    ? "bg-foreground text-background"
                    : "bg-neutral-50 text-muted-foreground hover:bg-neutral-100 hover:text-foreground dark:bg-neutral-800/60 dark:hover:bg-neutral-800 dark:hover:text-white"
                }`}
              >
                {t("letterboxTitle")}
              </button>
              <button
                onClick={() => setMode("crop")}
                className={`flex flex-1 cursor-pointer items-center justify-center rounded-lg py-2 text-[12px] font-[500] transition-all active:opacity-80 ${
                  mode === "crop"
                    ? "bg-foreground text-background"
                    : "bg-neutral-50 text-muted-foreground hover:bg-neutral-100 hover:text-foreground dark:bg-neutral-800/60 dark:hover:bg-neutral-800 dark:hover:text-white"
                }`}
              >
                {t("shortsCrop")}
              </button>
            </div>
          </div>

          {/* 레터박스 옵션 — 패딩 색상 */}
          {mode === "letterbox" && (
            <div className="space-y-2.5">
              <label className="text-[12px] font-[500] text-muted-foreground">{t("letterboxColor")}</label>
              <div className="flex gap-1.5">
                {COLOR_PRESETS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => { setPadColor(c.id); onDirty?.(); }}
                    className={`flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-2 text-[12px] font-[500] transition-all active:opacity-80 ${
                      padColor === c.id
                        ? "bg-foreground text-background"
                        : "bg-neutral-50 text-muted-foreground hover:bg-neutral-100 hover:text-foreground dark:bg-neutral-800/60 dark:hover:bg-neutral-800 dark:hover:text-white"
                    }`}
                  >
                    <span
                      className={`inline-block size-3 rounded-full border ${padColor === c.id ? "border-background/40" : "border-neutral-400"}`}
                      style={{ backgroundColor: c.hex }}
                    />
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 쇼츠 크롭 옵션 — 크롭 위치 */}
          {mode === "crop" && (
            <div className="space-y-2.5">
              <label className="text-[12px] font-[500] text-muted-foreground">{t("shortsCropPosition")}</label>
              <div className="flex gap-1.5">
                {(["left", "center", "right"] as const).map((pos) => (
                  <button
                    key={pos}
                    onClick={() => setShortsCropX(pos)}
                    className={`flex flex-1 cursor-pointer items-center justify-center rounded-lg py-2 text-[12px] font-[500] transition-all active:opacity-80 ${
                      shortsCropX === pos
                        ? "bg-foreground text-background"
                        : "bg-neutral-50 text-muted-foreground hover:bg-neutral-100 hover:text-foreground dark:bg-neutral-800/60 dark:hover:bg-neutral-800 dark:hover:text-white"
                    }`}
                  >
                    {t(pos === "left" ? "shortsCropLeft" : pos === "center" ? "shortsCropCenter" : "shortsCropRight")}
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}

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
