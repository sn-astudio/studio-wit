"use client";

import NextImage from "next/image";
import { ArrowLeft, Clock, Heart, Loader2, Sparkles } from "lucide-react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useGalleryDetail, useToggleLike } from "@/hooks/queries/useGallery";
import { Link, useRouter } from "@/i18n/routing";
import { formatTimeAgo } from "@/components/Gallery/GalleryCard/utils";
import { CommentSection } from "./CommentSection";
import type { GalleryDetailProps } from "./types";

export function GalleryDetail({ id }: GalleryDetailProps) {
  const t = useTranslations("GalleryDetail");
  const router = useRouter();
  const { data: session } = useSession();
  const { data: item, isLoading, isError } = useGalleryDetail(id);
  const toggleLike = useToggleLike();

  const handleLike = () => {
    if (!session) return;
    toggleLike.mutate(id);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError || !item) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">{t("notFound")}</p>
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1 text-sm text-primary hover:underline"
        >
          <ArrowLeft className="size-4" />
          {t("goBack")}
        </button>
      </div>
    );
  }

  const isVideo = item.type === "video";

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Back button */}
      <Link
        href="/gallery"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        {t("backToGallery")}
      </Link>

      <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
        {/* Left: Content */}
        <div className="flex-1">
          <div className="overflow-hidden rounded-xl border border-border bg-muted/30">
            {isVideo ? (
              <video
                src={item.result_url}
                poster={item.thumbnail_url ?? undefined}
                controls
                className="w-full"
                playsInline
              />
            ) : (
              <div className="relative">
                <NextImage
                  src={item.result_url}
                  alt={item.prompt}
                  width={1024}
                  height={768}
                  className="h-auto w-full"
                  sizes="(max-width: 1024px) 100vw, 60vw"
                  priority
                />
              </div>
            )}
          </div>
        </div>

        {/* Right: Meta info */}
        <div className="w-full shrink-0 lg:w-80 xl:w-96">
          {/* Author */}
          <div className="mb-4 flex items-center gap-3">
            {item.user.profile_image ? (
              <NextImage
                src={item.user.profile_image}
                alt={item.user.name}
                width={40}
                height={40}
                className="size-10 rounded-full"
              />
            ) : (
              <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                {item.user.name.charAt(0)}
              </div>
            )}
            <div>
              <p className="text-sm font-semibold">{item.user.name}</p>
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="size-3" />
                {formatTimeAgo(item.created_at)}
              </p>
            </div>
          </div>

          {/* Prompt */}
          <div className="mb-4 rounded-lg border border-border/60 bg-muted/30 p-3">
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
              {item.prompt}
            </p>
          </div>

          {/* Model info */}
          <div className="mb-4 flex items-center gap-2">
            <Sparkles className="size-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              {item.model_name}
            </span>
          </div>

          {/* Like button */}
          <button
            onClick={handleLike}
            disabled={!session || toggleLike.isPending}
            className={`mb-2 flex w-full items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-all ${
              item.is_liked
                ? "border-red-200 bg-red-50 text-red-600 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400"
                : "border-border bg-background text-foreground hover:bg-muted"
            } disabled:cursor-not-allowed disabled:opacity-50`}
          >
            <Heart
              className={`size-4 ${item.is_liked ? "fill-current" : ""}`}
            />
            {t("like")} {item.like_count > 0 && `(${item.like_count})`}
          </button>
          {!session && (
            <p className="mb-4 text-center text-xs text-muted-foreground">
              {t("loginToLike")}
            </p>
          )}

          {/* Comments */}
          <CommentSection generationId={id} />
        </div>
      </div>
    </div>
  );
}
