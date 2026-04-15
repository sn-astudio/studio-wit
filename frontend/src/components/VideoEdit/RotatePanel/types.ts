export interface RotatePanelProps {
  sourceUrl: string | null;
  onRotateApplied?: (resultUrl: string) => void;
  onPreviewTransform?: (css: string | null) => void;
  onSave?: (resultUrl: string, isPublic: boolean) => Promise<void>;
  onDirty?: () => void;
  onStateChange?: (state: { hasSelection: boolean; isPending: boolean }) => void;
}

export interface RotatePanelRef {
  reset: () => void;
  apply: () => void;
}
