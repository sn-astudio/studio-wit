import type { TextSettings } from "../types";

export interface TextPanelProps {
  settings: TextSettings;
  onChange: (settings: TextSettings) => void;
  onApply: () => void;
  onClear: () => void;
}
