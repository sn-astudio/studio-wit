"use client";

import { useTranslations } from "next-intl";
import { ImageIcon, Download, Film } from "lucide-react";

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
}: ImageEditPreviewProps) {
  const t = useTranslations("ImageEdit");

  if (!imageUrl) {
    return (
      <div className="flex size-full flex-col items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900/80">
        <ImageIcon className="size-12 text-zinc-700" />
        <p className="mt-3 text-sm text-zinc-500">{t("selectImage")}</p>
      </div>
    );
  }

  return (
    <div className="flex size-full flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/80">
      <EditorCanvas
        ref={canvasRef}
        imageUrl={imageUrl}
        filterValues={filterValues}
        isCropping={isCropping}
        cropRect={cropRect}
        onCropChange={onCropChange}
      />
      <div className="flex items-center justify-end gap-1 border-t border-zinc-800 px-3 py-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onGenerateVideo}
          className="cursor-pointer gap-1.5"
        >
          <Film className="size-4" />
          <span className="text-xs">{t("generateVideo")}</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onExport}
          className="cursor-pointer gap-1.5"
        >
          <Download className="size-4" />
          <span className="text-xs">{t("exportImage")}</span>
        </Button>
      </div>
    </div>
  );
}
