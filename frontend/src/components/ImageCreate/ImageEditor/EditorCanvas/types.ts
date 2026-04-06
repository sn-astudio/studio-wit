import type { CropRect, FilterValues } from "../types";

export interface EditorCanvasProps {
  imageUrl: string;
  filterValues: FilterValues;
  isCropping: boolean;
  isFreeCrop?: boolean;
  cropRect: CropRect | null;
  onCropChange: (rect: CropRect | null) => void;
}

export interface EditorCanvasHandle {
  pushSnapshot: () => void;
  undo: () => void;
  redo: () => void;
  getMainCanvas: () => HTMLCanvasElement | null;
  replaceMainCanvas: (source: HTMLCanvasElement) => void;
  applyCrop: (rect: CropRect) => void;
}
