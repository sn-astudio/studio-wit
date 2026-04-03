export interface ImageSlotProps {
  label: string;
  imageUrl: string | null;
  onSelect: (url: string) => void;
  onRemove?: () => void;
  readOnly?: boolean;
}
