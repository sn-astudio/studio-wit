"use client";

import { useCallback, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { ImageIcon, Upload } from "lucide-react";

import { useAuthStore } from "@/stores/auth";
import { useGenerationHistory } from "@/hooks/queries/useGeneration";

import type { GalleryPopoverProps } from "./types";

export function GalleryPopover({ onSelect, onClose }: GalleryPopoverProps) {
  const t = useTranslations("ImageEdit");
  const token = useAuthStore((s) => s.token);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useGenerationHistory(
      token
        ? { type: "image", status: "completed", limit: 20 }
        : undefined,
    );

  const generations =
    data?.pages.flatMap((page) => page.generations) ?? [];

  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

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

  const popoverRef = useRef<HTMLDivElement>(null);
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

  return (
    <div
      ref={popoverRef}
      className="absolute top-full right-0 left-0 z-10 mt-1 rounded-lg border border-zinc-700 bg-zinc-900 shadow-xl"
    >
      {/* 업로드 버튼 */}
      <div className="border-b border-zinc-800 p-2">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
        >
          <Upload className="size-3.5" />
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

      {/* 갤러리 그리드 */}
      <div className="max-h-[200px] overflow-y-auto p-2">
        {generations.length === 0 ? (
          <div className="flex items-center justify-center py-4">
            <div className="text-center">
              <ImageIcon className="mx-auto size-5 text-zinc-700" />
              <p className="mt-1 text-[10px] text-zinc-600">
                {t("noHistory")}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-1.5">
            {generations.map((gen) => (
              <button
                key={gen.id}
                onClick={() => {
                  if (gen.result_url) {
                    onSelect(gen.result_url);
                  }
                }}
                className="group relative aspect-square cursor-pointer overflow-hidden rounded-md border border-zinc-800/60 bg-zinc-900/60 transition-colors hover:border-zinc-600"
              >
                {gen.result_url && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={gen.result_url}
                    alt={gen.prompt}
                    className="absolute inset-0 size-full object-cover"
                  />
                )}
              </button>
            ))}
          </div>
        )}
        <div ref={sentinelRef} className="h-1" />
      </div>
    </div>
  );
}
