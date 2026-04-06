import type { EditorCanvasHandle } from "@/components/ImageCreate/ImageEditor/EditorCanvas/types";
import type { CropRect, FilterValues } from "@/components/ImageCreate/ImageEditor/types";

export interface ImageEditPreviewProps {
  imageUrl: string | null;
  canvasRef: React.RefObject<EditorCanvasHandle | null>;
  filterValues: FilterValues;
  isCropping: boolean;
  isFreeCrop?: boolean;
  cropRect: CropRect | null;
  onCropChange: (rect: CropRect | null) => void;
  onExport: () => void;
  onGenerateVideo: () => void;
  onUpload?: () => void;
  onScrollToHistory?: () => void;
  onRemoveImage?: () => void;
  onFileDrop?: (file: File) => void;
}
