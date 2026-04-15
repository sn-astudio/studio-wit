"use client";

import { useState } from "react";
import { ImageIcon, Loader2, AlertCircle } from "lucide-react";

import type { HistoryCardProps } from "./types";
import { getGridSpan, getAspectStyle, formatTimeAgo } from "./utils";

export function HistoryCard({ gen, onSelect }: HistoryCardProps) {
  const isProcessing =
    gen.status === "pending" || gen.status === "processing";
  const isFailed = gen.status === "failed";
  const isCompleted = gen.status === "completed" && !!gen.result_url;

  const [detectedAspect, setDetectedAspect] = useState<string | null>(null);
  const timeAgo = formatTimeAgo(gen.created_at);
  const gridSpan = getGridSpan(gen.aspect_ratio);
  const aspectStyle = detectedAspect ?? getAspectStyle(gen.aspect_ratio);

  return (
    <button
      onClick={() => {
        if (!isCompleted) return;
        onSelect?.(gen);
      }}
      disabled={!isCompleted}
      style={{ aspectRatio: aspectStyle }}
      className={`group relative w-full overflow-hidden rounded-xl ${gridSpan} ${
        isProcessing
          ? "pointer-events-none border border-primary/20 bg-primary/5"
          : isFailed
            ? "pointer-events-none border border-destructive/20 bg-destructive/5 opacity-60"
            : "cursor-pointer border border-border/60 bg-card transition-all hover:border-border hover:shadow-sm"
      }`}
    >
      {/* Thumbnail */}
      {isCompleted && gen.result_url && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={gen.result_url}
          alt={gen.prompt}
          className="absolute inset-0 size-full object-cover transition-transform duration-300 ease-out group-hover:scale-105"
          onLoad={(e) => {
            const img = e.currentTarget;
            if (img.naturalWidth && img.naturalHeight) {
              setDetectedAspect(`${img.naturalWidth}/${img.naturalHeight}`);
            }
          }}
        />
      )}

      {/* Center status icon */}
      {isProcessing && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      )}
      {isFailed && (
        <div className="absolute inset-0 flex items-center justify-center">
          <AlertCircle className="size-5 text-destructive" />
        </div>
      )}
      {isCompleted && !gen.result_url && (
        <div className="absolute inset-0 flex items-center justify-center">
          <ImageIcon className="size-6 text-muted-foreground/40 transition-colors group-hover:text-muted-foreground" />
        </div>
      )}

      {/* 호버 오버레이 */}
      {isCompleted && (
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/50 opacity-100 sm:opacity-0 sm:transition-opacity sm:duration-200 sm:group-hover:opacity-100" />
      )}

      {/* Bottom: meta */}
      {isCompleted && (
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between px-3 pb-2.5 opacity-100 sm:opacity-0 sm:transition-opacity sm:duration-200 sm:group-hover:opacity-100">
        <div className="flex flex-col gap-0.5">
          <span className="text-[12px] font-[500] text-white/80">{gen.model_id}</span>
          <span className="text-[11px] text-white/60">{timeAgo}</span>
        </div>
      </div>
      )}
    </button>
  );
}
