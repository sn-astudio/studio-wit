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
  onPreviewTransform,
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

  // CSS 프리뷰
  useEffect(() => {
    if (!selected) { onPreviewTransform?.(null); return; }
    const map: Record<string, string> = {
      "90": "rotate(90deg)",
      "180": "rotate(180deg)",
      "270": "rotate(270deg)",
      "flip_h": "scaleX(-1)",
      "flip_v": "scaleY(-1)",
    };
    onPreviewTransform?.(map[selected] ?? null);
  }, [selected, onPreviewTransform]);

  const handleReset = useCallback(() => {
    setSelected(null);
    onPreviewTransform?.(null);
  }, [onPreviewTransform]);

  const handleApply = useCallback(async () => {
    if (!sourceUrl || !selected) return;
    try {
      const result = await rotateMutation.mutateAsync({
        source_url: sourceUrl,
        transform: selected,
      });
      setPendingResult(result.result_url);
      onRotateApplied?.(result.result_url);
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
        <p className="text-[13px] font-[600] text-foreground">{t("effectRotate")}</p>
        <div className="flex gap-1.5">
          {ROTATE_PRESETS.map((preset) => {
            const Icon = preset.icon;
            return (
              <button
                key={preset.id}
                onClick={() => { setSelected(selected === preset.id ? null : preset.id); onDirty?.(); }}
                className={`flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg py-2 text-[12px] font-[500] transition-all active:opacity-80 ${
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
        <p className="text-[13px] font-[600] text-foreground">{t("flipLabel")}</p>
        <div className="flex gap-1.5">
          {FLIP_PRESETS.map((preset) => {
            const Icon = preset.icon;
            return (
              <button
                key={preset.id}
                onClick={() => { setSelected(selected === preset.id ? null : preset.id); onDirty?.(); }}
                className={`flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg py-2 text-[12px] font-[500] transition-all active:opacity-80 ${
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
    </div>
  );
});
