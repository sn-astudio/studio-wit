import type { DrawingSettings } from "../types";

export interface DrawingPanelProps {
  settings: DrawingSettings;
  onChange: (settings: DrawingSettings) => void;
  onApply: () => void;
  onClear: () => void;
  isEraser?: boolean;
  onEraserToggle?: (isEraser: boolean) => void;
  isMosaic?: boolean;
  hasContent?: boolean;
}
