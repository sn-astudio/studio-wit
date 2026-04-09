export interface ThumbnailPanelProps {
  sourceUrl: string | null;
  onSave?: (resultUrl: string, isPublic: boolean) => Promise<void>;
  onThumbnailsChange?: (thumbnails: string[]) => void;
  onStateChange?: (state: { canApply: boolean; isPending: boolean }) => void;
}

export interface ThumbnailPanelRef {
  reset: () => void;
  apply: () => void;
}
