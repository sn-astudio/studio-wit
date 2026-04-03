"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, MessageCircle, Send } from "lucide-react";
import { useTranslations } from "next-intl";
import { useComments, useCreateComment } from "@/hooks/queries/useGallery";
import { useAuthStore } from "@/stores/auth";
import { CommentItem } from "../CommentItem";
import type { CommentSectionProps } from "./types";

export function CommentSection({ generationId }: CommentSectionProps) {
  const t = useTranslations("GalleryDetail");
  const token = useAuthStore((s) => s.token);
  const currentUser = useAuthStore((s) => s.user);
  const [content, setContent] = useState("");

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useComments(generationId);

  const createComment = useCreateComment();
  const observerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = observerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed) return;
    createComment.mutate(
      { generationId, content: trimmed },
      { onSuccess: () => setContent("") },
    );
  };

  const allComments = data?.pages.flatMap((p) => p.comments) ?? [];
  const currentUserId = currentUser?.id;

  return (
    <div className="mt-6">
      <div className="mb-3 flex items-center gap-2">
        <MessageCircle className="size-4" />
        <h3 className="text-sm font-semibold">{t("comments")}</h3>
      </div>

      {/* Comment input */}
      {token ? (
        <form onSubmit={handleSubmit} className="mb-4 flex gap-2">
          <input
            type="text"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={t("commentPlaceholder")}
            maxLength={500}
            className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-primary"
          />
          <button
            type="submit"
            disabled={!content.trim() || createComment.isPending}
            className="flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-opacity disabled:opacity-50"
          >
            <Send className="size-3.5" />
          </button>
        </form>
      ) : (
        <p className="mb-4 text-xs text-muted-foreground">
          {t("loginToComment")}
        </p>
      )}

      {/* Comment list */}
      {isLoading && (
        <div className="flex justify-center py-6">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      )}

      {!isLoading && allComments.length === 0 && (
        <p className="py-6 text-center text-sm text-muted-foreground">
          {t("noComments")}
        </p>
      )}

      <div className="divide-y divide-border">
        {allComments.map((comment) => (
          <CommentItem
            key={comment.id}
            comment={comment}
            generationId={generationId}
            isOwner={currentUserId === comment.user.id}
          />
        ))}
      </div>

      <div ref={observerRef} className="h-1" />
      {isFetchingNextPage && (
        <div className="flex justify-center py-4">
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
        </div>
      )}
    </div>
  );
}
