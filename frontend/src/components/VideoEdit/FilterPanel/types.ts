export interface FilterPanelProps {
  sourceUrl: string | null;
  onEffectApplied?: (resultUrl: string) => void;
  onPreviewFilter?: (cssFilter: string) => void;
  onDirty?: () => void;
}
