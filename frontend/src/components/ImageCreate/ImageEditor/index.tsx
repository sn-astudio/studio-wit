"use client";

import { useCallback, useRef, useState } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/Button";
import { useImageEditorStore } from "@/stores/imageEditor";

import { DEFAULT_FILTER_VALUES } from "./const";
import {
  applyFilterToCanvas,
  exportCanvas,
  flipCanvasH,
  flipCanvasV,
  rotateCanvas90,
} from "./utils";
import type { CropRect } from "./types";
import type { ImageEditorProps } from "./types";
import type { EditorCanvasHandle } from "./EditorCanvas/types";
import { clampRect } from "./CropOverlay/utils";
import { EditorCanvas } from "./EditorCanvas";
import { EditorToolbar } from "./EditorToolbar";
import { CropOverlay } from "./CropOverlay";
import { FilterPanel } from "./FilterPanel";

export function ImageEditor({ imageUrl, onSave, onCancel }: ImageEditorProps) {
  const t = useTranslations("ImageEditor");
  const canvasRef = useRef<EditorCanvasHandle>(null);

  const activeTool = useImageEditorStore((s) => s.activeTool);
  const setActiveTool = useImageEditorStore((s) => s.setActiveTool);
  const filterValues = useImageEditorStore((s) => s.filterValues);
  const setFilterValues = useImageEditorStore((s) => s.setFilterValues);
  const resetFilterValues = useImageEditorStore((s) => s.resetFilterValues);
  const historyIndex = useImageEditorStore((s) => s.historyIndex);
  const historyLength = useImageEditorStore((s) => s.historyLength);
  const reset = useImageEditorStore((s) => s.reset);

  const [cropRect, setCropRect] = useState<CropRect | null>(null);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < historyLength - 1;

  // 회전
  const handleRotate = useCallback(() => {
    const canvas = canvasRef.current?.getMainCanvas();
    if (!canvas) return;
    canvasRef.current?.pushSnapshot();
    const rotated = rotateCanvas90(canvas);
    canvasRef.current?.replaceMainCanvas(rotated);
  }, []);

  // 수평 반전
  const handleFlipH = useCallback(() => {
    const canvas = canvasRef.current?.getMainCanvas();
    if (!canvas) return;
    canvasRef.current?.pushSnapshot();
    const flipped = flipCanvasH(canvas);
    canvasRef.current?.replaceMainCanvas(flipped);
  }, []);

  // 수직 반전
  const handleFlipV = useCallback(() => {
    const canvas = canvasRef.current?.getMainCanvas();
    if (!canvas) return;
    canvasRef.current?.pushSnapshot();
    const flipped = flipCanvasV(canvas);
    canvasRef.current?.replaceMainCanvas(flipped);
  }, []);

  // 크롭 적용
  const handleApplyCrop = useCallback(() => {
    if (!cropRect) return;
    const canvas = canvasRef.current?.getMainCanvas();
    if (!canvas) return;
    const clamped = clampRect(cropRect, canvas.width, canvas.height);
    if (clamped.width < 2 || clamped.height < 2) return;
    canvasRef.current?.applyCrop(clamped);
    setCropRect(null);
    setActiveTool(null);
  }, [cropRect, setActiveTool]);

  // 크롭 취소
  const handleCancelCrop = useCallback(() => {
    setCropRect(null);
    setActiveTool(null);
  }, [setActiveTool]);

  // 필터 적용 (bake)
  const handleApplyFilter = useCallback(() => {
    const canvas = canvasRef.current?.getMainCanvas();
    if (!canvas) return;
    canvasRef.current?.pushSnapshot();
    const baked = applyFilterToCanvas(canvas, filterValues);
    canvasRef.current?.replaceMainCanvas(baked);
    // 필터 CSS 초기화
    resetFilterValues();
    setActiveTool(null);
  }, [filterValues, resetFilterValues, setActiveTool]);

  // 필터 리셋
  const handleResetFilter = useCallback(() => {
    resetFilterValues();
  }, [resetFilterValues]);

  // 저장
  const handleSave = useCallback(() => {
    const canvas = canvasRef.current?.getMainCanvas();
    if (!canvas) return;

    // 현재 필터가 적용중이면 bake
    const needsBake =
      filterValues.brightness !== 100 ||
      filterValues.contrast !== 100 ||
      filterValues.saturate !== 100;
    let exportSource = canvas;
    if (needsBake) {
      exportSource = applyFilterToCanvas(canvas, filterValues);
    }
    const dataUrl = exportCanvas(exportSource);
    reset();
    onSave(dataUrl);
  }, [filterValues, reset, onSave]);

  // 취소
  const handleCancel = useCallback(() => {
    reset();
    onCancel();
  }, [reset, onCancel]);

  return (
    <div className="flex size-full flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/80">
      <EditorToolbar
        activeTool={activeTool}
        onToolChange={setActiveTool}
        onRotate={handleRotate}
        onFlipH={handleFlipH}
        onFlipV={handleFlipV}
        onUndo={() => canvasRef.current?.undo()}
        onRedo={() => canvasRef.current?.redo()}
        canUndo={canUndo}
        canRedo={canRedo}
      />

      <EditorCanvas
        ref={canvasRef}
        imageUrl={imageUrl}
        filterValues={filterValues}
        isCropping={activeTool === "crop"}
        cropRect={cropRect}
        onCropChange={setCropRect}
      />

      {activeTool === "crop" && (
        <CropOverlay
          cropRect={cropRect}
          onApply={handleApplyCrop}
          onCancel={handleCancelCrop}
        />
      )}

      {activeTool === "filter" && (
        <FilterPanel
          values={filterValues}
          onChange={setFilterValues}
          onApply={handleApplyFilter}
          onReset={handleResetFilter}
        />
      )}

      <div className="flex items-center justify-between border-t border-zinc-800 px-3 py-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCancel}
          className="cursor-pointer"
        >
          {t("cancel")}
        </Button>
        <Button size="sm" onClick={handleSave} className="cursor-pointer">
          {t("save")}
        </Button>
      </div>
    </div>
  );
}
