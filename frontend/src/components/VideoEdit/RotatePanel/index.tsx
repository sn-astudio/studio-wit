"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from "react";
import { Check, Download, FlipHorizontal2, FlipVertical2, Globe, Loader2, Lock, RotateCw, Save } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Button } from "@/components/ui/Button";
import { useNotifyOnComplete } from "@/hooks/useNotifyOnComplete";
import { useRotateVideo } from "@/hooks/queries/useVideoEdit";

import type { RotatePanelProps, RotatePanelRef } from "./types";

const ROTATE_PRESETS = [
  { id: "90", icon: RotateCw, labelKey: "rotate90" },
  { id: "180", icon: RotateCw, labelKey: "rotate180" },
  { id: "270", icon: RotateCw, labelKey: "rotate270" },
];

const FLIP_PRESETS = [
  { id: "flip_h", icon: FlipHorizontal2, labelKey: "flipH" },
  { id: "flip_v", icon: FlipVertical2, labelKey: "flipV" },
];

export const RotatePanel = forwardRef<RotatePanelRef, RotatePanelProps>(function RotatePanel({
  sourceUrl,
  onRotateApplied,
  onSave,
  onDirty,
  onStateChange,
}, ref) {
  const t = useTranslations("VideoEdit");
  const notify = useNotifyOnComplete();
  const rotateMutation = useRotateVideo();

  const [selected, setSelected] = useState<string | null>(null);

  // 결과 저장
  const [pendingResult, setPendingResult] = useState<string | null>(null);
  const [isPublicSave, setIsPublicSave] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    onStateChange?.({ hasSelection: !!selected, isPending: rotateMutation.isPending });
  }, [selected, rotateMutation.isPending, onStateChange]);

  const handleReset = useCallback(() => {
    setSelected(null);
  }, []);

  const handleApply = useCallback(async () => {
    if (!sourceUrl || !selected) return;
    try {
      const result = await rotateMutation.mutateAsync({
        source_url: sourceUrl,
        transform: selected,
      });
      setPendingResult(result.result_url);
      onRotateApplied?.(result.result_url);
      toast.success(t("rotateApplied"));
      notify(t("rotateApplied"));
      handleReset();
    } catch {
      toast.error(t("effectError"));
    }
  }, [sourceUrl, selected, rotateMutation, onRotateApplied, t, notify]);

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
      a.download = `rotated_${Date.now()}.mp4`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error(t("effectError"));
    }
  }, [pendingResult, t]);

  return (
    <div className="flex flex-col gap-5">
      {/* 회전 */}
      <div className="space-y-2.5">
        <label className="text-[12px] font-[500] text-muted-foreground">{t("effectRotate")}</label>
        <div className="flex gap-1.5">
          {ROTATE_PRESETS.map((preset) => {
            const Icon = preset.icon;
            return (
              <button
                key={preset.id}
                onClick={() => { setSelected(selected === preset.id ? null : preset.id); onDirty?.(); }}
                className={`flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg py-2.5 text-[12px] font-[500] transition-all active:opacity-80 ${
                  selected === preset.id
                    ? "bg-foreground text-background"
                    : "bg-neutral-50 text-muted-foreground hover:bg-neutral-100 hover:text-foreground dark:bg-neutral-800/60 dark:hover:bg-neutral-800 dark:hover:text-white"
                }`}
              >
                <Icon className="size-4" />
                {preset.id}°
              </button>
            );
          })}
        </div>
      </div>

      {/* 뒤집기 */}
      <div className="space-y-2.5">
        <label className="text-[12px] font-[500] text-muted-foreground">{t("flipLabel")}</label>
        <div className="flex gap-1.5">
          {FLIP_PRESETS.map((preset) => {
            const Icon = preset.icon;
            return (
              <button
                key={preset.id}
                onClick={() => { setSelected(selected === preset.id ? null : preset.id); onDirty?.(); }}
                className={`flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg py-2.5 text-[12px] font-[500] transition-all active:opacity-80 ${
                  selected === preset.id
                    ? "bg-foreground text-background"
                    : "bg-neutral-50 text-muted-foreground hover:bg-neutral-100 hover:text-foreground dark:bg-neutral-800/60 dark:hover:bg-neutral-800 dark:hover:text-white"
                }`}
              >
                <Icon className="size-4" />
                {t(preset.labelKey)}
              </button>
            );
          })}
        </div>
      </div>

      {/* 결과 저장/다운로드 */}
      {pendingResult && (
        <div className="animate-in fade-in slide-in-from-bottom-2 space-y-2.5 rounded-lg border border-primary/30 bg-primary/5 px-3 py-3 duration-200">
          <div className="flex items-center gap-2">
            <div className="flex size-5 items-center justify-center rounded-full bg-primary/20">
              <Check className="size-3 text-primary" />
            </div>
            <p className="text-[12px] font-[500] text-primary">{t("rotateApplied")}</p>
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
