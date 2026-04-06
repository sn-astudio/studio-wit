import type { DrawingSettings } from "../types";

export interface DrawingPanelProps {
  settings: DrawingSettings;
  onChange: (settings: DrawingSettings) => void;
  onApply: () => void;
  onClear: () => void;
  isEraser?: boolean;
  isMosaic?: boolean;
  hasContent?: boolean;
}
