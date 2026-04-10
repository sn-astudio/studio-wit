import type {
  CropRect,
  DrawingSettings,
  EditorTool,
  FilterValues,
  TextSettings,
} from "../types";

export interface EditorCanvasProps {
  imageUrl: string;
  filterValues: FilterValues;
  activeTool: EditorTool | null;
  cropRect: CropRect | null;
  onCropChange: (rect: CropRect | null) => void;
  drawingSettings: DrawingSettings;
  textSettings: TextSettings;
  onTextPlace?: (x: number, y: number) => void;
  freeRotateDegrees?: number;
  resizePreviewScale?: { scaleX: number; scaleY: number };
  drawEraserMode?: boolean;
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
  hasOverlayContent: () => boolean;
  restoreSnapshot: (index: number) => void;
}
