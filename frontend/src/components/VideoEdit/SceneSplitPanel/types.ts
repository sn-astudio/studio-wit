export interface SceneSplitPanelProps {
  sourceUrl: string | null;
  duration: number;
  onSceneExtracted?: (resultUrl: string) => void;
  onStateChange?: (state: { canApply: boolean; isPending: boolean }) => void;
}

export interface SceneSplitPanelRef {
  reset: () => void;
  apply: () => void;
}
