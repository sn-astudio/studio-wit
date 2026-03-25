export type EditorTool = "crop" | "rotate" | "filter";

export interface FilterValues {
  brightness: number;
  contrast: number;
  saturate: number;
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
