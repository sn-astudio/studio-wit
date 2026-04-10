"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from "react";
import { Check, ChevronDown, Loader2, Palette } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Button } from "@/components/ui/Button";
import { useNotifyOnComplete } from "@/hooks/useNotifyOnComplete";
import { useFilterVideo } from "@/hooks/queries/useVideoEdit";
import { useVideoEditStore } from "@/stores/videoEditStore";

import type { FilterPanelProps, FilterPanelRef } from "./types";

// ── 필터 카테고리별 프리셋 ──

const COLOR_FILTERS = [
  { id: "none", labelKey: "filterNone" },
  { id: "grayscale", labelKey: "filterGrayscale" },
  { id: "sepia", labelKey: "filterSepia" },
] as const;

const CINEMATIC_FILTERS = [
  { id: "cinematic", labelKey: "filterCinematic" },
  { id: "faded", labelKey: "filterFaded" },
  { id: "noir", labelKey: "filterNoir" },
  { id: "bleach", labelKey: "filterBleach" },
] as const;

const VINTAGE_FILTERS = [
  { id: "vhs", labelKey: "filterVhs" },
  { id: "8mm", labelKey: "filter8mm" },
  { id: "bw_film", labelKey: "filterBwFilm" },
  { id: "retro70", labelKey: "filterRetro70" },
] as const;

const MOOD_FILTERS = [
  { id: "warm", labelKey: "filterWarm" },
  { id: "cool", labelKey: "filterCool" },
  { id: "instagram", labelKey: "filterInstagram" },
  { id: "oversaturated", labelKey: "filterOversaturated" },
] as const;

const FUN_FILTERS = [
  { id: "glitch", labelKey: "filterGlitch" },
  { id: "mirror", labelKey: "filterMirror" },
  { id: "kaleidoscope", labelKey: "filterKaleidoscope" },
  { id: "cartoon", labelKey: "filterCartoon" },
  { id: "emboss", labelKey: "filterEmboss" },
  { id: "edge_glow", labelKey: "filterEdgeGlow" },
  { id: "pixelize", labelKey: "filterPixelize" },
  { id: "thermal", labelKey: "filterThermal" },
  { id: "negative", labelKey: "filterNegative" },
  { id: "posterize", labelKey: "filterPosterize" },
  { id: "sharpen", labelKey: "filterSharpen" },
  { id: "blur", labelKey: "filterBlur" },
  { id: "boomerang", labelKey: "filterBoomerang" },
  { id: "timelapse", labelKey: "filterTimelapse" },
] as const;

const FILTER_CATEGORIES = [
  { id: "color", labelKey: "categoryColor", filters: COLOR_FILTERS },
  { id: "cinematic", labelKey: "categoryCinematic", filters: CINEMATIC_FILTERS },
  { id: "vintage", labelKey: "categoryVintage", filters: VINTAGE_FILTERS },
  { id: "mood", labelKey: "categoryMood", filters: MOOD_FILTERS },
  { id: "fun", labelKey: "categoryFun", filters: FUN_FILTERS },
] as const;

// ── CSS 프리뷰 매핑 ──

function getCssPreview(filterId: string, brightness: number, contrast: number, saturation: number): string {
  const parts: string[] = [];
  parts.push(`brightness(${1 + brightness})`);
  parts.push(`contrast(${contrast})`);
  parts.push(`saturate(${saturation})`);

  const map: Record<string, string> = {
    grayscale: "grayscale(1)",
    sepia: "sepia(1)",
    vhs: "saturate(0.7) contrast(1.2) brightness(1.05)",
    "8mm": "saturate(0.8) contrast(1.3) brightness(1.08) sepia(0.2)",
    bw_film: "grayscale(1) contrast(1.4) brightness(1.02)",
    retro70: "saturate(0.6) contrast(1.1) brightness(1.05) sepia(0.15)",
    instagram: "saturate(1.3) contrast(1.25) brightness(1.03)",
    cool: "saturate(0.85) contrast(1.1) hue-rotate(10deg)",
    warm: "saturate(1.1) contrast(1.05) brightness(1.03) sepia(0.1)",
    cinematic: "saturate(0.9) contrast(1.2) brightness(0.98)",
    faded: "saturate(0.7) contrast(0.9) brightness(1.1)",
    noir: "grayscale(1) contrast(1.6) brightness(0.97)",
    oversaturated: "saturate(1.8) contrast(1.15)",
    bleach: "saturate(0.4) contrast(1.5) brightness(0.98)",
    glitch: "saturate(1.2) contrast(1.3) hue-rotate(90deg)",
    cartoon: "saturate(1.5) contrast(1.3)",
    emboss: "contrast(2) brightness(1.2) grayscale(0.5)",
    edge_glow: "saturate(2) brightness(1.1) contrast(1.5)",
    thermal: "hue-rotate(180deg) saturate(1.5) contrast(1.3)",
    negative: "invert(1)",
    posterize: "saturate(1.3) contrast(1.2)",
    sharpen: "contrast(1.1)",
    blur: "blur(5px)",
  };

  if (map[filterId]) parts.push(map[filterId]);

  const css = parts.join(" ");
  return css === "brightness(1) contrast(1) saturate(1)" ? "" : css;
}

// ── 아코디언 섹션 ──

function AccordionSection({
  icon,
  label,
  open,
  onToggle,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-neutral-200 dark:border-neutral-800">
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium"
      >
        {icon}
        <span className="flex-1">{label}</span>
        <ChevronDown className={`size-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="space-y-3 px-3 pb-3">{children}</div>}
    </div>
  );
}

// ── FilterPanel ──

export const FilterPanel = forwardRef<FilterPanelRef, FilterPanelProps>(function FilterPanel({ sourceUrl, onEffectApplied, onPreviewFilter, onDirty, category, onStateChange }, ref) {
  const t = useTranslations("VideoEdit");
  const notify = useNotifyOnComplete();

  const selectedFilter = useVideoEditStore((s) => s.effects.selectedFilter);
  const brightness = useVideoEditStore((s) => s.effects.brightness);
  const contrast = useVideoEditStore((s) => s.effects.contrast);
  const saturation = useVideoEditStore((s) => s.effects.saturation);
  const setEffect = useVideoEditStore((s) => s.setEffect);

  const filterMutation = useFilterVideo();
  const isPending = filterMutation.isPending;

  const [openSection, setOpenSection] = useState<string | null>("color");
  const toggle = (id: string) => setOpenSection((prev) => (prev === id ? null : id));

  // 카테고리별 필터 목록
  const activeCat = category ? FILTER_CATEGORIES.find((c) => c.id === category) : null;

  // CSS 프리뷰 업데이트
  useEffect(() => {
    const css = getCssPreview(selectedFilter, brightness, contrast, saturation);
    onPreviewFilter?.(css);
  }, [selectedFilter, brightness, contrast, saturation, onPreviewFilter]);

  // 필터 적용
  const handleApply = useCallback(async () => {
    if (!sourceUrl) return;
    try {
      const filterName = selectedFilter === "none" ? "adjust" : selectedFilter;
      const result = await filterMutation.mutateAsync({
        source_url: sourceUrl,
        filter_name: filterName,
        params: { brightness, contrast, saturation },
      });
      onEffectApplied?.(result.result_url);
    } catch {
      toast.error(t("effectError"));
    }
  }, [sourceUrl, selectedFilter, brightness, contrast, saturation, filterMutation, onEffectApplied, t, notify]);

  const handleReset = useCallback(() => {
    setEffect("selectedFilter", "none");
    setEffect("brightness", 0);
    setEffect("contrast", 1);
    setEffect("saturation", 1);
  }, [setEffect]);

  const isDefault = selectedFilter === "none" && brightness === 0 && contrast === 1 && saturation === 1;

  useImperativeHandle(ref, () => ({
    reset: handleReset,
    apply: handleApply,
  }));

  useEffect(() => {
    onStateChange?.({ canApply: !isDefault, isPending });
  }, [isDefault, isPending, onStateChange]);

  // 소도구 모드: 특정 카테고리만 플랫 레이아웃으로 표시
  if (category) {
    return (
      <div className="flex flex-col gap-4">
        {/* 색보정은 항상 슬라이더 포함 */}
        {category === "color" && (
          <div className="space-y-4">
            <p className="text-[13px] font-[600] text-foreground">{t("categoryColor")}</p>
            {[
              { key: "brightness" as const, label: t("brightness"), min: -0.5, max: 0.5, step: 0.01 },
              { key: "contrast" as const, label: t("contrast"), min: 0.5, max: 1.5, step: 0.01 },
              { key: "saturation" as const, label: t("saturation"), min: 0, max: 2.0, step: 0.01 },
            ].map(({ key, label, min, max, step }) => {
              const val = key === "brightness" ? brightness : key === "contrast" ? contrast : saturation;
              return (
                <div key={key} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[12px] font-[500] text-muted-foreground">{label}</label>
                    <span className="text-[11px] tabular-nums text-muted-foreground/60">{Math.round((key === "brightness" ? 1 + val : val) * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min={min}
                    max={max}
                    step={step}
                    value={val}
                    onChange={(e) => { setEffect(key, Number(e.target.value)); onDirty?.(); }}
                    className="filter-slider h-1.5 w-full cursor-pointer appearance-none rounded-full bg-neutral-300 accent-white dark:bg-neutral-700"
                    style={{ "--slider-pct": `${((val - min) / (max - min)) * 100}%` } as React.CSSProperties}
                  />
                </div>
              );
            })}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {COLOR_FILTERS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => { setEffect("selectedFilter", f.id); onDirty?.(); }}
                  className={`rounded-lg px-3 py-1.5 text-[12px] font-[500] transition-all active:opacity-80 ${
                    selectedFilter === f.id
                      ? "bg-foreground text-background"
                      : "bg-neutral-50 text-muted-foreground hover:bg-neutral-100 hover:text-foreground dark:bg-neutral-800/60 dark:hover:bg-neutral-800 dark:hover:text-white"
                  }`}
                >
                  {t(f.labelKey)}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 다른 카테고리: 필터 프리셋 버튼 */}
        {category !== "color" && activeCat && (
          <div>
            <p className="mb-3 text-[13px] font-[600] text-foreground">{t(activeCat.labelKey)}</p>
            <div className="flex flex-wrap gap-1.5">
              {activeCat.filters.map((f) => (
                <button
                  key={f.id}
                  onClick={() => { setEffect("selectedFilter", f.id); onDirty?.(); }}
                  className={`rounded-lg px-3.5 py-2 text-[12px] font-[500] transition-all active:opacity-80 ${
                    selectedFilter === f.id
                      ? "bg-foreground text-background"
                      : "bg-neutral-50 text-muted-foreground hover:bg-neutral-100 hover:text-foreground dark:bg-neutral-800/60 dark:hover:bg-neutral-800 dark:hover:text-white"
                  }`}
                >
                  {t(f.labelKey)}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // 기존 아코디언 모드 (fallback)
  return (
    <div className="space-y-1">
      {/* 색보정 슬라이더 */}
      <AccordionSection
        icon={<Palette className="size-3.5" />}
        label={t("categoryColor")}
        open={openSection === "color"}
        onToggle={() => toggle("color")}
      >
        <div className="space-y-3">
          {[
            { key: "brightness" as const, label: t("brightness"), min: 0.5, max: 1.5, step: 0.01, val: brightness },
            { key: "contrast" as const, label: t("contrast"), min: 0.5, max: 1.5, step: 0.01, val: contrast },
            { key: "saturation" as const, label: t("saturation"), min: 0, max: 2, step: 0.01, val: saturation },
          ].map(({ key, label, min, max, step, val }) => (
            <div key={key} className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[12px] font-[500] text-muted-foreground">{label}</label>
                <span className="text-[11px] tabular-nums text-muted-foreground/60">{Math.round(val * 100)}%</span>
              </div>
              <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={val}
                onChange={(e) => { setEffect(key, Number(e.target.value)); onDirty?.(); }}
                className="filter-slider h-1.5 w-full cursor-pointer appearance-none rounded-full bg-neutral-300 accent-white dark:bg-neutral-700"
                style={{ "--slider-pct": `${((val - min) / (max - min)) * 100}%` } as React.CSSProperties}
              />
            </div>
          ))}

          {/* 기본 색보정 필터 */}
          <div className="flex flex-wrap gap-1.5">
            {COLOR_FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => { setEffect("selectedFilter", f.id); onDirty?.(); }}
                className={`rounded-md border px-2.5 py-1 text-xs transition-colors ${
                  selectedFilter === f.id
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-neutral-200 hover:border-neutral-400 dark:border-neutral-700 dark:hover:border-neutral-500"
                }`}
              >
                {selectedFilter === f.id && <Check className="mr-1 inline size-3" />}
                {t(f.labelKey)}
              </button>
            ))}
          </div>
        </div>
      </AccordionSection>

      {/* 나머지 카테고리 (시네마틱, 빈티지, 분위기, 재미) */}
      {FILTER_CATEGORIES.slice(1).map((cat) => (
        <AccordionSection
          key={cat.id}
          icon={<Palette className="size-3.5" />}
          label={t(cat.labelKey)}
          open={openSection === cat.id}
          onToggle={() => toggle(cat.id)}
        >
          <div className="flex flex-wrap gap-1.5">
            {cat.filters.map((f) => (
              <button
                key={f.id}
                onClick={() => { setEffect("selectedFilter", f.id); onDirty?.(); }}
                className={`rounded-md border px-2.5 py-1 text-xs transition-colors ${
                  selectedFilter === f.id
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-neutral-200 hover:border-neutral-400 dark:border-neutral-700 dark:hover:border-neutral-500"
                }`}
              >
                {selectedFilter === f.id && <Check className="mr-1 inline size-3" />}
                {t(f.labelKey)}
              </button>
            ))}
          </div>
        </AccordionSection>
      ))}

      {/* 적용 버튼 */}
      <Button
        size="sm"
        className="w-full gap-1.5"
        onClick={handleApply}
        disabled={!sourceUrl || isPending}
      >
        {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
        {t("generate")}
      </Button>
    </div>
  );
});
