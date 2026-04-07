export type AIMode = "edit" | "compose";

export interface AIEditPanelProps {
  sourceUrl: string | null;
  onUseAsSource: (url: string) => void;
}
