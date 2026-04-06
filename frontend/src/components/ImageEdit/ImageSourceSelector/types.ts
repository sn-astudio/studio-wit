import type { ImageSource } from "../ImageEditWorkspace/types";

export interface ImageSourceSelectorProps {
  onSourceSelected: (source: ImageSource) => void;
  selectedUrl?: string | null;
}
