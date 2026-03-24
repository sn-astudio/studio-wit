import { create } from "zustand";

import type { EditorTool, FilterValues } from "@/components/ImageCreate/ImageEditor/types";
import { DEFAULT_FILTER_VALUES } from "@/components/ImageCreate/ImageEditor/const";

interface ImageEditorState {
  activeTool: EditorTool | null;
  filterValues: FilterValues;
  historyIndex: number;
  historyLength: number;

  setActiveTool: (tool: EditorTool | null) => void;
  setFilterValues: (values: FilterValues) => void;
  resetFilterValues: () => void;
  setHistoryMeta: (index: number, length: number) => void;
  reset: () => void;
}

export const useImageEditorStore = create<ImageEditorState>((set) => ({
  activeTool: null,
  filterValues: { ...DEFAULT_FILTER_VALUES },
  historyIndex: -1,
  historyLength: 0,

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

  reset: () =>
    set({
      activeTool: null,
      filterValues: { ...DEFAULT_FILTER_VALUES },
      historyIndex: -1,
      historyLength: 0,
    }),
}));
