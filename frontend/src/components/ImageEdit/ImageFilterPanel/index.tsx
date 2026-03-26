"use client";

import { useCallback } from "react";

import { useImageEditorStore } from "@/stores/imageEditor";
import { FilterPanel } from "@/components/ImageCreate/ImageEditor/FilterPanel";
import { applyFilterToCanvas } from "@/components/ImageCreate/ImageEditor/utils";

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
    setActiveTool(null);
  }, [canvasRef, filterValues, resetFilterValues, setActiveTool]);

  const handleResetFilter = useCallback(() => {
    resetFilterValues();
  }, [resetFilterValues]);

  return (
    <FilterPanel
      values={filterValues}
      onChange={setFilterValues}
      onApply={handleApplyFilter}
      onReset={handleResetFilter}
    />
  );
}
