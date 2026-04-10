"use client";

import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import { Upload, Download, Clapperboard, Minus, Wand2, Plus } from "lucide-react";
import { EditorCanvas } from "@/components/ImageCreate/ImageEditor/EditorCanvas";
import { useImageEditorStore } from "@/stores/imageEditor";
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/Tooltip";

import type { ImageEditPreviewProps } from "./types";

function ZoomControls() {
  const zoomPan = useImageEditorStore((s) => s.zoomPan);
  const setZoomPan = useImageEditorStore((s) => s.setZoomPan);
  const resetZoomPan = useImageEditorStore((s) => s.resetZoomPan);

  const zoomIn = () =>
    setZoomPan({ ...zoomPan, scale: Math.min(zoomPan.scale + 0.25, 5) });
  const zoomOut = () => {
    const next = Math.max(zoomPan.scale - 0.25, 1);
    if (next === 1) {
      resetZoomPan();
    } else {
      setZoomPan({ ...zoomPan, scale: next });
    }
  };
  const handleReset = () => resetZoomPan();

  return (
    <div
      className="absolute bottom-2.5 left-2.5 z-10 flex items-center gap-1 rounded-full bg-black/50 px-1.5 py-1.5 backdrop-blur-md sm:left-1/2 sm:-translate-x-1/2"
    >
      <button
        onClick={zoomOut}
        disabled={zoomPan.scale <= 1}
        className="flex size-7 cursor-pointer items-center justify-center rounded-full text-white transition-colors hover:bg-white/15 disabled:cursor-default disabled:opacity-30"
      >
        <Minus className="size-3.5" />
      </button>
      <button
        onClick={handleReset}
        className="min-w-[48px] cursor-pointer rounded-full px-2 py-0.5 text-center text-[11px] font-[500] tabular-nums text-white transition-colors hover:bg-white/15"
      >
        {Math.round(zoomPan.scale * 100)}%
      </button>
      <button
        onClick={zoomIn}
        disabled={zoomPan.scale >= 5}
        className="flex size-7 cursor-pointer items-center justify-center rounded-full text-white transition-colors hover:bg-white/15 disabled:cursor-default disabled:opacity-30"
      >
        <Plus className="size-3.5" />
      </button>
    </div>
  );
}

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
  drawEraserMode,
  onExport,
  onGenerateVideo,
  onUpload,
  onScrollToHistory,
  onRemoveImage,
  onFileDrop,
  onImageSourceDrop,
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

      // 1) 로컬 파일 드롭
      const file = e.dataTransfer.files?.[0];
      if (file && file.type.startsWith("image/")) {
        onFileDrop?.(file);
        return;
      }

      // 2) 앱 내부 이미지 소스 드래그
      const raw = e.dataTransfer.getData("application/x-image-source");
      if (raw) {
        try {
          const source = JSON.parse(raw) as { url: string; generationId?: string };
          onImageSourceDrop?.(source);
        } catch {
          // ignore malformed data
        }
      }
    },
    [onFileDrop, onImageSourceDrop],
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
      className="relative flex h-[55vh] items-center justify-center overflow-hidden rounded-2xl border-2 border-neutral-200 bg-white sm:h-[65vh] dark:border-neutral-800/80 dark:bg-neutral-950/85"
      style={{
        backgroundImage: "radial-gradient(circle, var(--canvas-checker) 1px, transparent 1px)",
        backgroundSize: "16px 16px",
      }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
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
        drawEraserMode={drawEraserMode}
      />

      {/* 드래그 앤 드롭 오버레이 */}
      {isDragging && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-2 rounded-2xl bg-white/90 px-8 py-6 shadow-lg dark:bg-neutral-900/90">
            <Upload className="size-8 text-neutral-600 dark:text-neutral-300" />
            <p className="text-[15px] font-[600] text-neutral-700 dark:text-neutral-200">
              {t("dropImage")}
            </p>
          </div>
        </div>
      )}

      {/* 하단 중앙: 줌 컨트롤 */}
      <ZoomControls />

      {/* 우상단 액션 버튼 */}
      <div className="pointer-events-none absolute top-2.5 right-2.5 flex items-center gap-1.5">
        <TooltipProvider delay={0} closeDelay={0}>
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
          <TooltipContent side="bottom">{t("generateVideo")}</TooltipContent>
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
          <TooltipContent side="bottom">{t("download")}</TooltipContent>
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
          <TooltipContent side="bottom">{t("removeImage")}</TooltipContent>
        </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}
