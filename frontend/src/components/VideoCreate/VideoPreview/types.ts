import type { Generation } from "@/types/api";

export interface VideoPreviewProps {
  videoUrl?: string;
  isGenerating?: boolean;
  progress?: number | null;
  generations?: Generation[];
  onSelectGeneration?: (gen: Generation) => void;
  onDelete?: (gen: Generation) => void;
  onCancel?: () => void;
  generatingRatio?: string;
}
