"use client";

import { useCallback, useRef, useState } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/Button";
import { useImageEditorStore } from "@/stores/imageEditor";

import {
  applyFilterToCanvas,
  applyNoise,
  applySharpen,
  applyVignette,
  exportCanvas,
  flipCanvasH,
  flipCanvasV,
  hasFilterChanges,
  resizeCanvas,
  rotateCanvas90,
  rotateCanvasFree,
} from "./utils";
import type { CropRect } from "./types";
import type { ImageEditorProps } from "./types";
import type { EditorCanvasHandle } from "./EditorCanvas/types";
import { clampRect } from "./CropOverlay/utils";
import type { CropRatio } from "./CropOverlay/types";
import { EditorCanvas } from "./EditorCanvas";
import { EditorToolbar } from "./EditorToolbar";
import { CropOverlay } from "./CropOverlay";
import { FilterPanel } from "./FilterPanel";
import { ResizePanel } from "./ResizePanel";
import { DrawingPanel } from "./DrawingPanel";
import { TextPanel } from "./TextPanel";
import { FreeRotatePanel } from "./FreeRotatePanel";
import { EffectsPanel } from "./EffectsPanel";

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
  const drawingSettings = useImageEditorStore((s) => s.drawingSettings);
  const setDrawingSettings = useImageEditorStore((s) => s.setDrawingSettings);
  const textSettings = useImageEditorStore((s) => s.textSettings);
  const setTextSettings = useImageEditorStore((s) => s.setTextSettings);
  const reset = useImageEditorStore((s) => s.reset);

  const [cropRect, setCropRect] = useState<CropRect | null>(null);
  const [cropRatio, setCropRatio] = useState<CropRatio>("free");
  const ratioFromPanelRef = useRef(false);
  const [freeRotateDegrees, setFreeRotateDegrees] = useState(0);
  const [resizePreviewScale, setResizePreviewScale] = useState<
    { scaleX: number; scaleY: number } | undefined
  >();

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < historyLength - 1;

  // 회전 90도
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
    resetFilterValues();
    setActiveTool(null);
  }, [filterValues, resetFilterValues, setActiveTool]);

  // 필터 리셋
  const handleResetFilter = useCallback(() => {
    resetFilterValues();
  }, [resetFilterValues]);

  // 리사이즈 미리보기
  const handleResizeChange = useCallback(
    (w: number, h: number) => {
      const canvas = canvasRef.current?.getMainCanvas();
      if (!canvas) return;
      setResizePreviewScale({
        scaleX: w / canvas.width,
        scaleY: h / canvas.height,
      });
    },
    [],
  );

  // 리사이즈 적용
  const handleApplyResize = useCallback(
    (width: number, height: number) => {
      const canvas = canvasRef.current?.getMainCanvas();
      if (!canvas) return;
      canvasRef.current?.pushSnapshot();
      const resized = resizeCanvas(canvas, width, height);
      canvasRef.current?.replaceMainCanvas(resized);
      setResizePreviewScale(undefined);
      setActiveTool(null);
    },
    [setActiveTool],
  );

  // 리사이즈 취소
  const handleCancelResize = useCallback(() => {
    setResizePreviewScale(undefined);
    setActiveTool(null);
  }, [setActiveTool]);

  // 그리기/도형 적용 (overlay → main bake)
  const handleApplyDrawing = useCallback(() => {
    canvasRef.current?.bakeOverlay();
    setActiveTool(null);
  }, [setActiveTool]);

  // 그리기/도형 클리어
  const handleClearDrawing = useCallback(() => {
    canvasRef.current?.clearOverlay();
  }, []);

  // 텍스트 배치 콜백
  const handleTextPlace = useCallback(
    (x: number, y: number) => {
      setTextSettings({ ...textSettings, placedX: x, placedY: y });
    },
    [textSettings, setTextSettings],
  );

  // 텍스트 클리어 (위치 리셋 + overlay 클리어)
  const handleClearText = useCallback(() => {
    setTextSettings({ ...textSettings, placedX: null, placedY: null });
    canvasRef.current?.clearOverlay();
  }, [textSettings, setTextSettings]);

  // 자유 회전 적용
  const handleApplyFreeRotate = useCallback(
    (degrees: number) => {
      const canvas = canvasRef.current?.getMainCanvas();
      if (!canvas) return;
      canvasRef.current?.pushSnapshot();
      const rotated = rotateCanvasFree(canvas, degrees);
      canvasRef.current?.replaceMainCanvas(rotated);
      setFreeRotateDegrees(0);
      setActiveTool(null);
    },
    [setActiveTool],
  );

  // 자유 회전 미리보기
  const handleFreeRotateChange = useCallback((degrees: number) => {
    setFreeRotateDegrees(degrees);
  }, []);

  // 자유 회전 취소
  const handleCancelFreeRotate = useCallback(() => {
    setFreeRotateDegrees(0);
    setActiveTool(null);
  }, [setActiveTool]);

  // 효과 적용 (Sharpen/Vignette/Noise)
  const handleApplySharpen = useCallback(
    (amount: number) => {
      const canvas = canvasRef.current?.getMainCanvas();
      if (!canvas) return;
      canvasRef.current?.pushSnapshot();
      const result = applySharpen(canvas, amount);
      canvasRef.current?.replaceMainCanvas(result);
    },
    [],
  );

  const handleApplyVignette = useCallback(
    (intensity: number) => {
      const canvas = canvasRef.current?.getMainCanvas();
      if (!canvas) return;
      canvasRef.current?.pushSnapshot();
      const result = applyVignette(canvas, intensity);
      canvasRef.current?.replaceMainCanvas(result);
    },
    [],
  );

  const handleApplyNoise = useCallback(
    (amount: number) => {
      const canvas = canvasRef.current?.getMainCanvas();
      if (!canvas) return;
      canvasRef.current?.pushSnapshot();
      const result = applyNoise(canvas, amount);
      canvasRef.current?.replaceMainCanvas(result);
    },
    [],
  );

  // 저장
  const handleSave = useCallback(() => {
    const canvas = canvasRef.current?.getMainCanvas();
    if (!canvas) return;

    const needsBake = hasFilterChanges(filterValues);
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

  // 리사이즈용 현재 캔버스 크기
  const currentCanvas = canvasRef.current?.getMainCanvas();
  const canvasWidth = currentCanvas?.width ?? 0;
  const canvasHeight = currentCanvas?.height ?? 0;

  return (
    <div className="flex size-full flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/80">
      <EditorToolbar
        activeTool={activeTool}
        onToolChange={setActiveTool}
        onRotate={handleRotate}
        onFlipH={handleFlipH}
        onFlipV={handleFlipV}
      />

      <EditorCanvas
        ref={canvasRef}
        imageUrl={imageUrl}
        filterValues={filterValues}
        activeTool={activeTool}
        cropRect={cropRect}
        onCropChange={setCropRect}
        drawingSettings={drawingSettings}
        textSettings={textSettings}
        onTextPlace={handleTextPlace}
        freeRotateDegrees={freeRotateDegrees}
        resizePreviewScale={resizePreviewScale}
      />

      {activeTool === "crop" && (
        <CropOverlay
          cropRect={cropRect}
          canvasWidth={canvasRef.current?.getMainCanvas()?.width ?? 0}
          canvasHeight={canvasRef.current?.getMainCanvas()?.height ?? 0}
          selectedRatio={cropRatio}
          onRatioChange={(ratio) => {
            ratioFromPanelRef.current = true;
            setCropRatio(ratio);
          }}
          onCropChange={(rect) => {
            setCropRect(rect);
            if (!ratioFromPanelRef.current) {
              setCropRatio("free");
            }
            ratioFromPanelRef.current = false;
          }}
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

      {activeTool === "resize" && (
        <ResizePanel
          currentWidth={canvasWidth}
          currentHeight={canvasHeight}
          onApply={handleApplyResize}
          onCancel={handleCancelResize}
          onChange={handleResizeChange}
        />
      )}

      {(activeTool === "draw" || activeTool === "eraser") && (
        <DrawingPanel
          settings={drawingSettings}
          onChange={setDrawingSettings}
          onApply={handleApplyDrawing}
          onClear={handleClearDrawing}
          isEraser={activeTool === "eraser"}
        />
      )}

      {activeTool === "text" && (
        <TextPanel
          settings={textSettings}
          onChange={setTextSettings}
          onApply={handleApplyDrawing}
          onClear={handleClearText}
        />
      )}

      {activeTool === "effects" && (
        <EffectsPanel
          onApplySharpen={handleApplySharpen}
          onApplyVignette={handleApplyVignette}
          onApplyNoise={handleApplyNoise}
          onCancel={() => setActiveTool(null)}
        />
      )}

      {activeTool === "mosaic" && (
        <DrawingPanel
          settings={drawingSettings}
          onChange={setDrawingSettings}
          onApply={() => setActiveTool(null)}
          onClear={() => {
            canvasRef.current?.undo();
          }}
          isEraser={false}
          isMosaic
        />
      )}

      {activeTool === "freeRotate" && (
        <FreeRotatePanel
          onApply={handleApplyFreeRotate}
          onCancel={handleCancelFreeRotate}
          onChange={handleFreeRotateChange}
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
