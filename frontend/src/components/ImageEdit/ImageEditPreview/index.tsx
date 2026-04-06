"use client";

import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import { Upload, Download, Clapperboard, Minus, Wand2 } from "lucide-react";
import { EditorCanvas } from "@/components/ImageCreate/ImageEditor/EditorCanvas";
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/Tooltip";

import type { ImageEditPreviewProps } from "./types";

export function ImageEditPreview({
  imageUrl,
  canvasRef,
  filterValues,
  activeTool,
  cropRect,
  onCropChange,
  drawingSettings,
  textSettings,
  onTextPlace,
  freeRotateDegrees,
  resizePreviewScale,
  onExport,
  onGenerateVideo,
  onUpload,
  onScrollToHistory,
  onRemoveImage,
  onFileDrop,
}: ImageEditPreviewProps) {
  const t = useTranslations("ImageEdit");
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
      if (file && file.type.startsWith("image/")) {
        onFileDrop?.(file);
      }
    },
    [onFileDrop],
  );

  if (!imageUrl) {
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
          <Wand2 className="size-6 text-neutral-400 dark:text-neutral-500" />
        </div>
        <p className="mt-4 text-[16px] font-[600] text-foreground">
          {isDragging ? t("dropImage") : t("selectImage")}
        </p>
        <p className="mt-2.5 text-[14px] text-muted-foreground/60">
          {t("selectImageDesc")}
        </p>
        {!isDragging && (
          <button
            onClick={onUpload}
            className="mt-6 flex h-10 cursor-pointer items-center gap-2 rounded-lg bg-neutral-100 px-5 text-[14px] font-[500] text-muted-foreground transition-colors hover:bg-neutral-200 dark:bg-neutral-800 dark:text-white dark:hover:bg-neutral-700"
          >
            <Upload className="size-4" />
            {t("uploadImage")}
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      className="relative flex h-[55vh] items-center justify-center overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-50 sm:h-[65vh] dark:border-neutral-800 dark:bg-neutral-900/50"
      style={{
        backgroundImage: "radial-gradient(circle, var(--canvas-checker) 1px, transparent 1px)",
        backgroundSize: "16px 16px",
      }}
    >
      <EditorCanvas
        ref={canvasRef}
        imageUrl={imageUrl}
        filterValues={filterValues}
        activeTool={activeTool}
        cropRect={cropRect}
        onCropChange={onCropChange}
        drawingSettings={drawingSettings}
        textSettings={textSettings}
        onTextPlace={onTextPlace}
        freeRotateDegrees={freeRotateDegrees}
        resizePreviewScale={resizePreviewScale}
      />

      {/* 우하단 액션 버튼 */}
      <div className="pointer-events-none absolute bottom-2.5 right-2.5 flex items-center gap-1.5">
        <TooltipProvider delay={0}>
        <Tooltip>
          <TooltipTrigger
            render={
              <button
                onClick={onGenerateVideo}
                className="pointer-events-auto flex size-10 cursor-pointer items-center justify-center rounded-lg bg-black/40 text-white backdrop-blur-sm transition-all hover:bg-black/60"
              >
                <Clapperboard className="size-4" />
              </button>
            }
          />
          <TooltipContent>{t("generateVideo")}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger
            render={
              <button
                onClick={onExport}
                className="pointer-events-auto flex size-10 cursor-pointer items-center justify-center rounded-lg bg-black/40 text-white backdrop-blur-sm transition-all hover:bg-black/60"
              >
                <Download className="size-4" />
              </button>
            }
          />
          <TooltipContent>{t("download")}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger
            render={
              <button
                onClick={onRemoveImage}
                className="pointer-events-auto flex size-10 cursor-pointer items-center justify-center rounded-lg bg-black/40 text-white backdrop-blur-sm transition-all hover:bg-black/60"
              >
                <Minus className="size-4" />
              </button>
            }
          />
          <TooltipContent>{t("removeImage")}</TooltipContent>
        </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}
