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
            ? "pointer-events-none border border-red-900/40 bg-red-950/20 opacity-60"
            : "cursor-pointer border border-zinc-800/60 bg-zinc-900/60 transition-colors hover:border-zinc-700"
      }`}
    >
      {/* Thumbnail */}
      {isCompleted && gen.result_url && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={gen.result_url}
          alt={gen.prompt}
          className="absolute inset-0 size-full object-cover"
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
          <AlertCircle className="size-5 text-red-500" />
        </div>
      )}
      {isCompleted && !gen.result_url && (
        <div className="absolute inset-0 flex items-center justify-center">
          <ImageIcon className="size-6 text-zinc-600 transition-colors group-hover:text-zinc-400" />
        </div>
      )}

      {/* Bottom gradient overlay with info */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2 pt-6 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
        <p className="truncate text-left text-[11px] leading-tight text-zinc-200">
          {gen.prompt}
        </p>
        <div className="mt-0.5 flex items-center gap-1.5">
          <span className="text-[10px] text-zinc-400">{gen.model_id}</span>
          <span className="text-[10px] text-zinc-500">&middot;</span>
          <span className="text-[10px] text-zinc-400">{timeAgo}</span>
        </div>
      </div>
    </button>
  );
}
