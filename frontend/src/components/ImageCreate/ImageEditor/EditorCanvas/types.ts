import type {
  CropRect,
  DrawingSettings,
  EditorTool,
  FilterValues,
  ShapeSettings,
  TextSettings,
} from "../types";

export interface EditorCanvasProps {
  imageUrl: string;
  filterValues: FilterValues;
  activeTool: EditorTool | null;
  cropRect: CropRect | null;
  onCropChange: (rect: CropRect | null) => void;
  drawingSettings: DrawingSettings;
  shapeSettings: ShapeSettings;
  textSettings: TextSettings;
  onEyedropperPick?: (color: string) => void;
}

export interface EditorCanvasHandle {
  pushSnapshot: () => void;
  undo: () => void;
  redo: () => void;
  getMainCanvas: () => HTMLCanvasElement | null;
  getOverlayCanvas: () => HTMLCanvasElement | null;
  replaceMainCanvas: (source: HTMLCanvasElement) => void;
  applyCrop: (rect: CropRect) => void;
  bakeOverlay: () => void;
  clearOverlay: () => void;
}
