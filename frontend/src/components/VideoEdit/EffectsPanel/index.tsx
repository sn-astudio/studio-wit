"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Check,
  ChevronDown,
  FlipHorizontal2,
  FlipVertical2,
  Gauge,
  ImageIcon,
  RotateCw,
  Timer,
  Layers,
  Loader2,
  Palette,
  Stamp,
  Type,
  Undo2,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Slider as SliderPrimitive } from "@base-ui/react/slider";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useNotifyOnComplete } from "@/hooks/useNotifyOnComplete";
import {
  useSpeedVideo,
  useReverseVideo,
  useFilterVideo,
  useTextOverlayVideo,
  useWatermarkVideo,
  useChangeResolution,
  useRotateVideo,
  useChangeFps,
} from "@/hooks/queries/useVideoEdit";

import { useVideoEditStore } from "@/stores/videoEditStore";
import type { EffectsPanelProps } from "./types";

const SPEED_PRESETS = [0.25, 0.5, 1, 2, 4];
const RESOLUTION_PRESETS = ["480p", "720p", "1080p", "1440p", "4k"];
const FPS_PRESETS = [24, 30, 48, 60];

const POSITION_PRESETS = [
  { id: "top-left", labelKey: "positionTopLeft" },
  { id: "top", labelKey: "positionTop" },
  { id: "top-right", labelKey: "positionTopRight" },
  { id: "center-left", labelKey: "positionCenterLeft" },
  { id: "center", labelKey: "positionCenter" },
  { id: "center-right", labelKey: "positionCenterRight" },
  { id: "bottom-left", labelKey: "positionBottomLeft" },
  { id: "bottom", labelKey: "positionBottom" },
  { id: "bottom-right", labelKey: "positionBottomRight" },
] as const;

const COLOR_PRESETS = [
  { id: "white", label: "White", css: "#ffffff" },
  { id: "black", label: "Black", css: "#000000" },
  { id: "red", label: "Red", css: "#ef4444" },
  { id: "yellow", label: "Yellow", css: "#eab308" },
] as const;

const WM_POSITION_PRESETS = [
  { id: "top-left", labelKey: "wmTopLeft" },
  { id: "top-right", labelKey: "wmTopRight" },
  { id: "bottom-left", labelKey: "wmBottomLeft" },
  { id: "bottom-right", labelKey: "wmBottomRight" },
  { id: "center", labelKey: "wmCenter" },
] as const;

const FILTER_PRESETS = [
  { id: "none", labelKey: "filterNone" },
  { id: "grayscale", labelKey: "filterGrayscale" },
  { id: "sepia", labelKey: "filterSepia" },
  { id: "vhs", labelKey: "filterVhs" },
  { id: "8mm", labelKey: "filter8mm" },
  { id: "bw_film", labelKey: "filterBwFilm" },
  { id: "retro70", labelKey: "filterRetro70" },
  { id: "instagram", labelKey: "filterInstagram" },
  { id: "cool", labelKey: "filterCool" },
  { id: "warm", labelKey: "filterWarm" },
  { id: "cinematic", labelKey: "filterCinematic" },
  { id: "faded", labelKey: "filterFaded" },
  { id: "noir", labelKey: "filterNoir" },
  { id: "oversaturated", labelKey: "filterOversaturated" },
  { id: "bleach", labelKey: "filterBleach" },
  // ── 재미 필터 ──
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

interface TextStylePreset {
  id: string;
  nameKey: string;
  fontSize: number;
  color: string;
  position: string;
  preview: { text: string; border: string; boxBg?: string };
}

const TEXT_STYLE_PRESETS: TextStylePreset[] = [
  {
    id: "default",
    nameKey: "txtPresetDefault",
    fontSize: 36,
    color: "white",
    position: "bottom",
    preview: { text: "#ffffff", border: "#000000" },
  },
  {
    id: "title",
    nameKey: "txtPresetTitle",
    fontSize: 56,
    color: "white",
    position: "center",
    preview: { text: "#ffffff", border: "#000000" },
  },
  {
    id: "caption",
    nameKey: "txtPresetCaption",
    fontSize: 24,
    color: "white",
    position: "bottom",
    preview: { text: "#ffffff", border: "transparent", boxBg: "rgba(0,0,0,0.6)" },
  },
  {
    id: "highlight",
    nameKey: "txtPresetHighlight",
    fontSize: 42,
    color: "#eab308",
    position: "center",
    preview: { text: "#eab308", border: "#000000" },
  },
  {
    id: "neon",
    nameKey: "txtPresetNeon",
    fontSize: 40,
    color: "#39ff14",
    position: "center",
    preview: { text: "#39ff14", border: "#ff00ff" },
  },
  {
    id: "cinematic",
    nameKey: "txtPresetCinematic",
    fontSize: 48,
    color: "white",
    position: "bottom",
    preview: { text: "#ffffff", border: "transparent", boxBg: "rgba(0,0,0,0.5)" },
  },
];

export function EffectsPanel({ sourceUrl, onEffectApplied, onPreviewFilter, onPreviewTextOverlay, onPreviewWatermark, onPreviewSpeed, onDirty }: EffectsPanelProps) {
  const t = useTranslations("VideoEdit");
  const notify = useNotifyOnComplete();

  // 스토어에서 이펙트 상태 읽기
  const speed = useVideoEditStore((s) => s.effects.speed);
  const selectedFilter = useVideoEditStore((s) => s.effects.selectedFilter);
  const brightness = useVideoEditStore((s) => s.effects.brightness);
  const contrast = useVideoEditStore((s) => s.effects.contrast);
  const saturation = useVideoEditStore((s) => s.effects.saturation);
  const overlayText = useVideoEditStore((s) => s.effects.overlayText);
  const textPosition = useVideoEditStore((s) => s.effects.textPosition);
  const fontSize = useVideoEditStore((s) => s.effects.fontSize);
  const textColor = useVideoEditStore((s) => s.effects.textColor);
  const selectedTextPreset = useVideoEditStore((s) => s.effects.selectedTextPreset);
  const wmMode = useVideoEditStore((s) => s.effects.wmMode);
  const wmText = useVideoEditStore((s) => s.effects.wmText);
  const wmPosition = useVideoEditStore((s) => s.effects.wmPosition);
  const wmOpacity = useVideoEditStore((s) => s.effects.wmOpacity);
  const wmFontSize = useVideoEditStore((s) => s.effects.wmFontSize);
  const wmColor = useVideoEditStore((s) => s.effects.wmColor);
  const wmImageScale = useVideoEditStore((s) => s.effects.wmImageScale);
  const resolution = useVideoEditStore((s) => s.effects.resolution);
  const rotateTransform = useVideoEditStore((s) => s.effects.rotateTransform);
  const targetFps = useVideoEditStore((s) => s.effects.targetFps);
  const setEffect = useVideoEditStore((s) => s.setEffect);
  const setEffects = useVideoEditStore((s) => s.setEffects);

  // setter 헬퍼
  const setSpeed = (v: number) => setEffect("speed", v);
  const setSelectedFilter = (v: string) => setEffect("selectedFilter", v);
  const setBrightness = (v: number) => setEffect("brightness", v);
  const setContrast = (v: number) => setEffect("contrast", v);
  const setSaturation = (v: number) => setEffect("saturation", v);
  const setOverlayText = (v: string) => setEffect("overlayText", v);
  const setTextPosition = (v: string) => setEffect("textPosition", v);
  const setFontSize = (v: number) => setEffect("fontSize", v);
  const setTextColor = (v: string) => setEffect("textColor", v);
  const setSelectedTextPreset = (v: string) => setEffect("selectedTextPreset", v);
  const setWmMode = (v: "text" | "image") => setEffect("wmMode", v);
  const setWmText = (v: string) => setEffect("wmText", v);
  const setWmPosition = (v: string) => setEffect("wmPosition", v);
  const setWmOpacity = (v: number) => setEffect("wmOpacity", v);
  const setWmFontSize = (v: number) => setEffect("wmFontSize", v);
  const setWmColor = (v: string) => setEffect("wmColor", v);
  const setWmImageScale = (v: number) => setEffect("wmImageScale", v);
  const setResolution = (v: string) => setEffect("resolution", v);
  const setRotateTransform = (v: string | null) => setEffect("rotateTransform", v);
  const setTargetFps = (v: number) => setEffect("targetFps", v);

  // 로컬 전용 상태 (히스토리에 포함 안 됨)
  const [wmImageFile, setWmImageFile] = useState<File | null>(null);
  const [batchChecked, setBatchChecked] = useState<Record<string, boolean>>({});
  const toggleBatch = (id: string) => setBatchChecked((prev) => ({ ...prev, [id]: !prev[id] }));
  const [resultUrl, setResultUrl] = useState<string | null>(null);

  // 변경 감지
  useEffect(() => {
    if (speed !== 1 || selectedFilter !== "none" || brightness !== 0 || contrast !== 1 || saturation !== 1) {
      onDirty?.();
    }
  }, [speed, selectedFilter, brightness, contrast, saturation, onDirty]);

  // 실시간 CSS filter 프리뷰
  useEffect(() => {
    const parts: string[] = [];
    // brightness: ffmpeg -1~1 → CSS 0~2 (0=검정, 1=원본, 2=밝음)
    parts.push(`brightness(${1 + brightness})`);
    // contrast: ffmpeg 0~3 → CSS 동일
    parts.push(`contrast(${contrast})`);
    // saturation → CSS saturate
    parts.push(`saturate(${saturation})`);
    // 프리셋 필터 — CSS 근사 프리뷰
    if (selectedFilter === "grayscale") parts.push("grayscale(1)");
    else if (selectedFilter === "sepia") parts.push("sepia(1)");
    else if (selectedFilter === "vhs") { parts.push("saturate(0.7) contrast(1.2) brightness(1.05)"); }
    else if (selectedFilter === "8mm") { parts.push("saturate(0.8) contrast(1.3) brightness(1.08) sepia(0.2)"); }
    else if (selectedFilter === "bw_film") { parts.push("grayscale(1) contrast(1.4) brightness(1.02)"); }
    else if (selectedFilter === "retro70") { parts.push("saturate(0.6) contrast(1.1) brightness(1.05) sepia(0.15)"); }
    else if (selectedFilter === "instagram") { parts.push("saturate(1.3) contrast(1.25) brightness(1.03)"); }
    else if (selectedFilter === "cool") { parts.push("saturate(0.85) contrast(1.1) hue-rotate(10deg)"); }
    else if (selectedFilter === "warm") { parts.push("saturate(1.1) contrast(1.05) brightness(1.03) sepia(0.1)"); }
    else if (selectedFilter === "cinematic") { parts.push("saturate(0.9) contrast(1.2) brightness(0.98)"); }
    else if (selectedFilter === "faded") { parts.push("saturate(0.7) contrast(0.9) brightness(1.1)"); }
    else if (selectedFilter === "noir") { parts.push("grayscale(1) contrast(1.6) brightness(0.97)"); }
    else if (selectedFilter === "oversaturated") { parts.push("saturate(1.8) contrast(1.15)"); }
    else if (selectedFilter === "bleach") { parts.push("saturate(0.4) contrast(1.5) brightness(0.98)"); }
    // 재미 필터 CSS 근사
    else if (selectedFilter === "glitch") { parts.push("saturate(1.2) contrast(1.3) hue-rotate(90deg)"); }
    else if (selectedFilter === "mirror") { /* no CSS preview */ }
    else if (selectedFilter === "kaleidoscope") { /* no CSS preview */ }
    else if (selectedFilter === "cartoon") { parts.push("saturate(1.5) contrast(1.3)"); }
    else if (selectedFilter === "emboss") { parts.push("contrast(2) brightness(1.2) grayscale(0.5)"); }
    else if (selectedFilter === "edge_glow") { parts.push("saturate(2) brightness(1.1) contrast(1.5)"); }
    else if (selectedFilter === "pixelize") { /* handled by backend only */ }
    else if (selectedFilter === "thermal") { parts.push("hue-rotate(180deg) saturate(1.5) contrast(1.3)"); }
    else if (selectedFilter === "negative") { parts.push("invert(1)"); }
    else if (selectedFilter === "posterize") { parts.push("saturate(1.3) contrast(1.2)"); }
    else if (selectedFilter === "sharpen") { parts.push("contrast(1.1)"); }
    else if (selectedFilter === "blur") { parts.push("blur(5px)"); }
    else if (selectedFilter === "boomerang") { /* no CSS preview */ }
    else if (selectedFilter === "timelapse") { /* no CSS preview */ }

    const cssFilter = parts.join(" ");
    onPreviewFilter?.(cssFilter === "brightness(1) contrast(1) saturate(1)" ? "" : cssFilter);
  }, [selectedFilter, brightness, contrast, saturation, onPreviewFilter]);

  // 실시간 텍스트 오버레이 프리뷰
  useEffect(() => {
    if (overlayText.trim()) {
      onPreviewTextOverlay?.({
        text: overlayText,
        position: textPosition as "top" | "center" | "bottom",
        fontSize,
        color: textColor,
      });
    } else {
      onPreviewTextOverlay?.(null);
    }
  }, [overlayText, textPosition, fontSize, textColor, onPreviewTextOverlay]);

  // 실시간 워터마크 프리뷰
  const [wmImagePreviewUrl, setWmImagePreviewUrl] = useState<string | null>(null);
  useEffect(() => {
    if (wmImageFile) {
      const url = URL.createObjectURL(wmImageFile);
      setWmImagePreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    setWmImagePreviewUrl(null);
  }, [wmImageFile]);

  useEffect(() => {
    const hasText = wmMode === "text" && wmText.trim();
    const hasImage = wmMode === "image" && wmImagePreviewUrl;
    if (hasText || hasImage) {
      onPreviewWatermark?.({
        mode: wmMode,
        text: wmMode === "text" ? wmText : undefined,
        imageUrl: wmMode === "image" ? (wmImagePreviewUrl ?? undefined) : undefined,
        position: wmPosition,
        opacity: wmOpacity,
        fontSize: wmFontSize,
        color: wmColor,
        imageScale: wmImageScale,
      });
    } else {
      onPreviewWatermark?.(null);
    }
  }, [wmMode, wmText, wmImagePreviewUrl, wmPosition, wmOpacity, wmFontSize, wmColor, wmImageScale, onPreviewWatermark]);

  // 실시간 속도 프리뷰
  useEffect(() => {
    onPreviewSpeed?.(speed);
  }, [speed, onPreviewSpeed]);

  const speedMutation = useSpeedVideo();
  const reverseMutation = useReverseVideo();
  const filterMutation = useFilterVideo();
  const textOverlayMutation = useTextOverlayVideo();
  const watermarkMutation = useWatermarkVideo();
  const resolutionMutation = useChangeResolution();
  const rotateMutation = useRotateVideo();
  const fpsMutation = useChangeFps();

  const isPending =
    speedMutation.isPending || reverseMutation.isPending || filterMutation.isPending || textOverlayMutation.isPending || watermarkMutation.isPending || resolutionMutation.isPending || rotateMutation.isPending || fpsMutation.isPending;

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
      notify(t("effectApplied"));
    } catch {
      toast.error(t("effectError"));
    }
  }, [sourceUrl, speed, speedMutation, onEffectApplied, t, notify]);

  const handleReverse = useCallback(async () => {
    if (!sourceUrl) return;
    try {
      const result = await reverseMutation.mutateAsync({
        source_url: sourceUrl,
      });
      setResultUrl(result.result_url);
      onEffectApplied?.(result.result_url);
      toast.success(t("effectApplied"));
      notify(t("effectApplied"));
    } catch {
      toast.error(t("effectError"));
    }
  }, [sourceUrl, reverseMutation, onEffectApplied, t, notify]);

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
      notify(t("effectApplied"));
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
    notify,
  ]);

  const handleApplyTextOverlay = useCallback(async () => {
    if (!sourceUrl || !overlayText.trim()) return;
    try {
      const result = await textOverlayMutation.mutateAsync({
        source_url: sourceUrl,
        text: overlayText.trim(),
        position: textPosition as "top" | "center" | "bottom",
        font_size: fontSize,
        color: textColor,
      });
      setResultUrl(result.result_url);
      onEffectApplied?.(result.result_url);
      toast.success(t("effectApplied"));
      notify(t("effectApplied"));
    } catch {
      toast.error(t("effectError"));
    }
  }, [sourceUrl, overlayText, textPosition, fontSize, textColor, textOverlayMutation, onEffectApplied, t, notify]);

  const handleApplyWatermark = useCallback(async () => {
    if (!sourceUrl) return;
    if (wmMode === "text" && !wmText.trim()) return;
    if (wmMode === "image" && !wmImageFile) return;

    try {
      let imageUrl: string | undefined;
      if (wmMode === "image" && wmImageFile) {
        // File → base64 data URL
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
      setResultUrl(result.result_url);
      onEffectApplied?.(result.result_url);
      toast.success(t("effectApplied"));
      notify(t("effectApplied"));
    } catch {
      toast.error(t("effectError"));
    }
  }, [sourceUrl, wmMode, wmText, wmImageFile, wmPosition, wmOpacity, wmFontSize, wmColor, wmImageScale, watermarkMutation, onEffectApplied, t, notify]);

  // 해상도 변환
  const handleResolution = useCallback(async () => {
    if (!sourceUrl) return;
    try {
      const result = await resolutionMutation.mutateAsync({
        source_url: sourceUrl,
        resolution,
      });
      setResultUrl(result.result_url);
      onEffectApplied?.(result.result_url);
      toast.success(t("resolutionApplied"));
      notify(t("resolutionApplied"));
    } catch {
      toast.error(t("effectError"));
    }
  }, [sourceUrl, resolution, resolutionMutation, onEffectApplied, t, notify]);

  // 회전/뒤집기
  const handleRotate = useCallback(async (transform: string) => {
    if (!sourceUrl) return;
    try {
      const result = await rotateMutation.mutateAsync({
        source_url: sourceUrl,
        transform,
      });
      setResultUrl(result.result_url);
      onEffectApplied?.(result.result_url);
      toast.success(t("rotateApplied"));
      notify(t("rotateApplied"));
    } catch {
      toast.error(t("effectError"));
    }
  }, [sourceUrl, rotateMutation, onEffectApplied, t, notify]);

  // FPS 변환
  const handleFps = useCallback(async () => {
    if (!sourceUrl) return;
    try {
      const result = await fpsMutation.mutateAsync({
        source_url: sourceUrl,
        fps: targetFps,
      });
      setResultUrl(result.result_url);
      onEffectApplied?.(result.result_url);
      toast.success(t("fpsApplied"));
      notify(t("fpsApplied"));
    } catch {
      toast.error(t("effectError"));
    }
  }, [sourceUrl, targetFps, fpsMutation, onEffectApplied, t, notify]);

  // 일괄 적용
  const [isBatchApplying, setIsBatchApplying] = useState(false);
  const batchCount = Object.values(batchChecked).filter(Boolean).length;

  const handleBatchApply = useCallback(async () => {
    if (!sourceUrl || batchCount === 0) return;
    setIsBatchApplying(true);
    let currentUrl = sourceUrl;

    try {
      // 1. 속도
      if (batchChecked.speed && speed !== 1) {
        const res = await speedMutation.mutateAsync({ source_url: currentUrl, speed });
        currentUrl = res.result_url;
      }
      // 2. 역재생
      if (batchChecked.reverse) {
        const res = await reverseMutation.mutateAsync({ source_url: currentUrl });
        currentUrl = res.result_url;
      }
      // 3. 필터
      if (batchChecked.filter) {
        const isAdjust = brightness !== 0 || contrast !== 1 || saturation !== 1;
        const filterName = selectedFilter !== "none" ? selectedFilter : isAdjust ? "adjust" : null;
        if (filterName) {
          const res = await filterMutation.mutateAsync({
            source_url: currentUrl,
            filter_name: filterName,
            params: filterName === "adjust" ? { brightness, contrast, saturation } : undefined,
          });
          currentUrl = res.result_url;
        }
      }
      // 4. 텍스트 오버레이
      if (batchChecked.text && overlayText.trim()) {
        const res = await textOverlayMutation.mutateAsync({
          source_url: currentUrl,
          text: overlayText.trim(),
          position: textPosition as "top" | "center" | "bottom",
          font_size: fontSize,
          color: textColor,
        });
        currentUrl = res.result_url;
      }
      // 5. 해상도
      if (batchChecked.resolution) {
        const res = await resolutionMutation.mutateAsync({ source_url: currentUrl, resolution });
        currentUrl = res.result_url;
      }
      // 6. 회전/뒤집기
      if (batchChecked.rotate && rotateTransform) {
        const res = await rotateMutation.mutateAsync({ source_url: currentUrl, transform: rotateTransform });
        currentUrl = res.result_url;
      }
      // 7. FPS
      if (batchChecked.fps) {
        const res = await fpsMutation.mutateAsync({ source_url: currentUrl, fps: targetFps });
        currentUrl = res.result_url;
      }
      // 8. 워터마크
      if (batchChecked.watermark) {
        const hasWm = (wmMode === "text" && wmText.trim()) || (wmMode === "image" && wmImageFile);
        if (hasWm) {
          let imageUrl: string | undefined;
          if (wmMode === "image" && wmImageFile) {
            imageUrl = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result as string);
              reader.onerror = reject;
              reader.readAsDataURL(wmImageFile);
            });
          }
          const res = await watermarkMutation.mutateAsync({
            source_url: currentUrl,
            mode: wmMode,
            text: wmMode === "text" ? wmText.trim() : undefined,
            image_url: imageUrl,
            position: wmPosition as "top-left" | "top-right" | "bottom-left" | "bottom-right" | "center",
            opacity: wmOpacity,
            font_size: wmFontSize,
            color: wmColor,
            image_scale: wmImageScale,
          });
          currentUrl = res.result_url;
        }
      }

      setResultUrl(currentUrl);
      onEffectApplied?.(currentUrl);
      toast.success(t("effectApplied"));
      notify(t("effectApplied"));
    } catch {
      toast.error(t("effectError"));
    } finally {
      setIsBatchApplying(false);
    }
  }, [
    sourceUrl, batchChecked, batchCount, speed, selectedFilter, brightness, contrast, saturation,
    overlayText, textPosition, fontSize, textColor,
    wmMode, wmText, wmImageFile, wmPosition, wmOpacity, wmFontSize, wmColor,
    speedMutation, reverseMutation, filterMutation, textOverlayMutation, watermarkMutation,
    onEffectApplied, t, notify,
  ]);

  const [openSection, setOpenSection] = useState<string | null>(null);
  const toggle = (id: string) => setOpenSection((prev) => (prev === id ? null : id));

  return (
    <div className="space-y-1">
      {/* 속도 변경 */}
      <AccordionSection
        id="speed"
        icon={<Gauge className="size-3.5" />}
        label={t("effectSpeed")}
        badge={speed !== 1 ? `${speed}x` : undefined}
        open={openSection === "speed"}
        onToggle={() => toggle("speed")}
        checked={!!batchChecked.speed}
        onCheckedChange={() => toggleBatch("speed")}
      >
        <div className="flex items-center gap-1.5">
          {SPEED_PRESETS.map((s) => (
            <button
              key={s}
              onClick={() => setSpeed(s)}
              className={`rounded-md px-2 py-1 text-xs transition-colors ${
                speed === s
                  ? "bg-primary text-primary-foreground"
                  : "bg-neutral-200/60 text-neutral-500 hover:text-neutral-700 dark:bg-neutral-800/60 dark:text-neutral-400 dark:hover:text-neutral-200"
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
      </AccordionSection>

      {/* 역재생 */}
      <AccordionSection
        id="reverse"
        icon={<Undo2 className="size-3.5" />}
        label={t("effectReverse")}
        open={openSection === "reverse"}
        onToggle={() => toggle("reverse")}
        checked={!!batchChecked.reverse}
        onCheckedChange={() => toggleBatch("reverse")}
      >
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
      </AccordionSection>

      {/* 필터 / 색보정 */}
      <AccordionSection
        id="filter"
        icon={<Palette className="size-3.5" />}
        label={t("effectFilter")}
        badge={selectedFilter !== "none" ? t(FILTER_PRESETS.find((f) => f.id === selectedFilter)?.labelKey ?? "filterNone") : undefined}
        open={openSection === "filter"}
        onToggle={() => toggle("filter")}
        checked={!!batchChecked.filter}
        onCheckedChange={() => toggleBatch("filter")}
      >
        <div className="flex flex-wrap gap-1.5">
          {FILTER_PRESETS.map((f) => (
            <button
              key={f.id}
              onClick={() => setSelectedFilter(f.id)}
              className={`rounded-md px-2.5 py-1 text-xs transition-colors ${
                selectedFilter === f.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-neutral-200/60 text-neutral-500 hover:text-neutral-700 dark:bg-neutral-800/60 dark:text-neutral-400 dark:hover:text-neutral-200"
              }`}
            >
              {t(f.labelKey)}
            </button>
          ))}
        </div>
        <div className="space-y-1.5">
          <SliderControl label={t("brightness")} value={brightness} min={-1} max={1} step={0.1} onChange={setBrightness} />
          <SliderControl label={t("contrast")} value={contrast} min={0} max={3} step={0.1} onChange={setContrast} />
          <SliderControl label={t("saturation")} value={saturation} min={0} max={3} step={0.1} onChange={setSaturation} />
        </div>
        <Button
          size="sm"
          variant="outline"
          className="w-full gap-1.5"
          onClick={handleApplyFilter}
          disabled={!sourceUrl || isPending || (selectedFilter === "none" && brightness === 0 && contrast === 1 && saturation === 1)}
        >
          {filterMutation.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Palette className="size-3.5" />}
          {t("applyFilter")}
        </Button>
      </AccordionSection>

      {/* 텍스트 오버레이 */}
      <AccordionSection
        id="text"
        icon={<Type className="size-3.5" />}
        label={t("effectTextOverlay")}
        open={openSection === "text"}
        onToggle={() => toggle("text")}
        checked={!!batchChecked.text}
        onCheckedChange={() => toggleBatch("text")}
      >
        {/* 스타일 프리셋 */}
        <div className="grid grid-cols-3 gap-1.5">
          {TEXT_STYLE_PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => {
                setSelectedTextPreset(preset.id);
                setFontSize(preset.fontSize);
                setTextColor(preset.color);
                setTextPosition(preset.position);
                onDirty?.();
              }}
              className={`flex flex-col items-center gap-1 rounded-lg border p-2 transition-colors ${
                selectedTextPreset === preset.id
                  ? "border-primary bg-primary/5"
                  : "border-neutral-200 hover:border-neutral-400 dark:border-neutral-700 dark:hover:border-neutral-500"
              }`}
            >
              <div className="flex h-7 w-full items-center justify-center rounded bg-neutral-200 dark:bg-neutral-800">
                <span
                  className="truncate text-[10px] font-bold leading-none"
                  style={{
                    color: preset.preview.text,
                    WebkitTextStroke: preset.preview.border !== "transparent"
                      ? `1px ${preset.preview.border}`
                      : undefined,
                    backgroundColor: preset.preview.boxBg,
                    padding: preset.preview.boxBg ? "1px 4px" : undefined,
                    borderRadius: preset.preview.boxBg ? "2px" : undefined,
                  }}
                >
                  Aa가
                </span>
              </div>
              <span className="text-[10px] text-neutral-500">{t(preset.nameKey)}</span>
            </button>
          ))}
        </div>
        <Input
          value={overlayText}
          onChange={(e) => { setOverlayText(e.target.value); onDirty?.(); }}
          placeholder={t("textPlaceholder")}
          className="h-8 text-xs"
          maxLength={200}
        />
        <div className="grid grid-cols-3 gap-1">
          {POSITION_PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => { setTextPosition(p.id); setSelectedTextPreset("custom"); }}
              className={`rounded-md px-1.5 py-1 text-[11px] transition-colors ${
                textPosition === p.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-neutral-200/60 text-neutral-500 hover:text-neutral-700 dark:bg-neutral-800/60 dark:text-neutral-400 dark:hover:text-neutral-200"
              }`}
            >
              {t(p.labelKey)}
            </button>
          ))}
        </div>
        <SliderControl label={t("fontSize")} value={fontSize} min={10} max={100} step={2} onChange={(v) => { setFontSize(v); setSelectedTextPreset("custom"); }} />
        <div className="flex items-center gap-1.5">
          <span className="w-16 text-[11px] text-neutral-500">{t("textColor")}</span>
          <div className="flex items-center gap-1">
            {COLOR_PRESETS.map((c) => (
              <button
                key={c.id}
                onClick={() => { setTextColor(c.id); setSelectedTextPreset("custom"); }}
                className={`size-6 rounded-full border-2 transition-colors ${textColor === c.id ? "border-primary" : "border-neutral-300 hover:border-neutral-500 dark:border-neutral-700 dark:hover:border-neutral-500"}`}
                style={{ backgroundColor: c.css }}
                aria-label={c.label}
              />
            ))}
            <input
              type="color"
              value={COLOR_PRESETS.find((c) => c.id === textColor)?.css ?? textColor}
              onChange={(e) => { setTextColor(e.target.value); setSelectedTextPreset("custom"); }}
              className="size-6 cursor-pointer rounded-full border-2 border-neutral-300 bg-transparent p-0 dark:border-neutral-700"
            />
          </div>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="w-full gap-1.5"
          onClick={handleApplyTextOverlay}
          disabled={!sourceUrl || !overlayText.trim() || isPending}
        >
          {textOverlayMutation.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Type className="size-3.5" />}
          {t("applyTextOverlay")}
        </Button>
      </AccordionSection>

      {/* 워터마크 */}
      <AccordionSection
        id="watermark"
        icon={<Stamp className="size-3.5" />}
        label={t("effectWatermark")}
        open={openSection === "watermark"}
        onToggle={() => toggle("watermark")}
        checked={!!batchChecked.watermark}
        onCheckedChange={() => toggleBatch("watermark")}
      >
        <div className="flex gap-1.5">
          <button
            onClick={() => setWmMode("text")}
            className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs transition-colors ${
              wmMode === "text"
                ? "bg-primary text-primary-foreground"
                : "bg-neutral-200/60 text-neutral-500 hover:text-neutral-700 dark:bg-neutral-800/60 dark:text-neutral-400 dark:hover:text-neutral-200"
            }`}
          >
            <Type className="size-3" />
            {t("wmText")}
          </button>
          <button
            onClick={() => setWmMode("image")}
            className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs transition-colors ${
              wmMode === "image"
                ? "bg-primary text-primary-foreground"
                : "bg-neutral-200/60 text-neutral-500 hover:text-neutral-700 dark:bg-neutral-800/60 dark:text-neutral-400 dark:hover:text-neutral-200"
            }`}
          >
            <ImageIcon className="size-3" />
            {t("wmImage")}
          </button>
        </div>

        {wmMode === "text" && (
          <>
            <Input
              value={wmText}
              onChange={(e) => { setWmText(e.target.value); onDirty?.(); }}
              placeholder={t("wmTextPlaceholder")}
              className="h-8 text-xs"
              maxLength={100}
            />
            <SliderControl label={t("fontSize")} value={wmFontSize} min={10} max={100} step={2} onChange={setWmFontSize} />
            <div className="flex items-center gap-1.5">
              <span className="w-16 text-[11px] text-neutral-500">{t("textColor")}</span>
              <div className="flex items-center gap-1">
                {COLOR_PRESETS.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setWmColor(c.id)}
                    className={`size-6 rounded-full border-2 transition-colors ${wmColor === c.id ? "border-primary" : "border-neutral-300 hover:border-neutral-500 dark:border-neutral-700 dark:hover:border-neutral-500"}`}
                    style={{ backgroundColor: c.css }}
                    aria-label={c.label}
                  />
                ))}
                <input
                  type="color"
                  value={COLOR_PRESETS.find((c) => c.id === wmColor)?.css ?? wmColor}
                  onChange={(e) => setWmColor(e.target.value)}
                  className="size-6 cursor-pointer rounded-full border-2 border-neutral-300 bg-transparent p-0 dark:border-neutral-700"
                />
              </div>
            </div>
          </>
        )}

        {wmMode === "image" && (
          <>
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-neutral-300 px-3 py-2 text-xs text-neutral-500 transition-colors hover:border-neutral-400 dark:border-neutral-700 dark:hover:border-neutral-600">
              <ImageIcon className="size-3.5" />
              {wmImageFile ? wmImageFile.name : t("wmSelectImage")}
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
            <SliderControl
              label={t("wmImageSize")}
              value={wmImageScale}
              min={5}
              max={80}
              step={5}
              onChange={setWmImageScale}
            />
          </>
        )}

        <div className="flex flex-wrap gap-1">
          {WM_POSITION_PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => setWmPosition(p.id)}
              className={`rounded-md px-2 py-1 text-[11px] transition-colors ${
                wmPosition === p.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-neutral-200/60 text-neutral-500 hover:text-neutral-700 dark:bg-neutral-800/60 dark:text-neutral-400 dark:hover:text-neutral-200"
              }`}
            >
              {t(p.labelKey)}
            </button>
          ))}
        </div>
        <SliderControl label={t("wmOpacity")} value={wmOpacity} min={0.1} max={1} step={0.1} onChange={setWmOpacity} />
        <Button
          size="sm"
          variant="outline"
          className="w-full gap-1.5"
          onClick={handleApplyWatermark}
          disabled={!sourceUrl || isPending || (wmMode === "text" && !wmText.trim()) || (wmMode === "image" && !wmImageFile)}
        >
          {watermarkMutation.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Stamp className="size-3.5" />}
          {t("applyWatermark")}
        </Button>
      </AccordionSection>

      {/* 해상도 변환 */}
      <AccordionSection
        id="resolution"
        icon={<Gauge className="size-3.5" />}
        label={t("effectResolution")}
        badge={resolution}
        open={openSection === "resolution"}
        onToggle={() => toggle("resolution")}
        checked={batchChecked["resolution"]}
        onCheckedChange={() => setBatchChecked((p) => ({ ...p, resolution: !p.resolution }))}
      >
        <div className="flex flex-wrap gap-1.5">
          {RESOLUTION_PRESETS.map((r) => (
            <button
              key={r}
              type="button"
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                resolution === r
                  ? "bg-primary text-primary-foreground"
                  : "bg-neutral-200/60 text-neutral-600 hover:bg-neutral-300 dark:bg-neutral-800/60 dark:text-neutral-300 dark:hover:bg-neutral-700"
              }`}
              onClick={() => { setResolution(r); onDirty?.(); }}
            >
              {r.toUpperCase()}
            </button>
          ))}
        </div>
        <Button
          size="sm"
          variant="outline"
          className="w-full gap-1.5"
          onClick={handleResolution}
          disabled={!sourceUrl || isPending}
        >
          {resolutionMutation.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Gauge className="size-3.5" />}
          {t("applyResolution")}
        </Button>
      </AccordionSection>

      {/* 회전/뒤집기 */}
      <AccordionSection
        id="rotate"
        icon={<RotateCw className="size-3.5" />}
        label={t("effectRotate")}
        badge={rotateTransform || undefined}
        open={openSection === "rotate"}
        onToggle={() => toggle("rotate")}
        checked={batchChecked["rotate"]}
        onCheckedChange={() => setBatchChecked((p) => ({ ...p, rotate: !p.rotate }))}
      >
        <div className="grid grid-cols-2 gap-2">
          {(["90", "180", "270"] as const).map((deg) => (
            <Button
              key={deg}
              size="sm"
              variant={rotateTransform === deg ? "default" : "outline"}
              className="gap-1.5"
              onClick={() => { setRotateTransform(rotateTransform === deg ? null : deg); onDirty?.(); }}
            >
              <RotateCw className="size-3.5" /> {deg}°
            </Button>
          ))}
          <div />
          <Button
            size="sm"
            variant={rotateTransform === "flip_h" ? "default" : "outline"}
            className="gap-1.5"
            onClick={() => { setRotateTransform(rotateTransform === "flip_h" ? null : "flip_h"); onDirty?.(); }}
          >
            <FlipHorizontal2 className="size-3.5" /> {t("flipH")}
          </Button>
          <Button
            size="sm"
            variant={rotateTransform === "flip_v" ? "default" : "outline"}
            className="gap-1.5"
            onClick={() => { setRotateTransform(rotateTransform === "flip_v" ? null : "flip_v"); onDirty?.(); }}
          >
            <FlipVertical2 className="size-3.5" /> {t("flipV")}
          </Button>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="w-full gap-1.5"
          onClick={() => rotateTransform && handleRotate(rotateTransform)}
          disabled={!sourceUrl || isPending || !rotateTransform}
        >
          {rotateMutation.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <RotateCw className="size-3.5" />}
          {t("applyRotate")}
        </Button>
      </AccordionSection>

      {/* FPS 변환 */}
      <AccordionSection
        id="fps"
        icon={<Timer className="size-3.5" />}
        label={t("effectFps")}
        badge={`${targetFps}fps`}
        open={openSection === "fps"}
        onToggle={() => toggle("fps")}
        checked={batchChecked["fps"]}
        onCheckedChange={() => setBatchChecked((p) => ({ ...p, fps: !p.fps }))}
      >
        <div className="flex flex-wrap gap-1.5">
          {FPS_PRESETS.map((f) => (
            <button
              key={f}
              type="button"
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                targetFps === f
                  ? "bg-primary text-primary-foreground"
                  : "bg-neutral-200/60 text-neutral-600 hover:bg-neutral-300 dark:bg-neutral-800/60 dark:text-neutral-300 dark:hover:bg-neutral-700"
              }`}
              onClick={() => { setTargetFps(f); onDirty?.(); }}
            >
              {f}fps
            </button>
          ))}
        </div>
        <Button
          size="sm"
          variant="outline"
          className="w-full gap-1.5"
          onClick={handleFps}
          disabled={!sourceUrl || isPending}
        >
          {fpsMutation.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Timer className="size-3.5" />}
          {t("applyFps")}
        </Button>
      </AccordionSection>

      {/* 일괄 적용 */}
      {batchCount > 0 && (
        <Button
          size="sm"
          className="w-full gap-1.5"
          onClick={handleBatchApply}
          disabled={!sourceUrl || isPending || isBatchApplying}
        >
          {isBatchApplying ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Layers className="size-3.5" />
          )}
          {t("batchApply")} ({batchCount})
        </Button>
      )}
    </div>
  );
}

/** 아코디언 섹션 */
function AccordionSection({
  id,
  icon,
  label,
  badge,
  open,
  onToggle,
  checked,
  onCheckedChange,
  children,
}: {
  id: string;
  icon: React.ReactNode;
  label: string;
  badge?: string;
  open: boolean;
  onToggle: () => void;
  checked?: boolean;
  onCheckedChange?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className={`rounded-lg border transition-colors ${checked ? "border-primary/40 bg-primary/5 dark:border-primary/30 dark:bg-primary/5" : "border-neutral-200/60 dark:border-neutral-800/60"}`}>
      <div className="flex items-center">
        {onCheckedChange && (
          <button
            onClick={(e) => { e.stopPropagation(); onCheckedChange(); }}
            className="flex items-center pl-3"
          >
            <div className={`flex size-4 items-center justify-center rounded border transition-colors ${checked ? "border-primary bg-primary" : "border-neutral-300 dark:border-neutral-600"}`}>
              {checked && <Check className="size-3 text-white" />}
            </div>
          </button>
        )}
        <button
          onClick={onToggle}
          className="flex flex-1 items-center gap-2 px-2 py-2.5 text-left transition-colors hover:bg-neutral-100/60 dark:hover:bg-neutral-800/40"
        >
          <span className="text-neutral-400">{icon}</span>
          <span className="text-xs font-medium">{label}</span>
          {badge && (
            <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
              {badge}
            </span>
          )}
          <ChevronDown
            className={`ml-auto size-3.5 text-neutral-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          />
        </button>
      </div>
      {open && <div className="space-y-2 px-3 pb-3">{children}</div>}
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
      <span className="w-16 text-[11px] text-neutral-500">{label}</span>
      <SliderPrimitive.Root
        value={value}
        onValueChange={(v) => onChange(v as number)}
        min={min}
        max={max}
        step={step}
        className="flex-1"
      >
        <SliderPrimitive.Control className="relative flex h-4 w-full cursor-pointer items-center">
          <SliderPrimitive.Track className="h-1 w-full rounded-full bg-neutral-200 dark:bg-neutral-800">
            <SliderPrimitive.Indicator className="rounded-full bg-primary" />
          </SliderPrimitive.Track>
          <SliderPrimitive.Thumb className="block size-3 rounded-full border-2 border-primary bg-background shadow-sm" />
        </SliderPrimitive.Control>
      </SliderPrimitive.Root>
      <span className="w-8 text-right text-[11px] tabular-nums text-neutral-400">
        {value.toFixed(1)}
      </span>
    </div>
  );
}
