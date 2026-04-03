import type { CommentItem as CommentItemType } from "@/types/api";

export interface CommentItemProps {
  comment: CommentItemType;
  generationId: string;
  isOwner: boolean;
}
