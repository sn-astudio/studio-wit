import type { SubtitlePreviewItem } from "../VideoEditPreview/types";

export interface SubtitlesPanelProps {
  sourceUrl: string | null;
  duration: number;
  onSubtitlesApplied?: (resultUrl: string) => void;
  onPreviewSubtitles?: (subs: SubtitlePreviewItem[]) => void;
  onDirty?: () => void;
  onStateChange?: (state: { canApply: boolean; isPending: boolean }) => void;
}

export interface SubtitlesPanelRef {
  reset: () => void;
  apply: () => void;
}
