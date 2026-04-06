"use client";

import { useCallback } from "react";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";

import type { CropRect } from "../types";
import type { CropOverlayProps, CropRatio } from "./types";

const RATIOS: { id: CropRatio; label: string }[] = [
  { id: "free", label: "자유" },
  { id: "1:1", label: "1:1" },
  { id: "4:3", label: "4:3" },
  { id: "3:4", label: "3:4" },
  { id: "16:9", label: "16:9" },
  { id: "9:16", label: "9:16" },
];

function calcCropRect(
  ratio: CropRatio,
  canvasW: number,
  canvasH: number,
): CropRect {
  if (ratio === "free") {
    const margin = 0.1;
    const x = Math.round(canvasW * margin);
    const y = Math.round(canvasH * margin);
    return {
      x,
      y,
      width: canvasW - x * 2,
      height: canvasH - y * 2,
    };
  }

  const [rw, rh] = ratio.split(":").map(Number);
  const targetRatio = rw / rh;
  let cropW: number;
  let cropH: number;

  if (canvasW / canvasH > targetRatio) {
    cropH = Math.round(canvasH * 0.8);
    cropW = Math.round(cropH * targetRatio);
  } else {
    cropW = Math.round(canvasW * 0.8);
    cropH = Math.round(cropW / targetRatio);
  }

  cropW = Math.min(cropW, canvasW);
  cropH = Math.min(cropH, canvasH);

  return {
    x: Math.round((canvasW - cropW) / 2),
    y: Math.round((canvasH - cropH) / 2),
    width: cropW,
    height: cropH,
  };
}

export function CropOverlay({
  cropRect,
  canvasWidth,
  canvasHeight,
  selectedRatio,
  onRatioChange,
  onCropChange,
  onApply,
  onCancel,
}: CropOverlayProps) {
  const t = useTranslations("ImageEditor");

  const handleRatioChange = useCallback(
    (ratio: CropRatio) => {
      onRatioChange(ratio);
      if (ratio === "free") {
        // 자유: cropRect 초기화 (사용자가 직접 드래그)
        onCropChange(null);
        return;
      }
      if (canvasWidth > 0 && canvasHeight > 0) {
        onCropChange(calcCropRect(ratio, canvasWidth, canvasHeight));
      }
    },
    [canvasWidth, canvasHeight, onCropChange, onRatioChange],
  );

  return (
    <div className="flex flex-1 flex-col gap-3">
      {/* 섹션 라벨 + 크기 */}
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-[600] text-foreground">
          {t("cropRatio")}
        </p>
        <span className="text-[12px] font-[500] text-muted-foreground">
          {selectedRatio === "free" && !cropRect
            ? t("cropHint")
            : cropRect
              ? <span className="tabular-nums">{Math.round(cropRect.width)} × {Math.round(cropRect.height)}</span>
              : null}
        </span>
      </div>

      {/* 비율 프리셋 — 가로 pill */}
      <div className="flex flex-wrap gap-1.5">
        {RATIOS.map((r) => (
          <button
            key={r.id}
            onClick={() => handleRatioChange(r.id)}
            className={cn(
              "cursor-pointer rounded-lg px-3.5 py-2 text-[12px] font-[500] transition-all active:opacity-80",
              selectedRatio === r.id
                ? "bg-foreground text-background"
                : "bg-neutral-50 text-muted-foreground hover:bg-neutral-100 hover:text-foreground dark:bg-neutral-800/60 dark:hover:bg-neutral-800 dark:hover:text-white",
            )}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* 취소 / 적용 */}
      <div className="sticky bottom-0 z-10 mt-auto -mx-5 flex items-center gap-2 bg-white px-5 pt-4 pb-4 dark:bg-[#161616]">
        <button
          onClick={onCancel}
          className="flex flex-1 cursor-pointer items-center justify-center rounded-lg bg-neutral-50 py-2.5 text-[13px] font-[500] text-muted-foreground transition-all hover:bg-neutral-100 hover:text-foreground active:opacity-80 dark:bg-neutral-800/60 dark:hover:bg-neutral-800 dark:hover:text-white"
        >
          {t("reset")}
        </button>
        <button
          onClick={onApply}
          disabled={!cropRect || cropRect.width < 2 || cropRect.height < 2}
          className="flex flex-1 cursor-pointer items-center justify-center rounded-lg bg-primary py-2.5 text-[13px] font-[600] text-white transition-all hover:opacity-90 active:opacity-80 disabled:pointer-events-none disabled:opacity-30"
        >
          {t("applyCrop")}
        </button>
      </div>
    </div>
  );
}
