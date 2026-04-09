export interface TextOverlayPanelProps {
  sourceUrl: string | null;
  onEffectApplied?: (resultUrl: string) => void;
  onDirty?: () => void;
  onStateChange?: (state: { canApply: boolean; isPending: boolean }) => void;
}

export interface TextOverlayPanelRef {
  reset: () => void;
  apply: () => void;
}
