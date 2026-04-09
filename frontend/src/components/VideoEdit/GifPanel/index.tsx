"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { useNotifyOnComplete } from "@/hooks/useNotifyOnComplete";
import { useVideoToGif } from "@/hooks/queries/useVideoEdit";

import type { GifPanelProps, GifPanelRef } from "./types";

const WIDTH_PRESETS = [240, 360, 480, 640, 800];
const FPS_PRESETS = [10, 15, 20, 25, 30];

export const GifPanel = forwardRef<GifPanelRef, GifPanelProps>(function GifPanel({
  sourceUrl,
  onDirty,
  onStateChange,
}, ref) {
  const t = useTranslations("VideoEdit");
  const notify = useNotifyOnComplete();
  const gifMutation = useVideoToGif();

  const [gifStart, setGifStart] = useState(0);
  const [gifEnd, setGifEnd] = useState(5);
  const [gifWidth, setGifWidth] = useState(480);
  const [gifFps, setGifFps] = useState(15);

  const hasChanges = gifStart !== 0 || gifEnd !== 5 || gifWidth !== 480 || gifFps !== 15;
  const canApply = !!sourceUrl && hasChanges && !gifMutation.isPending;

  useEffect(() => {
    onStateChange?.({ canApply, isPending: gifMutation.isPending });
  }, [canApply, gifMutation.isPending, onStateChange]);

  const handleApply = useCallback(async () => {
    if (!sourceUrl) return;
    try {
      const result = await gifMutation.mutateAsync({
        source_url: sourceUrl,
        start_time: gifStart > 0 ? gifStart : undefined,
        end_time: gifEnd > 0 ? gifEnd : undefined,
        width: gifWidth,
        fps: gifFps,
      });
      const resp = await fetch(result.gif_url);
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `video_${Date.now()}.gif`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(t("gifCreated"));
      notify(t("gifCreated"));
    } catch {
      toast.error(t("gifError"));
    }
  }, [sourceUrl, gifStart, gifEnd, gifWidth, gifFps, gifMutation, t, notify]);

  const handleReset = useCallback(() => {
    setGifStart(0);
    setGifEnd(5);
    setGifWidth(480);
    setGifFps(15);
  }, []);

  useImperativeHandle(ref, () => ({ reset: handleReset, apply: handleApply }), [handleReset, handleApply]);

  return (
    <div className="flex flex-col gap-5">
      {/* 구간 설정 */}
      <div className="space-y-2.5">
        <p className="text-[13px] font-[600] text-foreground">{t("gifRange")}</p>
        <p className="text-[12px] text-muted-foreground/60">{t("gifDesc")}</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <span className="text-[12px] text-muted-foreground">{t("gifStart")}</span>
            <input
              type="number"
              min={0}
              step={0.1}
              value={gifStart}
              onChange={(e) => { setGifStart(Number(e.target.value)); onDirty?.(); }}
              className="h-9 w-full rounded-lg bg-neutral-50 px-3 text-[13px] tabular-nums text-foreground focus:outline-none dark:bg-neutral-800/60"
            />
          </div>
          <div className="space-y-1.5">
            <span className="text-[12px] text-muted-foreground">{t("gifEnd")}</span>
            <input
              type="number"
              min={0}
              step={0.1}
              value={gifEnd}
              onChange={(e) => { setGifEnd(Number(e.target.value)); onDirty?.(); }}
              className="h-9 w-full rounded-lg bg-neutral-50 px-3 text-[13px] tabular-nums text-foreground focus:outline-none dark:bg-neutral-800/60"
            />
          </div>
        </div>
      </div>

      {/* 가로 크기 */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-[600] text-foreground">{t("gifWidth")}</span>
          <span className="text-[12px] font-[500] tabular-nums text-muted-foreground">{gifWidth}px</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {WIDTH_PRESETS.map((w) => (
            <button
              key={w}
              onClick={() => { setGifWidth(w); onDirty?.(); }}
              className={`cursor-pointer rounded-lg px-3.5 py-2 text-[12px] font-[500] transition-all active:opacity-80 ${
                gifWidth === w
                  ? "bg-foreground text-background"
                  : "bg-neutral-50 text-muted-foreground hover:bg-neutral-100 hover:text-foreground dark:bg-neutral-800/60 dark:hover:bg-neutral-800 dark:hover:text-white"
              }`}
            >
              {w}px
            </button>
          ))}
        </div>
        <input
          type="range"
          min={120}
          max={1280}
          step={10}
          value={gifWidth}
          onChange={(e) => { setGifWidth(Number(e.target.value)); onDirty?.(); }}
          className="filter-slider h-1.5 w-full cursor-pointer appearance-none rounded-full bg-neutral-300 accent-white dark:bg-neutral-700"
          style={{ "--slider-pct": `${((gifWidth - 120) / (1280 - 120)) * 100}%` } as React.CSSProperties}
        />
      </div>

      {/* FPS */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-[600] text-foreground">{t("gifFps")}</span>
          <span className="text-[12px] font-[500] tabular-nums text-muted-foreground">{gifFps}</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {FPS_PRESETS.map((f) => (
            <button
              key={f}
              onClick={() => { setGifFps(f); onDirty?.(); }}
              className={`cursor-pointer rounded-lg px-3.5 py-2 text-[12px] font-[500] transition-all active:opacity-80 ${
                gifFps === f
                  ? "bg-foreground text-background"
                  : "bg-neutral-50 text-muted-foreground hover:bg-neutral-100 hover:text-foreground dark:bg-neutral-800/60 dark:hover:bg-neutral-800 dark:hover:text-white"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
});
