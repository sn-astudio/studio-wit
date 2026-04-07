"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { Wand2, Upload } from "lucide-react";

import type { GalleryPopoverProps } from "./types";

export function GalleryPopover({
  onSelect,
  onClose,
  currentEditingImageUrl,
  anchorRef,
}: GalleryPopoverProps & { anchorRef: React.RefObject<HTMLButtonElement | null> }) {
  const t = useTranslations("ImageEdit");
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const anchor = anchorRef?.current;
    const popover = popoverRef.current;
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    const menuH = popover?.offsetHeight ?? 100;

    // 아래 공간이 부족하면 위로
    const spaceBelow = window.innerHeight - rect.bottom;
    if (spaceBelow < menuH + 16) {
      setPos({ top: rect.top - menuH - 8, left: rect.left });
    } else {
      setPos({ top: rect.bottom + 8, left: rect.left });
    }
  }, [anchorRef]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const url = URL.createObjectURL(file);
      onSelect(url);
      e.target.value = "";
    },
    [onSelect],
  );

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  return createPortal(
    <div
      ref={popoverRef}
      className="fixed z-[100] w-[200px] rounded-xl border border-border/50 bg-popover p-2.5 shadow-lg"
      style={{ top: pos.top, left: pos.left }}
    >
      <div className="flex flex-col gap-1">
        {currentEditingImageUrl && (
          <button
            onClick={() => onSelect(currentEditingImageUrl)}
            className="flex h-10 w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 text-[14px] font-[500] text-foreground transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            <Wand2 className="size-4 opacity-35" />
            {t("composeUseCurrentImage")}
          </button>
        )}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex h-10 w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 text-[14px] font-[500] text-foreground transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800"
        >
          <Upload className="size-4 opacity-35" />
          {t("composeUpload")}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
    </div>,
    document.body,
  );
}
