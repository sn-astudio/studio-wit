import type { VideoSource } from "../VideoEditWorkspace/types";

export interface VideoSourceSelectorProps {
  onSourceSelected: (source: VideoSource) => void;
  isLoading?: boolean;
  mergeMode?: boolean;
  onAddToMerge?: (url: string, name?: string) => void;
  onSelectVideo?: (url: string, name?: string) => void;
}
