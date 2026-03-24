import type { Generation } from "@/types/api";

export interface HistoryCardProps {
  gen: Generation;
  onSelect?: (url: string) => void;
}
