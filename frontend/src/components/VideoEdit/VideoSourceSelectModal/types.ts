export interface VideoSourceSelectModalProps {
  isOpen: boolean;
  videoUrl: string | null;
  videoName?: string;
  onSave: () => Promise<void>;
  onDownload: () => void;
  onCancel: () => void;
  isSaving?: boolean;
  isDownloading?: boolean;
}
