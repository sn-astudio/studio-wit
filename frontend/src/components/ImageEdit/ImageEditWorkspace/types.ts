export type EditTab = "edit" | "filter" | "ai" | "compose";

export interface ImageSource {
  url: string;
  generationId?: string;
}

export interface ImageEditWorkspaceProps {
  initialImageUrl?: string;
}
