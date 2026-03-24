"use client";

import { useCallback } from "react";
import { ImageIcon, Loader2, Download, Pencil } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/Button";

import type { ImagePreviewProps } from "./types";
import { downloadImage } from "./utils";

export function ImagePreview({
  imageUrl,
  isGenerating = false,
  progress,
  onEdit,
}: ImagePreviewProps) {
  const t = useTranslations("ImageCreate");

  const handleDownload = useCallback(async () => {
    if (!imageUrl) return;
    await downloadImage(imageUrl);
  }, [imageUrl]);

  return (
    <div className="relative size-full overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/60">
      {isGenerating ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
          <div className="relative">
            <div className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
            <div className="relative flex size-14 items-center justify-center rounded-full bg-zinc-800 ring-2 ring-primary/40">
              <Loader2 className="size-7 animate-spin text-primary" />
            </div>
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-zinc-300">
              {t("generating")}
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              {t("generatingDesc")}
            </p>
          </div>
          <div className="w-40 overflow-hidden rounded-full bg-zinc-800">
            {progress != null && progress > 0 ? (
              <div
                className="h-1 rounded-full bg-gradient-to-r from-primary/60 to-primary transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            ) : (
              <div className="h-1 animate-pulse rounded-full bg-gradient-to-r from-primary/60 to-primary" />
            )}
          </div>
          {progress != null && progress > 0 && (
            <p className="text-xs text-zinc-500">{progress}%</p>
          )}
        </div>
      ) : imageUrl ? (
        <div className="absolute inset-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt="Generated image"
            className="size-full object-contain"
          />
          <div className="absolute top-3 right-3 flex items-center gap-1.5">
            {onEdit && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onEdit}
                className="size-8 cursor-pointer rounded-lg bg-black/50 p-0 backdrop-blur-sm hover:bg-black/70"
              >
                <Pencil className="size-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDownload}
              className="size-8 cursor-pointer rounded-lg bg-black/50 p-0 backdrop-blur-sm hover:bg-black/70"
            >
              <Download className="size-4" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
          <div className="flex size-14 items-center justify-center rounded-xl bg-zinc-800/80 ring-1 ring-zinc-700/50">
            <ImageIcon className="size-7 text-zinc-600" />
          </div>
          <p className="text-sm font-medium text-zinc-400">
            {t("emptyPreview")}
          </p>
          <p className="text-xs text-zinc-600">{t("emptyPreviewDesc")}</p>
        </div>
      )}
    </div>
  );
}
