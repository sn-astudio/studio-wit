"use client";

import { useCallback } from "react";

import { useImageEditorStore } from "@/stores/imageEditor";
import { EditorToolbar } from "@/components/ImageCreate/ImageEditor/EditorToolbar";
import { CropOverlay } from "@/components/ImageCreate/ImageEditor/CropOverlay";
import {
  rotateCanvas90,
  flipCanvasH,
  flipCanvasV,
} from "@/components/ImageCreate/ImageEditor/utils";
import { clampRect } from "@/components/ImageCreate/ImageEditor/CropOverlay/utils";

import type { EditPanelProps } from "./types";

export function EditPanel({
  canvasRef,
  cropRect,
  setCropRect,
}: EditPanelProps) {
  const activeTool = useImageEditorStore((s) => s.activeTool);
  const setActiveTool = useImageEditorStore((s) => s.setActiveTool);
  const historyIndex = useImageEditorStore((s) => s.historyIndex);
  const historyLength = useImageEditorStore((s) => s.historyLength);

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
      />

      {activeTool === "crop" && (
        <CropOverlay
          cropRect={cropRect}
          onApply={handleApplyCrop}
          onCancel={handleCancelCrop}
        />
      )}
    </div>
  );
}
