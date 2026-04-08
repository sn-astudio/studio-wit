"use client";

import { useCallback } from "react";

import { useImageEditorStore } from "@/stores/imageEditor";
import { FilterPanel } from "@/components/ImageCreate/ImageEditor/FilterPanel";
import { applyFilterToCanvas, applySharpen, applyVignette, applyNoise } from "@/components/ImageCreate/ImageEditor/utils";

import type { ImageFilterPanelProps } from "./types";

export function ImageFilterPanel({ canvasRef }: ImageFilterPanelProps) {
  const filterValues = useImageEditorStore((s) => s.filterValues);
  const setFilterValues = useImageEditorStore((s) => s.setFilterValues);
  const resetFilterValues = useImageEditorStore((s) => s.resetFilterValues);
  const setActiveTool = useImageEditorStore((s) => s.setActiveTool);

  const handleApplyFilter = useCallback(() => {
    const canvas = canvasRef.current?.getMainCanvas();
    if (!canvas) return;
    canvasRef.current?.pushSnapshot();
    const baked = applyFilterToCanvas(canvas, filterValues);
    canvasRef.current?.replaceMainCanvas(baked);
    resetFilterValues();
  }, [canvasRef, filterValues, resetFilterValues]);

  const handleResetFilter = useCallback(() => {
    resetFilterValues();
  }, [resetFilterValues]);

  const handleApplySharpen = useCallback((amount: number) => {
    const canvas = canvasRef.current?.getMainCanvas();
    if (!canvas) return;
    canvasRef.current?.pushSnapshot();
    const result = applySharpen(canvas, amount);
    canvasRef.current?.replaceMainCanvas(result);
  }, [canvasRef]);

  const handleApplyVignette = useCallback((intensity: number) => {
    const canvas = canvasRef.current?.getMainCanvas();
    if (!canvas) return;
    canvasRef.current?.pushSnapshot();
    const result = applyVignette(canvas, intensity);
    canvasRef.current?.replaceMainCanvas(result);
  }, [canvasRef]);

  const handleApplyNoise = useCallback((amount: number) => {
    const canvas = canvasRef.current?.getMainCanvas();
    if (!canvas) return;
    canvasRef.current?.pushSnapshot();
    const result = applyNoise(canvas, amount);
    canvasRef.current?.replaceMainCanvas(result);
  }, [canvasRef]);

  return (
    <FilterPanel
      values={filterValues}
      onChange={setFilterValues}
      onApply={handleApplyFilter}
      onReset={handleResetFilter}
      onApplySharpen={handleApplySharpen}
      onApplyVignette={handleApplyVignette}
      onApplyNoise={handleApplyNoise}
    />
  );
}
