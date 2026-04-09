export interface WatermarkPanelProps {
  sourceUrl: string | null;
  onEffectApplied?: (resultUrl: string) => void;
  onDirty?: () => void;
  onStateChange?: (state: { canApply: boolean; isPending: boolean }) => void;
}

export interface WatermarkPanelRef {
  reset: () => void;
  apply: () => void;
}
