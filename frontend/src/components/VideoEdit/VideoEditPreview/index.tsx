"use client";

import { useCallback, useEffect, useState } from "react";
import { Scissors, Upload } from "lucide-react";
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
  onUpload,
  onFileDrop,
}: VideoEditPreviewProps) {
  const t = useTranslations("VideoEdit");
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file && file.type.startsWith("video/")) {
        onFileDrop?.(file);
      }
    },
    [onFileDrop],
  );

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
        className={`flex size-full min-h-[55vh] flex-col items-center justify-center rounded-2xl border border-dashed sm:min-h-[65vh] transition-colors ${
          isDragging
            ? "border-neutral-400 bg-neutral-100 dark:border-neutral-500 dark:bg-white/5"
            : "border-neutral-300 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900/50"
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="flex size-14 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800">
          <Scissors className="size-6 text-neutral-400 dark:text-neutral-500" />
        </div>
        <p className="mt-4 text-[16px] font-[600] text-foreground">
          {isDragging ? t("dropVideo") : t("selectVideo")}
        </p>
        <p className="mt-2.5 text-[14px] text-muted-foreground/60">{t("selectVideoDesc")}</p>
        {!isDragging && (
        <button
          onClick={onUpload}
          className="mt-6 flex h-10 cursor-pointer items-center gap-2 rounded-lg bg-neutral-100 px-5 text-[14px] font-[500] text-muted-foreground transition-colors hover:bg-neutral-200 dark:bg-neutral-800 dark:text-white dark:hover:bg-neutral-700"
        >
          <Upload className="size-4" />
          {t("uploadVideo")}
        </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex aspect-video max-h-[280px] w-full items-center justify-center overflow-hidden rounded-2xl border-2 border-neutral-200 bg-white dark:border-neutral-800/80 dark:bg-neutral-950/85">
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
