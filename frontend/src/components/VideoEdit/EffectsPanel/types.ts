export interface EffectsPanelProps {
  sourceUrl: string | null;
  onEffectApplied?: (resultUrl: string) => void;
  onPreviewFilter?: (cssFilter: string) => void;
}
