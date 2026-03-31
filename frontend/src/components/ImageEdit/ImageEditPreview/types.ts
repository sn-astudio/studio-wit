import type { EditorCanvasHandle } from "@/components/ImageCreate/ImageEditor/EditorCanvas/types";
import type {
  CropRect,
  DrawingSettings,
  EditorTool,
  FilterValues,
  ShapeSettings,
  TextSettings,
} from "@/components/ImageCreate/ImageEditor/types";

export interface ImageEditPreviewProps {
  imageUrl: string | null;
  canvasRef: React.RefObject<EditorCanvasHandle | null>;
  filterValues: FilterValues;
  activeTool: EditorTool | null;
  cropRect: CropRect | null;
  onCropChange: (rect: CropRect | null) => void;
  drawingSettings: DrawingSettings;
  shapeSettings: ShapeSettings;
  textSettings: TextSettings;
  onEyedropperPick?: (color: string) => void;
  onExport: () => void;
  onGenerateVideo: () => void;
}
