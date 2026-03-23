"use client";

import { useCallback, useRef, useState } from "react";
import { Play, Loader2, AlertCircle } from "lucide-react";

import type { HistoryCardProps } from "./types";
import { getAspectStyle, formatTimeAgo } from "./utils";

export function HistoryCard({ gen, onSelect }: HistoryCardProps) {
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
    <button
      onClick={() => {
        if (!isCompleted) return;
        onSelect?.(gen);
      }}
      disabled={!isCompleted}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{ aspectRatio: aspectStyle }}
      className={`group relative w-full overflow-hidden rounded-lg ${
        isProcessing
          ? "pointer-events-none border border-primary/20 bg-primary/5"
          : isFailed
            ? "pointer-events-none border border-red-900/40 bg-red-950/20 opacity-60"
            : "border border-zinc-800/60 bg-zinc-900/60 transition-colors hover:border-zinc-700 cursor-pointer"
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
          <Play className="size-4 text-zinc-600 transition-colors group-hover:text-zinc-400" />
        </div>
      )}

      {/* Bottom gradient overlay with info */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-1.5 pt-4 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
        <p className="truncate text-left text-[9px] leading-tight text-zinc-200">
          {gen.prompt}
        </p>
        <span className="text-[8px] text-zinc-400">{timeAgo}</span>
      </div>
    </button>
  );
}
