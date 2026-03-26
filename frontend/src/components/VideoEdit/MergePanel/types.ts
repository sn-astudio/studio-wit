import type { Dispatch, SetStateAction } from "react";

export interface MergeClip {
  id: string;
  url: string;
  thumbnail?: string;
  name?: string;
}

export interface MergePanelProps {
  onMergeComplete?: (resultUrl: string) => void;
  onAddClipRef?: (addClip: (url: string, name?: string) => void) => void;
  onRemoveClipRef?: (removeClip: (id: string) => void) => void;
  onMoveClipRef?: (moveClip: (idx: number, direction: -1 | 1) => void) => void;
  onResetClipsRef?: (resetClips: () => void) => void;
  onSetClipsRef?: (setClips: Dispatch<SetStateAction<MergeClip[]>>) => void;
  onClipsChange?: (clips: MergeClip[]) => void;
}
