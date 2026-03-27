export interface ThumbnailPanelProps {
  sourceUrl: string | null;
  onSave?: (resultUrl: string, isPublic: boolean) => Promise<void>;
}
