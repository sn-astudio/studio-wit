import type { CropRect } from "../types";

export type CropRatio = "free" | "1:1" | "4:3" | "3:4" | "16:9" | "9:16";

export interface CropOverlayProps {
  cropRect: CropRect | null;
  canvasWidth: number;
  canvasHeight: number;
  selectedRatio: CropRatio;
  onRatioChange: (ratio: CropRatio) => void;
  onCropChange: (rect: CropRect | null) => void;
  onApply: () => void;
  onCancel: () => void;
}
