"use client";

import NextImage from "next/image";
import { Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useDeleteComment } from "@/hooks/queries/useGallery";
import { formatTimeAgo } from "@/components/Gallery/GalleryCard/utils";
import type { CommentItemProps } from "./types";

export function CommentItem({ comment, generationId, isOwner }: CommentItemProps) {
  const t = useTranslations("GalleryDetail");
  const deleteComment = useDeleteComment();

  const handleDelete = () => {
    if (!confirm(t("deleteCommentConfirm"))) return;
    deleteComment.mutate({ commentId: comment.id, generationId });
  };

  return (
    <div className="flex gap-3 py-3">
      {comment.user.profile_image ? (
        <NextImage
          src={comment.user.profile_image}
          alt={comment.user.name}
          width={32}
          height={32}
          className="size-8 shrink-0 rounded-full"
        />
      ) : (
        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
          {comment.user.name.charAt(0)}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{comment.user.name}</span>
          <span className="text-xs text-muted-foreground">
            {formatTimeAgo(comment.created_at)}
          </span>
        </div>
        <p className="mt-0.5 whitespace-pre-wrap text-sm text-foreground/90">
          {comment.content}
        </p>
      </div>
      {isOwner && (
        <button
          onClick={handleDelete}
          disabled={deleteComment.isPending}
          className="shrink-0 self-start rounded-md p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
          title={t("deleteComment")}
        >
          <Trash2 className="size-3.5" />
        </button>
      )}
    </div>
  );
}
