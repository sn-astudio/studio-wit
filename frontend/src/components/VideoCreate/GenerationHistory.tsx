"use client";

import { useCallback, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Clock, Play, Film, Loader2, AlertCircle } from "lucide-react";

import { useAuthStore } from "@/stores/auth";
import { useGenerationHistory } from "@/hooks/queries/useGeneration";
import type { Generation } from "@/types/api";

interface GenerationHistoryProps {
  onSelect?: (url: string) => void;
  expanded?: boolean;
  onToggleExpand?: () => void;
}

/** aspect_ratio 문자열 → grid span 클래스 */
function getGridSpan(aspectRatio: string | null): string {
  switch (aspectRatio) {
    case "9:16":
      return "row-span-2"; // 세로 영상 → 2행 차지
    case "16:9":
      return "col-span-1"; // 가로 영상 → 기본
    case "1:1":
      return "col-span-1"; // 정사각형 → 기본
    default:
      return "col-span-1";
  }
}

/** aspect_ratio → CSS aspect-ratio 값 */
function getAspectStyle(aspectRatio: string | null): string {
  switch (aspectRatio) {
    case "9:16":
      return "9/16";
    case "1:1":
      return "1/1";
    case "16:9":
    default:
      return "16/9";
  }
}

export function GenerationHistory({
  onSelect,
  expanded = false,
  onToggleExpand,
}: GenerationHistoryProps) {
  const t = useTranslations("VideoCreate");
  const token = useAuthStore((s) => s.token);

  const { data } = useGenerationHistory(
    token ? { type: "video", limit: 12 } : undefined,
  );

  const generations =
    data?.pages.flatMap((page) => page.generations) ?? [];

  const hasItems = token && generations.length > 0;

  return (
    <div className={`border-t border-zinc-800/80 ${expanded ? "flex flex-1 flex-col overflow-hidden" : ""}`}>
      <div className="flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-1.5">
          <Clock className="size-3 text-zinc-600" />
          <span className="text-[11px] font-medium text-zinc-500">
            {t("recentGenerations")}
          </span>
        </div>
        {hasItems && onToggleExpand && (
          <button
            onClick={onToggleExpand}
            className="cursor-pointer text-[11px] text-zinc-600 transition-colors hover:text-zinc-400"
          >
            {expanded ? t("showLess") : t("viewAll")}
          </button>
        )}
      </div>

      {!hasItems ? (
        <div className="flex w-full items-center justify-center py-6">
          <div className="text-center">
            <Film className="mx-auto size-6 text-zinc-800" />
            <p className="mt-1.5 text-xs text-zinc-600">{t("noHistory")}</p>
          </div>
        </div>
      ) : (
        <div className={expanded ? "min-h-0 flex-1 overflow-y-auto" : ""}>
          <div
            className={`grid gap-2.5 px-4 pb-3 [grid-auto-flow:dense] ${
              expanded
                ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4"
                : "grid-cols-2 sm:grid-cols-3"
            }`}
          >
            {generations.map((gen) => (
              <HistoryCard key={gen.id} gen={gen} onSelect={onSelect} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function HistoryCard({
  gen,
  onSelect,
}: {
  gen: Generation;
  onSelect?: (url: string) => void;
}) {
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
  const gridSpan = getGridSpan(gen.aspect_ratio);
  const aspectStyle = getAspectStyle(gen.aspect_ratio);

  return (
    <button
      onClick={() => {
        if (!isCompleted) return;
        onSelect?.(gen.result_url!);
      }}
      disabled={!isCompleted}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{ aspectRatio: aspectStyle }}
      className={`group relative w-full overflow-hidden rounded-xl ${gridSpan} ${
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
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      )}
      {isFailed && (
        <div className="absolute inset-0 flex items-center justify-center">
          <AlertCircle className="size-5 text-red-500" />
        </div>
      )}
      {isCompleted && !hovering && !gen.thumbnail_url && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Play className="size-6 text-zinc-600 transition-colors group-hover:text-zinc-400" />
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

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}
