"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Plus, X } from "lucide-react";

import { GalleryPopover } from "./GalleryPopover";
import type { ImageSlotProps } from "./types";

export function ImageSlot({
  label,
  imageUrl,
  onSelect,
  onRemove,
  readOnly,
}: ImageSlotProps) {
  const t = useTranslations("ImageEdit");
  const [showGallery, setShowGallery] = useState(false);

  const handleSelect = (url: string) => {
    onSelect(url);
    setShowGallery(false);
  };

  if (imageUrl) {
    return (
      <div className="space-y-1.5">
        <span className="text-xs font-medium text-zinc-400">{label}</span>
        <div className="relative overflow-hidden rounded-lg border border-zinc-700">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt={label}
            className="aspect-video w-full object-cover"
          />
          {!readOnly && onRemove && (
            <button
              onClick={onRemove}
              className="absolute top-1.5 right-1.5 cursor-pointer rounded-full bg-black/60 p-1 text-zinc-300 transition-colors hover:bg-black/80 hover:text-white"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="relative space-y-1.5">
      <span className="text-xs font-medium text-zinc-400">{label}</span>
      <button
        onClick={() => setShowGallery(!showGallery)}
        className="flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-zinc-700 py-6 text-zinc-500 transition-colors hover:border-zinc-500 hover:text-zinc-300"
      >
        <Plus className="size-6" />
        <span className="text-xs">{t("composeAddImage")}</span>
      </button>

      {showGallery && (
        <GalleryPopover
          onSelect={handleSelect}
          onClose={() => setShowGallery(false)}
        />
      )}
    </div>
  );
}
