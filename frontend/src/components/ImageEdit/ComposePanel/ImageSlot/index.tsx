"use client";

import { useRef, useState } from "react";
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
  currentEditingImageUrl,
  compact,
}: ImageSlotProps) {
  const t = useTranslations("ImageEdit");
  const [showGallery, setShowGallery] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);

  const handleSelect = (url: string) => {
    onSelect(url);
    setShowGallery(false);
  };

  if (imageUrl) {
    return (
      <div>
        <span className="mb-3 block text-[13px] font-[600] text-foreground">{label}</span>
        <div className="relative overflow-hidden rounded-xl bg-neutral-50 dark:bg-neutral-800/60">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt={label}
            className={`w-full object-cover ${compact ? "aspect-square" : "aspect-video"}`}
          />
          {!readOnly && onRemove && (
            <button
              onClick={onRemove}
              className="absolute top-2 right-2 cursor-pointer rounded-full bg-black/50 p-1.5 text-white/80 backdrop-blur-sm transition-colors hover:bg-black/70 hover:text-white"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <span className="mb-3 block text-[13px] font-[600] text-foreground">{label}</span>
      <button
        ref={btnRef}
        onClick={() => setShowGallery(!showGallery)}
        className={`flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-neutral-300 bg-neutral-50 text-muted-foreground transition-colors hover:border-neutral-400 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-900/50 dark:hover:border-neutral-500 dark:hover:bg-white/5 ${compact ? "aspect-square" : "py-8 rounded-2xl"}`}
      >
        <Plus className="size-5 opacity-40" />
        <span className="text-[13px] font-[500]">{t("composeAddImage")}</span>
      </button>

      {showGallery && (
        <GalleryPopover
          onSelect={handleSelect}
          onClose={() => setShowGallery(false)}
          currentEditingImageUrl={currentEditingImageUrl}
          anchorRef={btnRef}
        />
      )}
    </div>
  );
}
