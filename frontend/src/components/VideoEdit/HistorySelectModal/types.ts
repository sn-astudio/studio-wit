export interface HistorySelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect?: (source: {
    url: string;
    duration: number;
    width: number;
    height: number;
    name: string;
    aspectRatio?: string;
  }) => void;
  onMultiSelect?: (items: { url: string; name: string }[]) => void;
  multiSelect?: boolean;
}
