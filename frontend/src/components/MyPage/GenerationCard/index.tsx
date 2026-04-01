"use client";

import { useCallback, useRef, useState } from "react";
import NextImage from "next/image";
import {
  AlertCircle,
  Download,
  Film,
  ImageIcon,
  Loader2,
  Pencil,
  Play,
} from "lucide-react";
import { useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/Tooltip";

import type { GenerationCardProps } from "./types";
import { getAspectStyle, formatTimeAgo, downloadFile } from "./utils";

export function GenerationCard({ gen }: GenerationCardProps) {
  const router = useRouter();
  const t = useTranslations("MyPage");
  const isProcessing =
    gen.status === "pending" || gen.status === "processing";
  const isFailed = gen.status === "failed";
  const isCompleted = gen.status === "completed" && !!gen.result_url;
  const isVideo = gen.type === "video";
  const isImage = gen.type === "image";

  const [hovering, setHovering] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleMouseEnter = useCallback(() => {
    if (!isCompleted || !isVideo) return;
    setHovering(true);
    videoRef.current?.play().catch(() => {});
  }, [isCompleted, isVideo]);

  const handleMouseLeave = useCallback(() => {
    setHovering(false);
    const v = videoRef.current;
    if (v) {
      v.pause();
      v.currentTime = 0;
    }
  }, []);

  const timeAgo = formatTimeAgo(gen.created_at);
  const aspectStyle = getAspectStyle(gen.aspect_ratio);

  const handleEdit = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (isVideo) {
        router.push(
          `/video-edit?url=${encodeURIComponent(gen.result_url!)}`,
        );
      } else {
        router.push(
          `/image-edit?url=${encodeURIComponent(gen.result_url!)}`,
        );
      }
    },
    [isVideo, gen.result_url, router],
  );

  const handleDownload = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      const ext = isVideo ? "mp4" : "png";
      downloadFile(
        gen.result_url!,
        `${gen.model_id}_${gen.id.slice(0, 8)}.${ext}`,
      );
    },
    [gen, isVideo],
  );

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{ aspectRatio: aspectStyle }}
      className={`group relative w-full overflow-hidden rounded-xl ${
        isProcessing
          ? "border border-primary/20 bg-primary/5"
          : isFailed
            ? "border border-red-300/40 bg-red-50/20 opacity-60 dark:border-red-900/40 dark:bg-red-950/20"
            : "border border-zinc-200/60 bg-zinc-100/60 transition-all hover:border-zinc-300 hover:shadow-lg dark:border-zinc-800/60 dark:bg-zinc-900/60 dark:hover:border-zinc-700"
      }`}
    >
      {/* Media */}
      {isCompleted && isVideo && gen.result_url && (
        <video
          ref={videoRef}
          src={gen.result_url}
          poster={gen.thumbnail_url ?? undefined}
          preload="metadata"
          className="absolute inset-0 size-full object-cover"
          muted
          loop
          playsInline
        />
      )}
      {isCompleted && isImage && gen.result_url && (
        <NextImage
          src={gen.result_url}
          alt={gen.prompt}
          fill
          className="object-cover"
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
        />
      )}

      {/* Status icons */}
      {isProcessing && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="size-5 animate-spin text-primary" />
        </div>
      )}
      {isFailed && (
        <div className="absolute inset-0 flex items-center justify-center">
          <AlertCircle className="size-4 text-red-500" />
        </div>
      )}
      {isCompleted && isVideo && !hovering && !gen.thumbnail_url && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Play className="size-5 text-zinc-400 dark:text-zinc-600" />
        </div>
      )}

      {/* Type badge */}
      {isCompleted && (
        <div className="absolute top-2 left-2 z-10 flex items-center gap-1 rounded-full bg-black/50 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
          {isVideo ? (
            <Film className="size-3" />
          ) : (
            <ImageIcon className="size-3" />
          )}
          {gen.type}
        </div>
      )}

      {/* Hover action buttons */}
      {isCompleted && gen.result_url && (
        <div className="absolute top-2 right-2 flex gap-1 opacity-100 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100">
          <TooltipProvider delay={200}>
            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    onClick={handleEdit}
                    className="flex size-7 cursor-pointer items-center justify-center rounded-full bg-black/60 text-zinc-200 transition-colors hover:bg-primary/80 hover:text-white"
                  />
                }
              >
                <Pencil className="size-3.5" />
              </TooltipTrigger>
              <TooltipContent>{t("edit")}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider delay={200}>
            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    onClick={handleDownload}
                    className="flex size-7 cursor-pointer items-center justify-center rounded-full bg-black/60 text-zinc-200 transition-colors hover:bg-black/80 hover:text-white"
                  />
                }
              >
                <Download className="size-3.5" />
              </TooltipTrigger>
              <TooltipContent>{t("download")}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}

      {/* Bottom gradient info */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2.5 pt-6 sm:opacity-0 sm:transition-opacity sm:duration-200 sm:group-hover:opacity-100">
        <p className="line-clamp-2 text-xs leading-snug text-zinc-200">
          {gen.prompt}
        </p>
        <div className="mt-1 flex items-center justify-between">
          <span className="text-[10px] text-zinc-400">{gen.model_id}</span>
          <span className="text-[10px] text-zinc-400">{timeAgo}</span>
        </div>
      </div>
    </div>
  );
}
