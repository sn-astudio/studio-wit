"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Gauge,
  Loader2,
  Palette,
  Undo2,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Slider as SliderPrimitive } from "@base-ui/react/slider";

import { Button } from "@/components/ui/Button";
import {
  useSpeedVideo,
  useReverseVideo,
  useFilterVideo,
} from "@/hooks/queries/useVideoEdit";

import type { EffectsPanelProps } from "./types";

const SPEED_PRESETS = [0.25, 0.5, 1, 2, 4];

const FILTER_PRESETS = [
  { id: "none", labelKey: "filterNone" },
  { id: "grayscale", labelKey: "filterGrayscale" },
  { id: "sepia", labelKey: "filterSepia" },
] as const;

export function EffectsPanel({ sourceUrl, onEffectApplied, onPreviewFilter }: EffectsPanelProps) {
  const t = useTranslations("VideoEdit");

  // 속도
  const [speed, setSpeed] = useState(1);
  // 필터
  const [selectedFilter, setSelectedFilter] = useState<string>("none");
  const [brightness, setBrightness] = useState(0);
  const [contrast, setContrast] = useState(1);
  const [saturation, setSaturation] = useState(1);
  // 결과
  const [resultUrl, setResultUrl] = useState<string | null>(null);

  // 실시간 CSS filter 프리뷰
  useEffect(() => {
    const parts: string[] = [];
    // brightness: ffmpeg -1~1 → CSS 0~2 (0=검정, 1=원본, 2=밝음)
    parts.push(`brightness(${1 + brightness})`);
    // contrast: ffmpeg 0~3 → CSS 동일
    parts.push(`contrast(${contrast})`);
    // saturation → CSS saturate
    parts.push(`saturate(${saturation})`);
    // 프리셋 필터
    if (selectedFilter === "grayscale") parts.push("grayscale(1)");
    if (selectedFilter === "sepia") parts.push("sepia(1)");

    const cssFilter = parts.join(" ");
    onPreviewFilter?.(cssFilter === "brightness(1) contrast(1) saturate(1)" ? "" : cssFilter);
  }, [selectedFilter, brightness, contrast, saturation, onPreviewFilter]);

  const speedMutation = useSpeedVideo();
  const reverseMutation = useReverseVideo();
  const filterMutation = useFilterVideo();

  const isPending =
    speedMutation.isPending || reverseMutation.isPending || filterMutation.isPending;

  const handleApplySpeed = useCallback(async () => {
    if (!sourceUrl || speed === 1) return;
    try {
      const result = await speedMutation.mutateAsync({
        source_url: sourceUrl,
        speed,
      });
      setResultUrl(result.result_url);
      onEffectApplied?.(result.result_url);
      toast.success(t("effectApplied"));
    } catch {
      toast.error(t("effectError"));
    }
  }, [sourceUrl, speed, speedMutation, onEffectApplied, t]);

  const handleReverse = useCallback(async () => {
    if (!sourceUrl) return;
    try {
      const result = await reverseMutation.mutateAsync({
        source_url: sourceUrl,
      });
      setResultUrl(result.result_url);
      onEffectApplied?.(result.result_url);
      toast.success(t("effectApplied"));
    } catch {
      toast.error(t("effectError"));
    }
  }, [sourceUrl, reverseMutation, onEffectApplied, t]);

  const handleApplyFilter = useCallback(async () => {
    if (!sourceUrl) return;

    const isAdjust =
      brightness !== 0 || contrast !== 1 || saturation !== 1;
    const filterName =
      selectedFilter !== "none" ? selectedFilter : isAdjust ? "adjust" : null;

    if (!filterName) return;

    try {
      const result = await filterMutation.mutateAsync({
        source_url: sourceUrl,
        filter_name: filterName,
        params:
          filterName === "adjust"
            ? { brightness, contrast, saturation }
            : undefined,
      });
      setResultUrl(result.result_url);
      onEffectApplied?.(result.result_url);
      toast.success(t("effectApplied"));
    } catch {
      toast.error(t("effectError"));
    }
  }, [
    sourceUrl,
    selectedFilter,
    brightness,
    contrast,
    saturation,
    filterMutation,
    onEffectApplied,
    t,
  ]);

  return (
    <div className="space-y-4">
      {/* 속도 변경 */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Gauge className="size-3.5 text-zinc-400" />
          <span className="text-xs font-medium">{t("effectSpeed")}</span>
          <span className="ml-auto text-xs tabular-nums text-zinc-400">
            {speed}x
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {SPEED_PRESETS.map((s) => (
            <button
              key={s}
              onClick={() => setSpeed(s)}
              className={`rounded-md px-2 py-1 text-xs transition-colors ${
                speed === s
                  ? "bg-primary text-primary-foreground"
                  : "bg-zinc-800/60 text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {s}x
            </button>
          ))}
        </div>
        <Button
          size="sm"
          variant="outline"
          className="w-full gap-1.5"
          onClick={handleApplySpeed}
          disabled={!sourceUrl || speed === 1 || isPending}
        >
          {speedMutation.isPending ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Gauge className="size-3.5" />
          )}
          {t("applySpeed")}
        </Button>
      </div>

      {/* 역재생 */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Undo2 className="size-3.5 text-zinc-400" />
          <span className="text-xs font-medium">{t("effectReverse")}</span>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="w-full gap-1.5"
          onClick={handleReverse}
          disabled={!sourceUrl || isPending}
        >
          {reverseMutation.isPending ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Undo2 className="size-3.5" />
          )}
          {t("applyReverse")}
        </Button>
      </div>

      {/* 필터 / 색보정 */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Palette className="size-3.5 text-zinc-400" />
          <span className="text-xs font-medium">{t("effectFilter")}</span>
        </div>

        {/* 프리셋 버튼 */}
        <div className="flex gap-1.5">
          {FILTER_PRESETS.map((f) => (
            <button
              key={f.id}
              onClick={() => setSelectedFilter(f.id)}
              className={`rounded-md px-2.5 py-1 text-xs transition-colors ${
                selectedFilter === f.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-zinc-800/60 text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {t(f.labelKey)}
            </button>
          ))}
        </div>

        {/* 색보정 슬라이더 */}
        <div className="space-y-1.5">
          <SliderControl
            label={t("brightness")}
            value={brightness}
            min={-1}
            max={1}
            step={0.1}
            onChange={setBrightness}
          />
          <SliderControl
            label={t("contrast")}
            value={contrast}
            min={0}
            max={3}
            step={0.1}
            onChange={setContrast}
          />
          <SliderControl
            label={t("saturation")}
            value={saturation}
            min={0}
            max={3}
            step={0.1}
            onChange={setSaturation}
          />
        </div>

        <Button
          size="sm"
          variant="outline"
          className="w-full gap-1.5"
          onClick={handleApplyFilter}
          disabled={
            !sourceUrl ||
            isPending ||
            (selectedFilter === "none" &&
              brightness === 0 &&
              contrast === 1 &&
              saturation === 1)
          }
        >
          {filterMutation.isPending ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Palette className="size-3.5" />
          )}
          {t("applyFilter")}
        </Button>
      </div>

    </div>
  );
}

/** 슬라이더 컨트롤 */
function SliderControl({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-16 text-[11px] text-zinc-500">{label}</span>
      <SliderPrimitive.Root
        value={value}
        onValueChange={(v) => onChange(v as number)}
        min={min}
        max={max}
        step={step}
        className="flex-1"
      >
        <SliderPrimitive.Control className="relative flex h-4 w-full cursor-pointer items-center">
          <SliderPrimitive.Track className="h-1 w-full rounded-full bg-zinc-800">
            <SliderPrimitive.Indicator className="rounded-full bg-primary" />
          </SliderPrimitive.Track>
          <SliderPrimitive.Thumb className="block size-3 rounded-full border-2 border-primary bg-background shadow-sm" />
        </SliderPrimitive.Control>
      </SliderPrimitive.Root>
      <span className="w-8 text-right text-[11px] tabular-nums text-zinc-400">
        {value.toFixed(1)}
      </span>
    </div>
  );
}
