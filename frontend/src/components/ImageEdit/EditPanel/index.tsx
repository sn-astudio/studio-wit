"use client";

import { useCallback } from "react";

import { useImageEditorStore } from "@/stores/imageEditor";
import { EditorToolbar } from "@/components/ImageCreate/ImageEditor/EditorToolbar";
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
  onFreeRotateChange,
  onResizeChange,
}: EditPanelProps) {
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
    <div className="flex flex-col gap-2">
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

      {activeTool === "crop" && (
        <CropOverlay
          cropRect={cropRect}
          onApply={handleApplyCrop}
          onCancel={handleCancelCrop}
        />
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
