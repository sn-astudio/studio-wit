export interface SceneSplitPanelProps {
  sourceUrl: string | null;
  duration: number;
  onSceneExtracted?: (resultUrl: string) => void;
}
