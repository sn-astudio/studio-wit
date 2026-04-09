"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { Copy, ImageIcon, Plus, Upload, X } from "lucide-react";

import { GalleryModal } from "./GalleryPopover";
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
  const [showMenu, setShowMenu] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSelect = useCallback((url: string) => {
    onSelect(url);
    setShowMenu(false);
    setShowGallery(false);
  }, [onSelect]);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const url = URL.createObjectURL(file);
      handleSelect(url);
      e.target.value = "";
    },
    [handleSelect],
  );

  // 메뉴 위치 계산
  const openMenu = useCallback(() => {
    const rect = btnRef.current?.getBoundingClientRect();
    if (rect) {
      const menuW = 200;
      const menuH = 96;
      const spaceBelow = window.innerHeight - rect.bottom;
      const top = spaceBelow < menuH + 16 ? rect.top - menuH - 8 : rect.bottom + 8;
      const left = Math.min(Math.max(16, rect.left + rect.width / 2 - menuW / 2), window.innerWidth - menuW - 16);
      setMenuPos({ top, left });
    }
    setShowMenu(true);
  }, []);

  // 메뉴 외부 클릭 닫기
  useEffect(() => {
    if (!showMenu) return;
    const handler = (e: MouseEvent) => {
      if (
        menuRef.current && !menuRef.current.contains(e.target as Node) &&
        btnRef.current && !btnRef.current.contains(e.target as Node)
      ) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showMenu]);

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
        onClick={() => showMenu ? setShowMenu(false) : openMenu()}
        className={`flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-neutral-300 bg-neutral-50 text-muted-foreground transition-colors hover:border-neutral-400 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-900/50 dark:hover:border-neutral-500 dark:hover:bg-white/5 ${compact ? "aspect-square" : "py-8 rounded-2xl"}`}
      >
        <Plus className="size-5 opacity-40" />
        <span className="text-[13px] font-[500]">{t("composeAddImage")}</span>
      </button>

      {/* 메뉴 팝오버 — 포탈로 body에 렌더 */}
      {showMenu && createPortal(
        <div
          ref={menuRef}
          className="fixed z-[100] w-[200px] rounded-xl border border-border/50 bg-popover p-2 shadow-lg"
          style={{ top: menuPos.top, left: menuPos.left }}
        >
          <div className="flex flex-col gap-0.5">
            {currentEditingImageUrl && (
              <button
                onClick={() => handleSelect(currentEditingImageUrl)}
                className="flex h-9 w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 text-[13px] font-[500] text-foreground transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                <Copy className="size-4 opacity-35" />
                {t("composeUseCurrentImage")}
              </button>
            )}
            <button
              onClick={() => { setShowMenu(false); setShowGallery(true); }}
              className="flex h-9 w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 text-[13px] font-[500] text-foreground transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800"
            >
              <ImageIcon className="size-4 opacity-35" />
              {t("composeFromGallery")}
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex h-9 w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 text-[13px] font-[500] text-foreground transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800"
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
      )}

      {/* 갤러리 모달 */}
      {showGallery && (
        <GalleryModal
          onSelect={handleSelect}
          onClose={() => setShowGallery(false)}
        />
      )}
    </div>
  );
}
