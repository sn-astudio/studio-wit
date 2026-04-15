export type EditorTool =
  | "crop"
  | "rotate"
  | "filter"
  | "resize"
  | "draw"
  | "eraser"
  | "text"
  | "freeRotate"
  | "transform"
  | "zoom"
  | "effects"
  | "mosaic";

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
  /** 배치된 위치 (null이면 아직 미배치) */
  placedX: number | null;
  placedY: number | null;
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
  sharpen: number;
  vignette: number;
  noise: number;
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
