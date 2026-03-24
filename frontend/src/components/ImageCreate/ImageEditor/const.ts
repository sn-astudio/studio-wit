import type { EditorTool, FilterValues } from "./types";

export const MAX_HISTORY = 30;

export const EDITOR_TOOLS: { id: EditorTool; labelKey: string }[] = [
  { id: "crop", labelKey: "crop" },
  { id: "rotate", labelKey: "rotate" },
  { id: "filter", labelKey: "filter" },
];

export const DEFAULT_FILTER_VALUES: FilterValues = {
  brightness: 100,
  contrast: 100,
  saturate: 100,
};

export const FILTER_RANGES = {
  brightness: { min: 0, max: 200, step: 1 },
  contrast: { min: 0, max: 200, step: 1 },
  saturate: { min: 0, max: 200, step: 1 },
} as const;
