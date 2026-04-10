import type { EditorCanvasHandle } from "@/components/ImageCreate/ImageEditor/EditorCanvas/types";
import type {
  CropRect,
  DrawingSettings,
  EditorTool,
  FilterValues,
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
  textSettings: TextSettings;
  onTextPlace?: (x: number, y: number) => void;
  freeRotateDegrees?: number;
  resizePreviewScale?: { scaleX: number; scaleY: number };
  drawEraserMode?: boolean;
  onExport: () => void;
  onGenerateVideo: () => void;
  onUpload?: () => void;
  onScrollToHistory?: () => void;
  onRemoveImage?: () => void;
  onFileDrop?: (file: File) => void;
  onImageSourceDrop?: (source: { url: string; generationId?: string }) => void;
}
