import type { EditorCanvasHandle } from "@/components/ImageCreate/ImageEditor/EditorCanvas/types";
import type { CropRect } from "@/components/ImageCreate/ImageEditor/types";

export interface EditPanelProps {
  canvasRef: React.RefObject<EditorCanvasHandle | null>;
  cropRect: CropRect | null;
  setCropRect: (rect: CropRect | null) => void;
  onFreeRotateChange?: (degrees: number) => void;
  onResizeChange?: (width: number, height: number) => void;
}
