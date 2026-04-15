import type { TextOverlayPreview, WatermarkPreview } from "../VideoEditPreview/types";

export interface EffectsPanelProps {
  sourceUrl: string | null;
  onEffectApplied?: (resultUrl: string) => void;
  onPreviewFilter?: (cssFilter: string) => void;
  onPreviewTextOverlay?: (overlay: TextOverlayPreview | null) => void;
  onPreviewWatermark?: (wm: WatermarkPreview | null) => void;
  onPreviewSpeed?: (speed: number) => void;
  onDirty?: () => void;
  onStateChange?: (state: { canApply: boolean; isPending: boolean }) => void;
  category?: "speed" | "output";
}

export interface EffectsPanelRef {
  reset: () => void;
  apply: () => void;
}
