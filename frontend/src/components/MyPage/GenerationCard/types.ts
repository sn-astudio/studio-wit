import type { Generation } from "@/types/api";

export interface GenerationCardProps {
  gen: Generation;
  onClick?: () => void;
  onDelete?: () => void;
}
