"use client";

import { useTranslations } from "next-intl";
import { ImageIcon, Download, Film, Upload, Images, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { EditorCanvas } from "@/components/ImageCreate/ImageEditor/EditorCanvas";

import type { ImageEditPreviewProps } from "./types";

export function ImageEditPreview({
  imageUrl,
  canvasRef,
  filterValues,
  isCropping,
  cropRect,
  onCropChange,
  onExport,
  onGenerateVideo,
  onUpload,
  onScrollToHistory,
  onRemoveImage,
}: ImageEditPreviewProps) {
  const t = useTranslations("ImageEdit");

  if (!imageUrl) {
    return (
      <div className="flex size-full min-h-[50vh] flex-col items-center justify-center rounded-2xl bg-neutral-100 sm:min-h-[60vh] dark:bg-neutral-800/60">
        <div className="flex size-20 items-center justify-center rounded-2xl bg-neutral-200 dark:bg-neutral-700/50">
          <ImageIcon className="size-9 text-neutral-400 dark:text-neutral-500" />
        </div>
        <p className="mt-5 text-[15px] font-semibold text-muted-foreground">{t("selectImage")}</p>
        <p className="mt-1.5 text-[13px] text-muted-foreground/60">{t("selectImageDesc")}</p>
        <div className="mt-6 flex gap-3">
          <button
            onClick={onUpload}
            className="flex h-11 cursor-pointer items-center gap-2.5 rounded-xl bg-foreground px-5 text-[14px] font-[500] text-background transition-colors hover:opacity-90"
          >
            <Upload className="size-4" />
            {t("uploadImage")}
          </button>
          <button
            onClick={onScrollToHistory}
            className="flex h-11 cursor-pointer items-center gap-2.5 rounded-xl border border-neutral-300 px-5 text-[14px] font-[500] text-foreground transition-colors hover:bg-neutral-200 dark:border-neutral-700 dark:hover:bg-neutral-700"
          >
            <Images className="size-4 opacity-50" />
            {t("myImages")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex size-full flex-col overflow-hidden rounded-2xl bg-neutral-100 dark:bg-neutral-800/60">
      <EditorCanvas
        ref={canvasRef}
        imageUrl={imageUrl}
        filterValues={filterValues}
        isCropping={isCropping}
        cropRect={cropRect}
        onCropChange={onCropChange}
      />
      <div className="flex items-center justify-between border-t border-neutral-200 px-4 py-2.5 dark:border-neutral-700">
        <button
          onClick={onRemoveImage}
          className="flex h-9 cursor-pointer items-center gap-2 rounded-xl px-3 text-[13px] font-[500] text-red-500 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
        >
          <Trash2 className="size-4" />
          {t("removeImage")}
        </button>
        <div className="flex items-center gap-1.5">
          <button
            onClick={onGenerateVideo}
            className="flex h-9 cursor-pointer items-center gap-2 rounded-xl px-3 text-[13px] font-[500] text-foreground transition-colors hover:bg-neutral-200 dark:hover:bg-neutral-700"
          >
            <Film className="size-4 opacity-50" />
            {t("generateVideo")}
          </button>
          <button
            onClick={onExport}
            className="flex h-9 cursor-pointer items-center gap-2 rounded-xl px-3 text-[13px] font-[500] text-foreground transition-colors hover:bg-neutral-200 dark:hover:bg-neutral-700"
          >
            <Download className="size-4 opacity-50" />
            {t("exportImage")}
          </button>
        </div>
      </div>
    </div>
  );
}
