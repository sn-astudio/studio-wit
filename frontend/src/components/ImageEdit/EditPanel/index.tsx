"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useImageEditorStore } from "@/stores/imageEditor";
import { EditorToolbar } from "@/components/ImageCreate/ImageEditor/EditorToolbar";
import { CropOverlay } from "@/components/ImageCreate/ImageEditor/CropOverlay";
import {
  rotateCanvas90,
  flipCanvasH,
  flipCanvasV,
} from "@/components/ImageCreate/ImageEditor/utils";
import { clampRect } from "@/components/ImageCreate/ImageEditor/CropOverlay/utils";
import type { CropRatio } from "@/components/ImageCreate/ImageEditor/CropOverlay/types";

import type { EditPanelProps } from "./types";

export function EditPanel({
  canvasRef,
  cropRect,
  setCropRect,
}: EditPanelProps) {
  const activeTool = useImageEditorStore((s) => s.activeTool);
  const setActiveTool = useImageEditorStore((s) => s.setActiveTool);
  const [cropRatio, setCropRatio] = useState<CropRatio>("free");
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

  // 캔버스에서 cropRect가 변경되면 (패널 비율 선택이 아닐 때) 자유로 리셋
  useEffect(() => {
    if (ratioFromPanelRef.current) {
      // 패널에서 변경한 것 → 타이머 후 리셋
      const id = setTimeout(() => { ratioFromPanelRef.current = false; }, 100);
      return () => clearTimeout(id);
    }
    if (activeTool === "crop" && cropRect) {
      setCropRatio("free");
    }
  }, [cropRect, activeTool]);

  return (
    <div className="flex flex-1 flex-col gap-4">
      {/* 도구 */}
      <EditorToolbar
        activeTool={activeTool}
        onToolChange={setActiveTool}
        onRotate={handleRotate}
        onFlipH={handleFlipH}
        onFlipV={handleFlipV}
      />

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
    </div>
  );
}
