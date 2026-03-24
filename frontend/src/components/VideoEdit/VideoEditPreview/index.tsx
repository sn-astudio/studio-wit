"use client";

import { useCallback } from "react";
import { Film } from "lucide-react";
import { useTranslations } from "next-intl";

import type { VideoEditPreviewProps } from "./types";

export function VideoEditPreview({
  videoUrl,
  currentTime,
  onTimeUpdate,
  onDurationLoaded,
  videoRef,
  cssFilter,
}: VideoEditPreviewProps) {
  const t = useTranslations("VideoEdit");

  const handleTimeUpdate = useCallback(() => {
    if (videoRef.current) {
      onTimeUpdate(videoRef.current.currentTime);
    }
  }, [videoRef, onTimeUpdate]);

  const handleLoadedMetadata = useCallback(() => {
    if (videoRef.current) {
      onDurationLoaded(videoRef.current.duration);
    }
  }, [videoRef, onDurationLoaded]);

  if (!videoUrl) {
    return (
      <div className="flex aspect-video max-h-[280px] w-full flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-700 bg-zinc-900/40">
        <Film className="mb-3 size-12 text-zinc-600" />
        <p className="text-sm text-zinc-500">{t("selectVideo")}</p>
      </div>
    );
  }

  return (
    <div className="flex aspect-video max-h-[280px] w-full items-center justify-center overflow-hidden rounded-2xl border border-zinc-800 bg-black">
      <video
        ref={videoRef}
        src={videoUrl}
        className="max-h-full max-w-full object-contain transition-[filter] duration-200"
        style={cssFilter ? { filter: cssFilter } : undefined}
        controls
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
      />
    </div>
  );
}
