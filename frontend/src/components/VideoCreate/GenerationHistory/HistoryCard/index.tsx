"use client";

import { useCallback, useRef, useState } from "react";
import { Download, Film, Play, Loader2, AlertCircle } from "lucide-react";
import { useRouter } from "@/i18n/routing";

import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/Tooltip";

import type { HistoryCardProps } from "./types";
import { getAspectStyle, formatTimeAgo, downloadVideo } from "./utils";

export function HistoryCard({ gen, onSelect }: HistoryCardProps) {
  const router = useRouter();
  const isProcessing =
    gen.status === "pending" || gen.status === "processing";
  const isFailed = gen.status === "failed";
  const isCompleted = gen.status === "completed" && !!gen.result_url;

  const [hovering, setHovering] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleMouseEnter = useCallback(() => {
    if (!isCompleted) return;
    setHovering(true);
    videoRef.current?.play().catch(() => {});
  }, [isCompleted]);

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

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => {
        if (!isCompleted) return;
        onSelect?.(gen);
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{ aspectRatio: aspectStyle }}
      className={`group relative w-full overflow-hidden rounded-lg ${
        isProcessing
          ? "pointer-events-none border border-primary/20 bg-primary/5"
          : isFailed
            ? "pointer-events-none border border-red-300/40 bg-red-50/20 opacity-60 dark:border-red-900/40 dark:bg-red-950/20"
            : "cursor-pointer border border-zinc-200/60 bg-zinc-100/60 transition-colors hover:border-zinc-300 dark:border-zinc-800/60 dark:bg-zinc-900/60 dark:hover:border-zinc-700"
      }`}
    >
      {/* Thumbnail / Video */}
      {isCompleted && gen.result_url && (
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

      {/* Center status icon */}
      {isProcessing && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="size-4 animate-spin text-primary" />
        </div>
      )}
      {isFailed && (
        <div className="absolute inset-0 flex items-center justify-center">
          <AlertCircle className="size-3.5 text-red-500" />
        </div>
      )}
      {isCompleted && !hovering && !gen.thumbnail_url && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Play className="size-4 text-zinc-400 transition-colors group-hover:text-zinc-500 dark:text-zinc-600 dark:group-hover:text-zinc-400" />
        </div>
      )}

      {/* 호버 액션 버튼 — 모바일에서 항상 보이도록 */}
      {isCompleted && gen.result_url && (
        <div className="absolute top-1 right-1 flex gap-0.5 opacity-100 sm:top-1.5 sm:right-1.5 sm:gap-1 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100">
          <TooltipProvider delay={200}>
            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/video-edit?url=${encodeURIComponent(gen.result_url!)}`);
                    }}
                    className="flex size-6 cursor-pointer items-center justify-center rounded-full bg-black/60 text-zinc-200 transition-colors hover:bg-primary/80 hover:text-white sm:size-7"
                  />
                }
              >
                <Film className="size-3 sm:size-3.5" />
              </TooltipTrigger>
              <TooltipContent>편집</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider delay={200}>
            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      downloadVideo(gen.result_url!, `${gen.model_id}_${gen.id.slice(0, 8)}.mp4`);
                    }}
                    className="flex size-6 cursor-pointer items-center justify-center rounded-full bg-black/60 text-zinc-200 transition-colors hover:bg-black/80 hover:text-white sm:size-7"
                  />
                }
              >
                <Download className="size-3 sm:size-4" />
              </TooltipTrigger>
              <TooltipContent>다운로드</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}

      {/* Bottom gradient overlay with info — 모바일에서 항상 시간 표시 */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-1 pt-3 sm:p-1.5 sm:pt-4 sm:opacity-0 sm:transition-opacity sm:duration-200 sm:group-hover:opacity-100">
        <p className="hidden truncate text-left text-[9px] leading-tight text-zinc-200 sm:block">
          {gen.prompt}
        </p>
        <span className="text-[8px] text-zinc-400">{timeAgo}</span>
      </div>
    </div>
  );
}
