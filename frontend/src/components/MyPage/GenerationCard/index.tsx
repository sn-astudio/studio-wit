"use client";

import { useCallback, useRef, useState } from "react";
import {
  AlertCircle,
  Download,
  Film,
  ImageIcon,
  Loader2,
  Wand2,
  Scissors,
  Trash2,
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
import { formatTimeAgo, downloadFile } from "./utils";

function getRowSpan(ratio: string | null): number {
  if (!ratio) return 7;
  const [w, h] = ratio.split(":").map(Number);
  if (!w || !h) return 7;
  return Math.max(3, Math.round(7 * (h / w)));
}

export function GenerationCard({ gen, onClick, onDelete }: GenerationCardProps) {
  const router = useRouter();
  const t = useTranslations("MyPage");
  const isProcessing =
    gen.status === "pending" || gen.status === "processing";
  const isFailed = gen.status === "failed";
  const isCompleted = gen.status === "completed" && !!gen.result_url;
  const isVideo = gen.type === "video";
  const isImage = gen.type === "image";

  const videoRef = useRef<HTMLVideoElement>(null);

  const handleMouseEnter = useCallback(() => {
    if (!isCompleted || !isVideo) return;
    videoRef.current?.play().catch(() => {});
  }, [isCompleted, isVideo]);

  const handleMouseLeave = useCallback(() => {
    const v = videoRef.current;
    if (v) {
      v.pause();
      v.currentTime = 0;
    }
  }, []);

  const timeAgo = formatTimeAgo(gen.created_at);
  const rowSpan = getRowSpan(gen.aspect_ratio);

  const handleEdit = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (isVideo) {
        router.push(
          `/video-edit?url=${encodeURIComponent(gen.result_url!)}`,
        );
      } else {
        router.push(
          `/image-edit?img=${encodeURIComponent(gen.result_url!)}`,
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
      onClick={isCompleted ? onClick : undefined}
      style={{ gridRow: `span ${rowSpan}` }}
      className={`group relative w-full overflow-hidden rounded-xl ${
        isProcessing
          ? "bg-neutral-100 dark:bg-neutral-800/60"
          : isFailed
            ? "bg-neutral-100 opacity-60 dark:bg-neutral-800/60"
            : "cursor-pointer bg-neutral-100 dark:bg-neutral-800/60"
      }`}
    >
      {/* Media */}
      {isCompleted && isVideo && gen.result_url && (
        <video
          ref={videoRef}
          src={gen.result_url}
          poster={gen.thumbnail_url ?? undefined}
          preload="metadata"
          className="size-full object-cover"
          muted
          loop
          playsInline
        />
      )}
      {isCompleted && isImage && gen.result_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={gen.result_url}
          alt={gen.prompt}
          className="size-full object-cover sm:transition-transform sm:duration-300 sm:group-hover:scale-105"
        />
      )}

      {/* Status icons */}
      {isProcessing && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative flex items-center justify-center">
            <span
              className="absolute size-14 animate-ping rounded-full bg-neutral-300/30 dark:bg-neutral-600/20"
              style={{ animationDuration: "2s" }}
            />
            <div className="relative flex size-12 items-center justify-center rounded-full bg-neutral-200 dark:bg-neutral-700">
              <Loader2
                className="size-5 animate-spin text-neutral-500 dark:text-neutral-400"
                style={{ animationDuration: "1.5s" }}
              />
            </div>
          </div>
        </div>
      )}
      {isFailed && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
          <AlertCircle className="size-5 text-red-400 dark:text-red-500" />
          <p className="text-[11px] text-muted-foreground/60">{t("failed")}</p>
        </div>
      )}

      {/* Completed overlay */}
      {isCompleted && (
        <>
          {/* Overlay — mobile always, PC on hover */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/50 opacity-100 sm:opacity-0 sm:transition-opacity sm:duration-200 sm:group-hover:opacity-100" />

          {/* Top: prompt */}
          <div className="pointer-events-none absolute inset-x-0 top-0 px-3 pt-3 pb-8 opacity-100 sm:px-4 sm:pt-4 sm:pb-10 sm:opacity-0 sm:transition-opacity sm:duration-200 sm:group-hover:opacity-100">
            <p className="line-clamp-1 text-[13px] font-[500] leading-relaxed text-white/90 sm:line-clamp-2 sm:text-[15px]">
              {gen.prompt}
            </p>
          </div>

          {/* Bottom: meta + actions */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between px-3 pb-2.5 opacity-100 sm:px-3 sm:pb-2.5 sm:opacity-0 sm:transition-opacity sm:duration-200 sm:group-hover:opacity-100">
            <div className="flex flex-col gap-0.5">
              <span className="text-[12px] font-[500] text-white/80">{gen.model_id}</span>
              <span className="text-[11px] text-white/60">{timeAgo}</span>
            </div>
            <div className="pointer-events-auto flex items-center gap-1">
              <TooltipProvider delay={0} closeDelay={0}>
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <button
                        onClick={handleEdit}
                        className="flex size-10 cursor-pointer items-center justify-center rounded-lg bg-black/40 text-white backdrop-blur-sm transition-all hover:bg-black/60"
                      >
                        {isVideo ? <Scissors className="size-4" /> : <Wand2 className="size-4" />}
                      </button>
                    }
                  />
                  <TooltipContent>{t("edit")}</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <button
                        onClick={handleDownload}
                        className="flex size-10 cursor-pointer items-center justify-center rounded-lg bg-black/40 text-white backdrop-blur-sm transition-all hover:bg-black/60"
                      >
                        <Download className="size-4" />
                      </button>
                    }
                  />
                  <TooltipContent>{t("download")}</TooltipContent>
                </Tooltip>
                {onDelete && (
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDelete();
                          }}
                          className="flex size-10 cursor-pointer items-center justify-center rounded-lg bg-black/40 text-white backdrop-blur-sm transition-all hover:bg-red-500/80"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      }
                    />
                    <TooltipContent>{t("delete")}</TooltipContent>
                  </Tooltip>
                )}
              </TooltipProvider>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
