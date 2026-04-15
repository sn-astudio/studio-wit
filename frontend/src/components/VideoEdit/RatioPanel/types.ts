export interface RatioPanelProps {
  sourceUrl: string | null;
  sourceAspectRatio?: string;
  onRatioApplied?: (resultUrl: string) => void;
  onPreviewRatio?: (ratio: string | null) => void;
  onSave?: (resultUrl: string, isPublic: boolean) => Promise<void>;
  onDirty?: () => void;
  onStateChange?: (state: { canApply: boolean; isPending: boolean }) => void;
}

export interface RatioPanelRef {
  reset: () => void;
  apply: () => void;
}
