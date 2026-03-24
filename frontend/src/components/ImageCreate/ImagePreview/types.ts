export interface ImagePreviewProps {
  imageUrl?: string;
  isGenerating?: boolean;
  progress?: number | null;
  onEdit?: () => void;
}
