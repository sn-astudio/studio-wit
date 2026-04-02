export interface ResizePanelProps {
  currentWidth: number;
  currentHeight: number;
  onApply: (width: number, height: number) => void;
  onCancel: () => void;
  onChange?: (width: number, height: number) => void;
}
