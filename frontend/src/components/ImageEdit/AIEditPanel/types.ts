export type AIMode = "edit" | "compose";

export interface AIEditPanelProps {
  sourceUrl: string | null;
  onUseAsSource: (url: string) => void;
  onStateChange?: (state: { canApply: boolean; isPending: boolean }) => void;
}

export interface AIEditPanelRef {
  reset: () => void;
  apply: () => void;
}
