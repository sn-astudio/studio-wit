export interface AudioPanelProps {
  sourceUrl: string | null;
  onAudioApplied?: (resultUrl: string) => void;
  onSave?: (resultUrl: string, isPublic: boolean) => Promise<void>;
  onDirty?: () => void;
}
