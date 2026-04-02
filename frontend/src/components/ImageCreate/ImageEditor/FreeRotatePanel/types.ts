export interface FreeRotatePanelProps {
  onApply: (degrees: number) => void;
  onCancel: () => void;
  onChange?: (degrees: number) => void;
}
