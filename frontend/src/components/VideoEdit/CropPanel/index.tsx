"use client";

import { useCallback, useState } from "react";
import { ChevronDown, Crop, Download, Globe, Loader2, Lock, RectangleHorizontal, Save, Smartphone } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useNotifyOnComplete } from "@/hooks/useNotifyOnComplete";
import { useCropVideo, useLetterbox } from "@/hooks/queries/useVideoEdit";
import { videoEditApi } from "@/services/api";

import type { CropPanelProps } from "./types";

const RATIO_PRESETS = ["16:9", "9:16", "4:3", "3:4", "1:1", "21:9"];
const COLOR_PRESETS = [
  { id: "black", label: "Black", hex: "#000000" },
  { id: "white", label: "White", hex: "#ffffff" },
  { id: "0x1a1a2e", label: "Dark Blue", hex: "#1a1a2e" },
];

export function CropPanel({
  sourceUrl,
  videoWidth,
  videoHeight,
  onCropApplied,
  onSave,
  onDirty,
}: CropPanelProps) {
  const t = useTranslations("VideoEdit");
  const notify = useNotifyOnComplete();
  const cropMutation = useCropVideo();
  const letterboxMutation = useLetterbox();

  const [shortsLoading, setShortsLoading] = useState(false);
  const [shortsCropX, setShortsCropX] = useState("center");

  const isPending = cropMutation.isPending || letterboxMutation.isPending || shortsLoading;

  // 크롭 좌표
  const [cropX, setCropX] = useState(0);
  const [cropY, setCropY] = useState(0);
  const [cropW, setCropW] = useState(videoWidth || 1280);
  const [cropH, setCropH] = useState(videoHeight || 720);

  // 레터박스
  const [targetRatio, setTargetRatio] = useState("16:9");
  const [padColor, setPadColor] = useState("black");

  // 결과 저장
  const [pendingResult, setPendingResult] = useState<string | null>(null);
  const [isPublicSave, setIsPublicSave] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // 아코디언
  const [openSection, setOpenSection] = useState<string | null>("crop");
  const toggle = (id: string) =>
    setOpenSection((prev) => (prev === id ? null : id));

  // 크롭 프리셋: 원본에서 비율에 맞게 중앙 크롭 좌표 계산
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
      onDirty?.();
    },
    [videoWidth, videoHeight, onDirty],
  );

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

  const handleLetterbox = useCallback(async () => {
    if (!sourceUrl) return;
    try {
      const result = await letterboxMutation.mutateAsync({
        source_url: sourceUrl,
        target_ratio: targetRatio,
        color: padColor,
      });
      setPendingResult(result.result_url);
      onCropApplied?.(result.result_url);
      toast.success(t("letterboxApplied"));
      notify(t("letterboxApplied"));
    } catch {
      toast.error(t("cropError"));
    }
  }, [sourceUrl, targetRatio, padColor, letterboxMutation, onCropApplied, t, notify]);

  // 쇼츠 변환 (16:9 → 9:16)
  const handleShortsConvert = useCallback(async () => {
    if (!sourceUrl) return;
    setShortsLoading(true);
    try {
      const res = await videoEditApi.shortsConvert({
        source_url: sourceUrl,
        crop_x: shortsCropX,
      });
      setPendingResult(res.result_url);
      onCropApplied?.(res.result_url);
      toast.success(t("shortsSuccess"));
      notify(t("shortsSuccess"));
    } catch {
      toast.error(t("shortsError"));
    } finally {
      setShortsLoading(false);
    }
  }, [sourceUrl, shortsCropX, onCropApplied, t, notify]);

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
    <div className="space-y-1">
      {/* 크롭 */}
      <AccordionSection
        id="crop"
        icon={<Crop className="size-3.5" />}
        label={t("cropTitle")}
        open={openSection === "crop"}
        onToggle={() => toggle("crop")}
      >
        <p className="text-[11px] text-neutral-500">{t("cropDesc")}</p>

        {/* 비율 프리셋 */}
        <div className="space-y-1">
          <span className="text-[11px] text-neutral-500">{t("cropPreset")}</span>
          <div className="flex flex-wrap gap-1.5">
            {RATIO_PRESETS.map((r) => (
              <button
                key={r}
                type="button"
                className="rounded-md bg-neutral-200/60 px-2 py-1 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-300 dark:bg-neutral-800/60 dark:text-neutral-300 dark:hover:bg-neutral-700"
                onClick={() => applyCropPreset(r)}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* 좌표 입력 */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[11px] text-neutral-500">X</label>
            <Input
              type="number"
              min={0}
              value={cropX}
              onChange={(e) => { setCropX(Number(e.target.value)); onDirty?.(); }}
              className="h-7 text-xs"
            />
          </div>
          <div>
            <label className="text-[11px] text-neutral-500">Y</label>
            <Input
              type="number"
              min={0}
              value={cropY}
              onChange={(e) => { setCropY(Number(e.target.value)); onDirty?.(); }}
              className="h-7 text-xs"
            />
          </div>
          <div>
            <label className="text-[11px] text-neutral-500">{t("cropWidth")}</label>
            <Input
              type="number"
              min={1}
              value={cropW}
              onChange={(e) => { setCropW(Number(e.target.value)); onDirty?.(); }}
              className="h-7 text-xs"
            />
          </div>
          <div>
            <label className="text-[11px] text-neutral-500">{t("cropHeight")}</label>
            <Input
              type="number"
              min={1}
              value={cropH}
              onChange={(e) => { setCropH(Number(e.target.value)); onDirty?.(); }}
              className="h-7 text-xs"
            />
          </div>
        </div>

        <p className="text-[10px] text-neutral-400">
          {t("cropCurrentSize")}: {videoWidth} x {videoHeight}
        </p>

        <Button
          size="sm"
          variant="outline"
          className="w-full gap-1.5"
          onClick={handleCrop}
          disabled={!sourceUrl || isPending}
        >
          {cropMutation.isPending ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Crop className="size-3.5" />
          )}
          {t("applyCrop")}
        </Button>
      </AccordionSection>

      {/* 레터박스 */}
      <AccordionSection
        id="letterbox"
        icon={<RectangleHorizontal className="size-3.5" />}
        label={t("letterboxTitle")}
        open={openSection === "letterbox"}
        onToggle={() => toggle("letterbox")}
      >
        <p className="text-[11px] text-neutral-500">{t("letterboxDesc")}</p>

        {/* 비율 선택 */}
        <div className="space-y-1">
          <span className="text-[11px] text-neutral-500">{t("letterboxRatio")}</span>
          <div className="flex flex-wrap gap-1.5">
            {RATIO_PRESETS.map((r) => (
              <button
                key={r}
                type="button"
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  targetRatio === r
                    ? "bg-primary text-primary-foreground"
                    : "bg-neutral-200/60 text-neutral-600 hover:bg-neutral-300 dark:bg-neutral-800/60 dark:text-neutral-300 dark:hover:bg-neutral-700"
                }`}
                onClick={() => { setTargetRatio(r); onDirty?.(); }}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* 패딩 색상 */}
        <div className="space-y-1">
          <span className="text-[11px] text-neutral-500">{t("letterboxColor")}</span>
          <div className="flex gap-2">
            {COLOR_PRESETS.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => { setPadColor(c.id); onDirty?.(); }}
                className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-xs transition-colors ${
                  padColor === c.id
                    ? "ring-2 ring-primary"
                    : "ring-1 ring-neutral-300 dark:ring-neutral-700"
                }`}
              >
                <span
                  className="inline-block size-3 rounded-full border border-neutral-400"
                  style={{ backgroundColor: c.hex }}
                />
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <Button
          size="sm"
          variant="outline"
          className="w-full gap-1.5"
          onClick={handleLetterbox}
          disabled={!sourceUrl || isPending}
        >
          {letterboxMutation.isPending ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <RectangleHorizontal className="size-3.5" />
          )}
          {t("applyLetterbox")}
        </Button>
      </AccordionSection>

      {/* 쇼츠/릴스 변환 */}
      <AccordionSection
        id="shorts"
        icon={<Smartphone className="size-3.5" />}
        label={t("shortsConvertBtn")}
        open={openSection === "shorts"}
        onToggle={() => toggle("shorts")}
      >
        <p className="mb-2 text-[11px] text-neutral-500">{t("shortsDesc")}</p>
        <div className="space-y-2">
          <label className="text-xs font-medium">{t("shortsCropPosition")}</label>
          <div className="flex gap-2">
            {(["left", "center", "right"] as const).map((pos) => (
              <Button
                key={pos}
                size="sm"
                variant={shortsCropX === pos ? "default" : "outline"}
                className="flex-1 text-xs"
                onClick={() => setShortsCropX(pos)}
              >
                {t(pos === "left" ? "shortsCropLeft" : pos === "center" ? "shortsCropCenter" : "shortsCropRight")}
              </Button>
            ))}
          </div>
        </div>
        <Button
          className="mt-2 w-full gap-1.5"
          onClick={handleShortsConvert}
          disabled={!sourceUrl || isPending}
        >
          {shortsLoading ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Smartphone className="size-3.5" />
          )}
          {t("shortsConvertBtn")}
        </Button>
      </AccordionSection>

      {/* 결과 저장/다운로드 */}
      {pendingResult && (
        <div className="space-y-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2.5">
          <p className="text-xs font-medium text-primary">{t("cropResultReady")}</p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsPublicSave(!isPublicSave)}
              className="flex items-center gap-1 rounded-lg bg-neutral-200/60 px-2 py-1 text-xs transition-colors hover:bg-neutral-300 dark:bg-neutral-800/60 dark:hover:bg-neutral-700"
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
}

function AccordionSection({
  id,
  icon,
  label,
  open,
  onToggle,
  children,
}: {
  id: string;
  icon: React.ReactNode;
  label: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-neutral-200/60 dark:border-neutral-800/60">
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left transition-colors hover:bg-neutral-100/60 dark:hover:bg-neutral-800/40"
      >
        <span className="text-neutral-400">{icon}</span>
        <span className="text-xs font-medium">{label}</span>
        <ChevronDown
          className={`ml-auto size-3.5 text-neutral-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && <div className="space-y-2 px-3 pb-3">{children}</div>}
    </div>
  );
}
