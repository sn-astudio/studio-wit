import type { Generation } from "@/types/api";

export interface GenerationHistoryProps {
  onSelect?: (gen: Generation) => void;
  expanded?: boolean;
  onToggleExpand?: () => void;
}
