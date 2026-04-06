import type { EditorCanvasHandle } from "@/components/ImageCreate/ImageEditor/EditorCanvas/types";
import type { CropRect } from "@/components/ImageCreate/ImageEditor/types";
import type { CropRatio } from "@/components/ImageCreate/ImageEditor/CropOverlay/types";

export interface EditPanelProps {
  canvasRef: React.RefObject<EditorCanvasHandle | null>;
  cropRect: CropRect | null;
  setCropRect: (rect: CropRect | null) => void;
  cropRatio: CropRatio;
  setCropRatio: (ratio: CropRatio) => void;
  onFreeRotateChange?: (degrees: number) => void;
  onResizeChange?: (width: number, height: number) => void;
}
