import type { CropRect } from "../types";

export interface CropOverlayProps {
  cropRect: CropRect | null;
  onApply: () => void;
  onCancel: () => void;
}
