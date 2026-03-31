import type { ShapeSettings } from "../types";

export interface ShapePanelProps {
  settings: ShapeSettings;
  onChange: (settings: ShapeSettings) => void;
  onApply: () => void;
  onClear: () => void;
}
