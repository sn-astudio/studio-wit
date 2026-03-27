"use client";

import { useCallback, useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Slider as SliderPrimitive } from "@base-ui/react/slider";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useNotifyOnComplete } from "@/hooks/useNotifyOnComplete";
import { useVideoToGif } from "@/hooks/queries/useVideoEdit";

import type { GifPanelProps } from "./types";

const WIDTH_PRESETS = [240, 360, 480, 640, 800];
const FPS_PRESETS = [10, 15, 20, 25, 30];

export function GifPanel({ sourceUrl, onDirty }: GifPanelProps) {
  const t = useTranslations("VideoEdit");
  const notify = useNotifyOnComplete();
  const gifMutation = useVideoToGif();

  const [gifStart, setGifStart] = useState(0);
  const [gifEnd, setGifEnd] = useState(5);
  const [gifWidth, setGifWidth] = useState(480);
  const [gifFps, setGifFps] = useState(15);

  const handleCreate = useCallback(async () => {
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

  return (
    <div className="space-y-4">
      <p className="text-xs text-zinc-500">{t("gifDesc")}</p>

      {/* 구간 설정 */}
      <div className="space-y-2">
        <span className="text-xs font-medium">{t("gifRange")}</span>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[11px] text-zinc-500">{t("gifStart")}</label>
            <Input
              type="number"
              min={0}
              step={0.1}
              value={gifStart}
              onChange={(e) => {
                setGifStart(Number(e.target.value));
                onDirty?.();
              }}
              className="h-8 text-xs"
            />
          </div>
          <div>
            <label className="text-[11px] text-zinc-500">{t("gifEnd")}</label>
            <Input
              type="number"
              min={0}
              step={0.1}
              value={gifEnd}
              onChange={(e) => {
                setGifEnd(Number(e.target.value));
                onDirty?.();
              }}
              className="h-8 text-xs"
            />
          </div>
        </div>
      </div>

      {/* 가로 크기 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium">{t("gifWidth")}</span>
          <span className="text-xs tabular-nums text-zinc-400">
            {gifWidth}px
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {WIDTH_PRESETS.map((w) => (
            <button
              key={w}
              type="button"
              className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                gifWidth === w
                  ? "bg-primary text-primary-foreground"
                  : "bg-zinc-200/60 text-zinc-600 hover:bg-zinc-300 dark:bg-zinc-800/60 dark:text-zinc-300 dark:hover:bg-zinc-700"
              }`}
              onClick={() => {
                setGifWidth(w);
                onDirty?.();
              }}
            >
              {w}px
            </button>
          ))}
        </div>
        <SliderPrimitive.Root
          value={gifWidth}
          onValueChange={(v) => {
            setGifWidth(v as number);
            onDirty?.();
          }}
          min={120}
          max={1280}
          step={10}
        >
          <SliderPrimitive.Control className="relative flex h-5 w-full cursor-pointer items-center">
            <SliderPrimitive.Track className="h-1.5 w-full rounded-full bg-zinc-200 dark:bg-zinc-800">
              <SliderPrimitive.Indicator className="rounded-full bg-primary" />
            </SliderPrimitive.Track>
            <SliderPrimitive.Thumb className="block size-4 rounded-full border-2 border-primary bg-background shadow-sm" />
          </SliderPrimitive.Control>
        </SliderPrimitive.Root>
      </div>

      {/* FPS */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium">{t("gifFps")}</span>
          <span className="text-xs tabular-nums text-zinc-400">{gifFps}</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {FPS_PRESETS.map((f) => (
            <button
              key={f}
              type="button"
              className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                gifFps === f
                  ? "bg-primary text-primary-foreground"
                  : "bg-zinc-200/60 text-zinc-600 hover:bg-zinc-300 dark:bg-zinc-800/60 dark:text-zinc-300 dark:hover:bg-zinc-700"
              }`}
              onClick={() => {
                setGifFps(f);
                onDirty?.();
              }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* 생성 버튼 */}
      <Button
        className="w-full gap-1.5"
        onClick={handleCreate}
        disabled={!sourceUrl || gifMutation.isPending}
      >
        {gifMutation.isPending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Download className="size-4" />
        )}
        {t("createGif")}
      </Button>
    </div>
  );
}
