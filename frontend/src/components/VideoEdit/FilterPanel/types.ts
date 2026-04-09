export interface FilterPanelProps {
  sourceUrl: string | null;
  onEffectApplied?: (resultUrl: string) => void;
  onPreviewFilter?: (cssFilter: string) => void;
  onDirty?: () => void;
  category?: "color" | "cinematic" | "vintage" | "mood" | "fun";
  onStateChange?: (state: { canApply: boolean; isPending: boolean }) => void;
}

export interface FilterPanelRef {
  reset: () => void;
  apply: () => void;
}
