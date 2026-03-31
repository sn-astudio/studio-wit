import { create } from "zustand";

import type {
  DrawingSettings,
  EditorTool,
  FilterValues,
  ShapeSettings,
  TextSettings,
  ZoomPanState,
} from "@/components/ImageCreate/ImageEditor/types";
import {
  DEFAULT_DRAWING_SETTINGS,
  DEFAULT_FILTER_VALUES,
  DEFAULT_SHAPE_SETTINGS,
  DEFAULT_TEXT_SETTINGS,
} from "@/components/ImageCreate/ImageEditor/const";

interface ImageEditorState {
  activeTool: EditorTool | null;
  filterValues: FilterValues;
  historyIndex: number;
  historyLength: number;
  drawingSettings: DrawingSettings;
  shapeSettings: ShapeSettings;
  textSettings: TextSettings;
  eyedropperColor: string | null;
  zoomPan: ZoomPanState;

  setActiveTool: (tool: EditorTool | null) => void;
  setFilterValues: (values: FilterValues) => void;
  resetFilterValues: () => void;
  setHistoryMeta: (index: number, length: number) => void;
  setDrawingSettings: (settings: DrawingSettings) => void;
  setShapeSettings: (settings: ShapeSettings) => void;
  setTextSettings: (settings: TextSettings) => void;
  setEyedropperColor: (color: string | null) => void;
  setZoomPan: (state: ZoomPanState) => void;
  resetZoomPan: () => void;
  reset: () => void;
}

export const useImageEditorStore = create<ImageEditorState>((set) => ({
  activeTool: null,
  filterValues: { ...DEFAULT_FILTER_VALUES },
  historyIndex: -1,
  historyLength: 0,
  drawingSettings: { ...DEFAULT_DRAWING_SETTINGS },
  shapeSettings: { ...DEFAULT_SHAPE_SETTINGS },
  textSettings: { ...DEFAULT_TEXT_SETTINGS },
  eyedropperColor: null,
  zoomPan: { scale: 1, offsetX: 0, offsetY: 0 },

  setActiveTool: (tool) =>
    set((s) => ({
      activeTool: s.activeTool === tool ? null : tool,
      filterValues:
        s.activeTool === tool || tool !== "filter"
          ? s.filterValues
          : { ...DEFAULT_FILTER_VALUES },
    })),

  setFilterValues: (values) => set({ filterValues: values }),

  resetFilterValues: () =>
    set({ filterValues: { ...DEFAULT_FILTER_VALUES } }),

  setHistoryMeta: (index, length) =>
    set({ historyIndex: index, historyLength: length }),

  setDrawingSettings: (settings) => set({ drawingSettings: settings }),

  setShapeSettings: (settings) => set({ shapeSettings: settings }),

  setTextSettings: (settings) => set({ textSettings: settings }),

  setEyedropperColor: (color) => set({ eyedropperColor: color }),

  setZoomPan: (state) => set({ zoomPan: state }),

  resetZoomPan: () =>
    set({ zoomPan: { scale: 1, offsetX: 0, offsetY: 0 } }),

  reset: () =>
    set({
      activeTool: null,
      filterValues: { ...DEFAULT_FILTER_VALUES },
      historyIndex: -1,
      historyLength: 0,
      drawingSettings: { ...DEFAULT_DRAWING_SETTINGS },
      shapeSettings: { ...DEFAULT_SHAPE_SETTINGS },
      textSettings: { ...DEFAULT_TEXT_SETTINGS },
      eyedropperColor: null,
      zoomPan: { scale: 1, offsetX: 0, offsetY: 0 },
    }),
}));
