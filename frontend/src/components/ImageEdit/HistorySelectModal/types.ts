export interface ImageHistorySelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect?: (source: { url: string }) => void;
}
