import type {
  DrawingSettings,
  EditorTool,
  FilterValues,
  TextSettings,
} from "./types";

export const MAX_HISTORY = 30;

export const EDITOR_TOOLS: { id: EditorTool; labelKey: string }[] = [
  { id: "crop", labelKey: "crop" },
  { id: "rotate", labelKey: "rotate" },
  { id: "filter", labelKey: "filter" },
  { id: "resize", labelKey: "resize" },
  { id: "draw", labelKey: "draw" },
  { id: "text", labelKey: "text" },
];

export const DEFAULT_FILTER_VALUES: FilterValues = {
  brightness: 100,
  contrast: 100,
  saturate: 100,
  hueRotate: 0,
  grayscale: 0,
  sepia: 0,
  blur: 0,
  invert: 0,
  opacity: 100,
  sharpen: 0,
  vignette: 0,
  noise: 0,
};

export const FILTER_RANGES = {
  brightness: { min: 0, max: 200, step: 1 },
  contrast: { min: 0, max: 200, step: 1 },
  saturate: { min: 0, max: 200, step: 1 },
  hueRotate: { min: 0, max: 360, step: 1 },
  grayscale: { min: 0, max: 100, step: 1 },
  sepia: { min: 0, max: 100, step: 1 },
  blur: { min: 0, max: 20, step: 0.5 },
  invert: { min: 0, max: 100, step: 1 },
  opacity: { min: 0, max: 100, step: 1 },
  sharpen: { min: 0, max: 10, step: 1 },
  vignette: { min: 0, max: 100, step: 1 },
  noise: { min: 0, max: 100, step: 1 },
} as const;

export const DEFAULT_DRAWING_SETTINGS: DrawingSettings = {
  color: "#ff0000",
  size: 4,
  opacity: 100,
};

export const DEFAULT_TEXT_SETTINGS: TextSettings = {
  text: "",
  fontFamily: "sans-serif",
  fontSize: 32,
  color: "#ffffff",
  bold: false,
  italic: false,
  placedX: null,
  placedY: null,
};

export const RESIZE_PRESETS = [
  { label: "25%", factor: 0.25 },
  { label: "50%", factor: 0.5 },
  { label: "75%", factor: 0.75 },
  { label: "150%", factor: 1.5 },
  { label: "200%", factor: 2 },
] as const;
