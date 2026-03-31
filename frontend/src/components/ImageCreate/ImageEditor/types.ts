export type EditorTool =
  | "crop"
  | "rotate"
  | "filter"
  | "resize"
  | "draw"
  | "eraser"
  | "eyedropper"
  | "shape"
  | "text"
  | "freeRotate"
  | "zoom"
  | "effects"
  | "mosaic";

export type ShapeType = "rect" | "circle" | "line" | "arrow";

export interface ZoomPanState {
  scale: number;
  offsetX: number;
  offsetY: number;
}

export interface DrawingSettings {
  color: string;
  size: number;
  opacity: number;
}

export interface TextSettings {
  text: string;
  fontFamily: string;
  fontSize: number;
  color: string;
  bold: boolean;
  italic: boolean;
}

export interface ShapeSettings {
  type: ShapeType;
  color: string;
  strokeWidth: number;
  fill: boolean;
}

export interface FilterValues {
  brightness: number;
  contrast: number;
  saturate: number;
  hueRotate: number;
  grayscale: number;
  sepia: number;
  blur: number;
  invert: number;
  opacity: number;
}

export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ImageEditorProps {
  imageUrl: string;
  onSave: (dataUrl: string) => void;
  onCancel: () => void;
}
