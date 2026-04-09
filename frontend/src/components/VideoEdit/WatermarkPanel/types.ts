import type { WatermarkPreview } from "../VideoEditPreview/types";

export interface WatermarkPanelProps {
  sourceUrl: string | null;
  onEffectApplied?: (resultUrl: string) => void;
  onPreviewWatermark?: (wm: WatermarkPreview | null) => void;
  onDirty?: () => void;
  onStateChange?: (state: { canApply: boolean; isPending: boolean }) => void;
}

export interface WatermarkPanelRef {
  reset: () => void;
  apply: () => void;
}
