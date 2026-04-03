import type { Generation } from "@/types/api";

export interface ImagePreviewProps {
  imageUrl?: string;
  isGenerating?: boolean;
  progress?: number | null;
  generations?: Generation[];
  onSelectGeneration?: (gen: Generation) => void;
  onEdit?: (imageUrl: string) => void;
  onDelete?: (gen: Generation) => void;
  generatingRatio?: string;
  generatingCount?: number;
}
