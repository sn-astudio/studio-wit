import type { FilterValues } from "../types";

export interface FilterPanelProps {
  values: FilterValues;
  onChange: (values: FilterValues) => void;
  onApply: () => void;
  onReset: () => void;
  onApplySharpen?: (amount: number) => void;
  onApplyVignette?: (intensity: number) => void;
  onApplyNoise?: (amount: number) => void;
}
