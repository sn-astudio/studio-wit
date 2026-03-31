"use client";

import { useCallback, useEffect } from "react";
import { Film } from "lucide-react";
import { useTranslations } from "next-intl";

import type { VideoEditPreviewProps, TextOverlayPreview, WatermarkPreview, SubtitlePreviewItem } from "./types";

export function VideoEditPreview({
  videoUrl,
  currentTime,
  onTimeUpdate,
  onDurationLoaded,
  videoRef,
  cssFilter,
  textOverlay,
  watermark,
  subtitles,
  playbackRate,
  creativeOverlay,
  onClickEmpty,
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

  // playbackRate 변경
  useEffect(() => {
    if (videoRef.current && playbackRate && playbackRate > 0) {
      videoRef.current.playbackRate = playbackRate;
    }
  }, [videoRef, playbackRate]);

  if (!videoUrl) {
    return (
      <div
        onClick={onClickEmpty}
        className={`flex aspect-video min-h-[200px] w-full flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-400 bg-zinc-100/40 sm:min-h-[280px] dark:border-zinc-700 dark:bg-zinc-900/40 ${onClickEmpty ? "cursor-pointer transition-colors hover:border-primary/50 hover:bg-zinc-200/60 dark:hover:bg-zinc-800/60" : ""}`}
      >
        <Film className="mb-3 size-12 text-zinc-600 dark:text-zinc-600" />
        <p className="text-sm text-zinc-600 dark:text-zinc-500">{t("selectVideo")}</p>
      </div>
    );
  }

  return (
    <div className="flex aspect-video max-h-[280px] w-full items-center justify-center overflow-hidden rounded-2xl border border-zinc-300 bg-zinc-50 dark:border-zinc-800 dark:bg-black">
      <div className="relative max-h-full max-w-full">
        <video
          ref={videoRef}
          src={videoUrl}
          className="max-h-[280px] max-w-full object-contain transition-[filter] duration-200"
          style={cssFilter ? { filter: cssFilter } : undefined}
          controls
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
        />
        {/* 텍스트 오버레이 프리뷰 */}
        {textOverlay?.text && (
          <TextOverlayLayer overlay={textOverlay} />
        )}
        {/* 워터마크 프리뷰 */}
        {watermark && (
          <WatermarkLayer watermark={watermark} />
        )}
        {/* 자막 프리뷰 */}
        {subtitles?.map((sub, i) => {
          if (currentTime < sub.startTime || currentTime > sub.endTime) return null;
          return <SubtitleLayer key={i} subtitle={sub} />;
        })}
        {/* 크리에이티브 프리셋 오버레이 */}
        {creativeOverlay}
      </div>
    </div>
  );
}

function TextOverlayLayer({ overlay }: { overlay: TextOverlayPreview }) {
  const positionClass: Record<string, string> = {
    "top-left": "top-4 left-2",
    top: "top-4 left-0 right-0 justify-center",
    "top-right": "top-4 right-2 justify-end",
    "center-left": "inset-y-0 left-2 items-center",
    center: "inset-0 justify-center items-center",
    "center-right": "inset-y-0 right-2 items-center justify-end",
    "bottom-left": "bottom-4 left-2",
    bottom: "bottom-4 left-0 right-0 justify-center",
    "bottom-right": "bottom-4 right-2 justify-end",
  };

  return (
    <div
      className={`pointer-events-none absolute flex ${positionClass[overlay.position] ?? positionClass.bottom}`}
    >
      <span
        className="whitespace-pre-wrap px-2 text-center font-bold leading-tight"
        style={{
          fontSize: `${overlay.fontSize}px`,
          color: overlay.color,
          textShadow: "1px 1px 3px rgba(0,0,0,0.8), -1px -1px 3px rgba(0,0,0,0.8)",
        }}
      >
        {overlay.text}
      </span>
    </div>
  );
}

function WatermarkLayer({ watermark }: { watermark: WatermarkPreview }) {
  const positionClass: Record<string, string> = {
    "top-left": "top-2 left-2",
    "top-right": "top-2 right-2",
    "bottom-left": "bottom-2 left-2",
    "bottom-right": "bottom-2 right-2",
    center: "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
  };

  const cls = positionClass[watermark.position] ?? positionClass["bottom-right"];

  if (watermark.mode === "image" && watermark.imageUrl) {
    const scale = watermark.imageScale ?? 25;
    return (
      <img
        src={watermark.imageUrl}
        alt="watermark"
        className={`pointer-events-none absolute object-contain ${cls}`}
        style={{ opacity: watermark.opacity, maxWidth: `${scale}%`, maxHeight: `${scale}%` }}
      />
    );
  }

  if (watermark.mode === "text" && watermark.text) {
    return (
      <div
        className={`pointer-events-none absolute ${cls}`}
        style={{ opacity: watermark.opacity }}
      >
        <span
          className="font-bold"
          style={{
            fontSize: `${watermark.fontSize ?? 24}px`,
            color: watermark.color ?? "white",
            textShadow: "1px 1px 2px rgba(0,0,0,0.5)",
          }}
        >
          {watermark.text}
        </span>
      </div>
    );
  }

  return null;
}

function SubtitleLayer({ subtitle }: { subtitle: SubtitlePreviewItem }) {
  const yPos: Record<string, string> = {
    top: "top-4",
    center: "top-1/2 -translate-y-1/2",
    bottom: "bottom-4",
  };

  return (
    <div
      className={`pointer-events-none absolute left-0 right-0 flex justify-center ${yPos[subtitle.position] ?? yPos.bottom}`}
    >
      <span
        className="whitespace-pre-wrap px-2 text-center font-bold leading-tight"
        style={{
          fontSize: `${Math.max(subtitle.fontSize * 0.5, 10)}px`,
          color: subtitle.color,
          textShadow: "1px 1px 3px rgba(0,0,0,0.8), -1px -1px 3px rgba(0,0,0,0.8)",
        }}
      >
        {subtitle.text}
      </span>
    </div>
  );
}
