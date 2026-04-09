export interface GifPanelProps {
  sourceUrl: string | null;
  onDirty?: () => void;
  onStateChange?: (state: { canApply: boolean; isPending: boolean }) => void;
}

export interface GifPanelRef {
  reset: () => void;
  apply: () => void;
}
