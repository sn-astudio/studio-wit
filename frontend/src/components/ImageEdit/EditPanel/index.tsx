"use client";

import { useCallback, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { Undo2, Redo2 } from "lucide-react";

import { useImageEditorStore } from "@/stores/imageEditor";
import { EditorToolbar } from "@/components/ImageCreate/ImageEditor/EditorToolbar";
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/Tooltip";
import { CropOverlay } from "@/components/ImageCreate/ImageEditor/CropOverlay";
import { ResizePanel } from "@/components/ImageCreate/ImageEditor/ResizePanel";
import { DrawingPanel } from "@/components/ImageCreate/ImageEditor/DrawingPanel";
import { TextPanel } from "@/components/ImageCreate/ImageEditor/TextPanel";
import { FreeRotatePanel } from "@/components/ImageCreate/ImageEditor/FreeRotatePanel";
import { EffectsPanel } from "@/components/ImageCreate/ImageEditor/EffectsPanel";
import {
  rotateCanvas90,
  flipCanvasH,
  flipCanvasV,
  resizeCanvas,
  rotateCanvasFree,
  applySharpen,
  applyVignette,
  applyNoise,
} from "@/components/ImageCreate/ImageEditor/utils";
import { clampRect } from "@/components/ImageCreate/ImageEditor/CropOverlay/utils";
import type { EditPanelProps } from "./types";

export function EditPanel({
  canvasRef,
  cropRect,
  setCropRect,
  cropRatio,
  setCropRatio,
  onFreeRotateChange,
  onResizeChange,
}: EditPanelProps) {
  const t = useTranslations("ImageEdit");
  const activeTool = useImageEditorStore((s) => s.activeTool);
  const setActiveTool = useImageEditorStore((s) => s.setActiveTool);
  const historyIndex = useImageEditorStore((s) => s.historyIndex);
  const historyLength = useImageEditorStore((s) => s.historyLength);
  const drawingSettings = useImageEditorStore((s) => s.drawingSettings);
  const setDrawingSettings = useImageEditorStore((s) => s.setDrawingSettings);
  const textSettings = useImageEditorStore((s) => s.textSettings);
  const setTextSettings = useImageEditorStore((s) => s.setTextSettings);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < historyLength - 1;
  const ratioFromPanelRef = useRef(false);

  const handleRotate = useCallback(() => {
    const canvas = canvasRef.current?.getMainCanvas();
    if (!canvas) return;
    canvasRef.current?.pushSnapshot();
    const rotated = rotateCanvas90(canvas);
    canvasRef.current?.replaceMainCanvas(rotated);
  }, [canvasRef]);

  const handleFlipH = useCallback(() => {
    const canvas = canvasRef.current?.getMainCanvas();
    if (!canvas) return;
    canvasRef.current?.pushSnapshot();
    const flipped = flipCanvasH(canvas);
    canvasRef.current?.replaceMainCanvas(flipped);
  }, [canvasRef]);

  const handleFlipV = useCallback(() => {
    const canvas = canvasRef.current?.getMainCanvas();
    if (!canvas) return;
    canvasRef.current?.pushSnapshot();
    const flipped = flipCanvasV(canvas);
    canvasRef.current?.replaceMainCanvas(flipped);
  }, [canvasRef]);

  const handleApplyCrop = useCallback(() => {
    if (!cropRect) return;
    const canvas = canvasRef.current?.getMainCanvas();
    if (!canvas) return;
    const clamped = clampRect(cropRect, canvas.width, canvas.height);
    if (clamped.width < 2 || clamped.height < 2) return;
    canvasRef.current?.applyCrop(clamped);
    setCropRect(null);
    setActiveTool(null);
  }, [canvasRef, cropRect, setCropRect, setActiveTool]);

  const handleCancelCrop = useCallback(() => {
    setCropRect(null);
    setActiveTool(null);
  }, [setCropRect, setActiveTool]);

  // crop 모드 진입 시 초기화
  const prevToolRef = useRef(activeTool);
  useEffect(() => {
    if (activeTool === "crop" && prevToolRef.current !== "crop") {
      setCropRect(null);
      setCropRatio("free");
    }
    prevToolRef.current = activeTool;
  }, [activeTool, setCropRect]);

  // 캔버스에서 cropRect 크기가 변경되면 (이동이 아닌 리사이즈/새 드래그) 자유로 리셋
  const prevSizeRef = useRef<{ w: number; h: number } | null>(null);
  useEffect(() => {
    if (!ratioFromPanelRef.current && activeTool === "crop" && cropRect) {
      const prev = prevSizeRef.current;
      if (prev != null && cropRatio !== "free" && (Math.round(prev.w) !== Math.round(cropRect.width) || Math.round(prev.h) !== Math.round(cropRect.height))) {
        setCropRatio("free");
      }
    }
    prevSizeRef.current = cropRect ? { w: cropRect.width, h: cropRect.height } : null;
    if (ratioFromPanelRef.current) {
      const id = setTimeout(() => { ratioFromPanelRef.current = false; }, 100);
      return () => clearTimeout(id);
    }
  }, [cropRect, activeTool]);

  const handleApplyResize = useCallback(
    (width: number, height: number) => {
      const canvas = canvasRef.current?.getMainCanvas();
      if (!canvas) return;
      canvasRef.current?.pushSnapshot();
      const resized = resizeCanvas(canvas, width, height);
      canvasRef.current?.replaceMainCanvas(resized);
      onResizeChange?.(width, height);
      setActiveTool(null);
    },
    [canvasRef, setActiveTool, onResizeChange],
  );

  const handleCancelResize = useCallback(() => {
    const canvas = canvasRef.current?.getMainCanvas();
    if (canvas) {
      onResizeChange?.(canvas.width, canvas.height);
    }
    setActiveTool(null);
  }, [canvasRef, setActiveTool, onResizeChange]);

  const handleApplyDrawing = useCallback(() => {
    canvasRef.current?.bakeOverlay();
    setActiveTool(null);
  }, [canvasRef, setActiveTool]);

  const handleClearDrawing = useCallback(() => {
    canvasRef.current?.clearOverlay();
  }, [canvasRef]);

  const handleTextPlace = useCallback(
    (x: number, y: number) => {
      setTextSettings({ ...textSettings, placedX: x, placedY: y });
    },
    [textSettings, setTextSettings],
  );

  const handleClearText = useCallback(() => {
    setTextSettings({ ...textSettings, placedX: null, placedY: null });
    canvasRef.current?.clearOverlay();
  }, [textSettings, setTextSettings, canvasRef]);

  const handleApplyFreeRotate = useCallback(
    (degrees: number) => {
      const canvas = canvasRef.current?.getMainCanvas();
      if (!canvas) return;
      canvasRef.current?.pushSnapshot();
      const rotated = rotateCanvasFree(canvas, degrees);
      canvasRef.current?.replaceMainCanvas(rotated);
      onFreeRotateChange?.(0);
      setActiveTool(null);
    },
    [canvasRef, setActiveTool, onFreeRotateChange],
  );

  const handleCancelFreeRotate = useCallback(() => {
    onFreeRotateChange?.(0);
    setActiveTool(null);
  }, [setActiveTool, onFreeRotateChange]);

  const handleApplySharpen = useCallback(
    (amount: number) => {
      const canvas = canvasRef.current?.getMainCanvas();
      if (!canvas) return;
      canvasRef.current?.pushSnapshot();
      const result = applySharpen(canvas, amount);
      canvasRef.current?.replaceMainCanvas(result);
    },
    [canvasRef],
  );

  const handleApplyVignette = useCallback(
    (intensity: number) => {
      const canvas = canvasRef.current?.getMainCanvas();
      if (!canvas) return;
      canvasRef.current?.pushSnapshot();
      const result = applyVignette(canvas, intensity);
      canvasRef.current?.replaceMainCanvas(result);
    },
    [canvasRef],
  );

  const handleApplyNoise = useCallback(
    (amount: number) => {
      const canvas = canvasRef.current?.getMainCanvas();
      if (!canvas) return;
      canvasRef.current?.pushSnapshot();
      const result = applyNoise(canvas, amount);
      canvasRef.current?.replaceMainCanvas(result);
    },
    [canvasRef],
  );

  const currentCanvas = canvasRef.current?.getMainCanvas();
  const canvasWidth = currentCanvas?.width ?? 0;
  const canvasHeight = currentCanvas?.height ?? 0;

  return (
    <div className="flex flex-1 flex-col gap-4">
      {/* 도구 */}
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
        hideFilter
      />

      {/* undo/redo */}
      <TooltipProvider delay={0}>
        <div className="flex items-center justify-center gap-1">
          <Tooltip>
            <TooltipTrigger
              render={
                <button
                  onClick={() => canvasRef.current?.undo()}
                  disabled={!canUndo}
                  className="flex size-8 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-neutral-100 hover:text-foreground disabled:pointer-events-none disabled:opacity-30 dark:hover:bg-neutral-800"
                >
                  <Undo2 className="size-4" />
                </button>
              }
            />
            <TooltipContent>{t("undo")}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger
              render={
                <button
                  onClick={() => canvasRef.current?.redo()}
                  disabled={!canRedo}
                  className="flex size-8 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-neutral-100 hover:text-foreground disabled:pointer-events-none disabled:opacity-30 dark:hover:bg-neutral-800"
                >
                  <Redo2 className="size-4" />
                </button>
              }
            />
            <TooltipContent>{t("redo")}</TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>

      {/* 자르기 옵션 — 구분선 + 비율 프리셋 */}
      {activeTool === "crop" && (
        <>
          <div className="h-px bg-neutral-100 dark:bg-neutral-800" />
          <CropOverlay
            cropRect={cropRect}
            canvasWidth={canvasRef.current?.getMainCanvas()?.width ?? 0}
            canvasHeight={canvasRef.current?.getMainCanvas()?.height ?? 0}
            selectedRatio={cropRatio}
            onRatioChange={(ratio) => {
              ratioFromPanelRef.current = true;
              setCropRatio(ratio);
            }}
            onCropChange={setCropRect}
            onApply={handleApplyCrop}
            onCancel={handleCancelCrop}
          />
        </>
      )}

      {activeTool === "resize" && (
        <ResizePanel
          currentWidth={canvasWidth}
          currentHeight={canvasHeight}
          onApply={handleApplyResize}
          onCancel={handleCancelResize}
          onChange={onResizeChange}
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

      {activeTool === "freeRotate" && (
        <FreeRotatePanel
          onApply={handleApplyFreeRotate}
          onCancel={handleCancelFreeRotate}
          onChange={onFreeRotateChange}
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
          isMosaic
          onClear={() => {
            canvasRef.current?.undo();
          }}
          isEraser={false}
        />
      )}
    </div>
  );
}
