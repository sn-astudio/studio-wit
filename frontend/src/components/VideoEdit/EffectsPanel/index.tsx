"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from "react";
import { Check, Download, Globe, Loader2, Lock, Save } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Button } from "@/components/ui/Button";
import { useNotifyOnComplete } from "@/hooks/useNotifyOnComplete";
import {
  useSpeedVideo,
  useReverseVideo,
  useChangeResolution,
  useChangeFps,
} from "@/hooks/queries/useVideoEdit";

import { useVideoEditStore } from "@/stores/videoEditStore";
import type { EffectsPanelProps, EffectsPanelRef } from "./types";

const SPEED_PRESETS = [0.25, 0.5, 1, 2, 4];
const RESOLUTION_PRESETS = ["480p", "720p", "1080p", "1440p", "4k"];
const FPS_PRESETS = [24, 30, 48, 60];

export const EffectsPanel = forwardRef<EffectsPanelRef, EffectsPanelProps>(function EffectsPanel({
  sourceUrl,
  onEffectApplied,
  onPreviewSpeed,
  onDirty,
  onStateChange,
  category,
}, ref) {
  const t = useTranslations("VideoEdit");
  const notify = useNotifyOnComplete();

  const speed = useVideoEditStore((s) => s.effects.speed);
  const resolution = useVideoEditStore((s) => s.effects.resolution);
  const targetFps = useVideoEditStore((s) => s.effects.targetFps);
  const setEffect = useVideoEditStore((s) => s.setEffect);

  const setSpeed = (v: number) => setEffect("speed", v);
  const setResolution = (v: string) => setEffect("resolution", v);
  const setTargetFps = (v: number) => setEffect("targetFps", v);

  const [reverse, setReverse] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [pendingResult, setPendingResult] = useState<string | null>(null);
  const [isPublicSave, setIsPublicSave] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // 실시간 속도 프리뷰
  useEffect(() => {
    onPreviewSpeed?.(speed);
  }, [speed, onPreviewSpeed]);

  // 변경 감지
  useEffect(() => {
    if (speed !== 1) onDirty?.();
  }, [speed, onDirty]);

  const speedMutation = useSpeedVideo();
  const reverseMutation = useReverseVideo();
  const resolutionMutation = useChangeResolution();
  const fpsMutation = useChangeFps();

  const isPending = speedMutation.isPending || reverseMutation.isPending || resolutionMutation.isPending || fpsMutation.isPending;

  const hasChanges = speed !== 1 || reverse || resolution !== "1080p" || targetFps !== 30;

  useEffect(() => {
    onStateChange?.({ canApply: hasChanges, isPending });
  }, [hasChanges, isPending, onStateChange]);

  const handleReset = useCallback(() => {
    setSpeed(1);
    setReverse(false);
    setResolution("1080p");
    setTargetFps(30);
  }, []);

  const handleApply = useCallback(async () => {
    if (!sourceUrl) return;

    let currentUrl = sourceUrl;

    try {
      // 속도
      if (speed !== 1) {
        const res = await speedMutation.mutateAsync({ source_url: currentUrl, speed });
        currentUrl = res.result_url;
      }
      // 역재생
      if (reverse) {
        const res = await reverseMutation.mutateAsync({ source_url: currentUrl });
        currentUrl = res.result_url;
      }
      // 해상도
      if (resolution !== "1080p") {
        const res = await resolutionMutation.mutateAsync({ source_url: currentUrl, resolution });
        currentUrl = res.result_url;
      }
      // FPS
      if (targetFps !== 30) {
        const res = await fpsMutation.mutateAsync({ source_url: currentUrl, fps: targetFps });
        currentUrl = res.result_url;
      }

      setResultUrl(currentUrl);
      setPendingResult(currentUrl);
      onEffectApplied?.(currentUrl);
      toast.success(t("effectApplied"));
      notify(t("effectApplied"));
      handleReset();
    } catch {
      toast.error(t("effectError"));
    }
  }, [sourceUrl, speed, reverse, resolution, targetFps, speedMutation, reverseMutation, resolutionMutation, fpsMutation, onEffectApplied, t, notify]);

  useImperativeHandle(ref, () => ({
    reset: handleReset,
    apply: handleApply,
  }));

  // DB 저장
  const handleSave = useCallback(async () => {
    if (!pendingResult) return;
    setIsSaving(true);
    try {
      toast.success(t("saved"));
      setPendingResult(null);
    } catch {
      toast.error(t("saveError"));
    } finally {
      setIsSaving(false);
    }
  }, [pendingResult, t]);

  // 로컬 다운로드
  const handleDownload = useCallback(async () => {
    if (!pendingResult) return;
    try {
      const resp = await fetch(pendingResult);
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `effects_${Date.now()}.mp4`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error(t("effectError"));
    }
  }, [pendingResult, t]);

  return (
    <div className="flex flex-col gap-5">
      {/* 속도 */}
      {(!category || category === "speed") && <div className="space-y-2.5">
        <p className="text-[13px] font-[600] text-foreground">{t("effectSpeed")}</p>
        <div className="flex gap-1.5">
          {SPEED_PRESETS.map((s) => (
            <button
              key={s}
              onClick={() => { setSpeed(s); onDirty?.(); }}
              className={`flex flex-1 cursor-pointer items-center justify-center rounded-lg py-2 text-[12px] font-[500] transition-all active:opacity-80 ${
                speed === s
                  ? "bg-foreground text-background"
                  : "bg-neutral-50 text-muted-foreground hover:bg-neutral-100 hover:text-foreground dark:bg-neutral-800/60 dark:hover:bg-neutral-800 dark:hover:text-white"
              }`}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>}

      {/* 역재생 */}
      {(!category || category === "speed") && <div className="space-y-2.5">
        <p className="text-[13px] font-[600] text-foreground">{t("effectReverse")}</p>
        <button
          onClick={() => { setReverse(!reverse); onDirty?.(); }}
          className={`flex w-full cursor-pointer items-center justify-center rounded-lg py-2 text-[12px] font-[500] transition-all active:opacity-80 ${
            reverse
              ? "bg-foreground text-background"
              : "bg-neutral-50 text-muted-foreground hover:bg-neutral-100 hover:text-foreground dark:bg-neutral-800/60 dark:hover:bg-neutral-800 dark:hover:text-white"
          }`}
        >
          {reverse ? t("reverseOn") : t("reverseOff")}
        </button>
      </div>}

      {/* 해상도 */}
      {(!category || category === "output") && <div className="space-y-2.5">
        <p className="text-[13px] font-[600] text-foreground">{t("effectResolution")}</p>
        <div className="flex flex-wrap gap-1.5">
          {RESOLUTION_PRESETS.map((r) => (
            <button
              key={r}
              onClick={() => { setResolution(r); onDirty?.(); }}
              className={`cursor-pointer rounded-lg px-3.5 py-2 text-[12px] font-[500] transition-all active:opacity-80 ${
                resolution === r
                  ? "bg-foreground text-background"
                  : "bg-neutral-50 text-muted-foreground hover:bg-neutral-100 hover:text-foreground dark:bg-neutral-800/60 dark:hover:bg-neutral-800 dark:hover:text-white"
              }`}
            >
              {r.toUpperCase()}
            </button>
          ))}
        </div>
      </div>}

      {/* FPS */}
      {(!category || category === "output") && <div className="space-y-2.5">
        <p className="text-[13px] font-[600] text-foreground">{t("effectFps")}</p>
        <div className="flex gap-1.5">
          {FPS_PRESETS.map((f) => (
            <button
              key={f}
              onClick={() => { setTargetFps(f); onDirty?.(); }}
              className={`flex flex-1 cursor-pointer items-center justify-center rounded-lg py-2 text-[12px] font-[500] transition-all active:opacity-80 ${
                targetFps === f
                  ? "bg-foreground text-background"
                  : "bg-neutral-50 text-muted-foreground hover:bg-neutral-100 hover:text-foreground dark:bg-neutral-800/60 dark:hover:bg-neutral-800 dark:hover:text-white"
              }`}
            >
              {f}fps
            </button>
          ))}
        </div>
      </div>}

      {/* 결과 저장/다운로드 */}
      {pendingResult && (
        <div className="animate-in fade-in slide-in-from-bottom-2 space-y-2.5 rounded-lg border border-primary/30 bg-primary/5 px-3 py-3 duration-200">
          <div className="flex items-center gap-2">
            <div className="flex size-5 items-center justify-center rounded-full bg-primary/20">
              <Check className="size-3 text-primary" />
            </div>
            <p className="text-[12px] font-[500] text-primary">{t("effectApplied")}</p>
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
