"use client";

import { ImageIcon, Loader2, AlertCircle } from "lucide-react";

import type { HistoryCardProps } from "./types";
import { getGridSpan, getAspectStyle, formatTimeAgo } from "./utils";

export function HistoryCard({ gen, onSelect }: HistoryCardProps) {
  const isProcessing =
    gen.status === "pending" || gen.status === "processing";
  const isFailed = gen.status === "failed";
  const isCompleted = gen.status === "completed" && !!gen.result_url;

  const timeAgo = formatTimeAgo(gen.created_at);
  const gridSpan = getGridSpan(gen.aspect_ratio);
  const aspectStyle = getAspectStyle(gen.aspect_ratio);

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

      {/* Bottom gradient overlay with info */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2.5 pt-8 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
        <p className="truncate text-left text-xs leading-snug text-white">
          {gen.prompt}
        </p>
        <div className="mt-1 flex items-center gap-1.5">
          <span className="text-[11px] text-white/60">{gen.model_id}</span>
          <span className="text-[11px] text-white/40">&middot;</span>
          <span className="text-[11px] text-white/60">{timeAgo}</span>
        </div>
      </div>
    </button>
  );
}
