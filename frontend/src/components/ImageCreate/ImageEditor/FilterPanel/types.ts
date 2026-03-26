import type { FilterValues } from "../types";

export interface FilterPanelProps {
  values: FilterValues;
  onChange: (values: FilterValues) => void;
  onApply: () => void;
  onReset: () => void;
}
