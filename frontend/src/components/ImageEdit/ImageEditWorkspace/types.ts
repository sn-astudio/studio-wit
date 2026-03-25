export type EditTab = "edit" | "filter" | "ai";

export interface ImageSource {
  url: string;
  generationId?: string;
}

export interface ImageEditWorkspaceProps {
  initialImageUrl?: string;
}
