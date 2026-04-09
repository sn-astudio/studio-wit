export interface CropPanelProps {
  sourceUrl: string | null;
  videoWidth: number;
  videoHeight: number;
  onCropApplied?: (resultUrl: string) => void;
  onSave?: (resultUrl: string, isPublic: boolean) => Promise<void>;
  onDirty?: () => void;
  onStateChange?: (state: { isOriginal: boolean; isPending: boolean }) => void;
}

export interface CropPanelRef {
  reset: () => void;
  apply: () => void;
}
