"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";

import { useAuthStore } from "@/stores/auth";
import { useGenerationHistory } from "@/hooks/queries/useGeneration";
import { formatTimeAgo } from "@/components/MyPage/GenerationCard/utils";

interface GalleryModalProps {
  onSelect: (url: string) => void;
  onClose: () => void;
}

interface GalleryItem {
  id: string;
  result_url: string | null;
  prompt?: string;
  model_id?: string;
  created_at?: string;
}

export function GalleryModal({ onSelect, onClose }: GalleryModalProps) {
  const t = useTranslations("ImageEdit");
  const token = useAuthStore((s) => s.token);

  const { data } = useGenerationHistory(
    token ? { type: "image", status: "completed", limit: 40 } : undefined,
  );
  const apiGenerations = data?.pages.flatMap((page) => page.generations) ?? [];

  // localStorage mock generations
  const [mockGenerations, setMockGenerations] = useState<GalleryItem[]>([]);
  useEffect(() => {
    try {
      const saved = localStorage.getItem("mock-generations");
      if (saved) setMockGenerations(JSON.parse(saved));
    } catch { /* ignore */ }
  }, []);

  const allImages: GalleryItem[] = [...mockGenerations, ...apiGenerations].filter((g) => g.result_url);

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="mx-4 flex h-[80vh] w-full max-w-[800px] flex-col overflow-hidden rounded-2xl border-2 border-neutral-200 bg-white shadow-lg dark:border-neutral-800/80 dark:bg-neutral-950/95"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex shrink-0 items-center justify-between border-b border-neutral-100 px-5 py-4 dark:border-neutral-800/60">
          <h3 className="text-[15px] font-[600] text-foreground">
            {t("composeSelectImage")}
          </h3>
          <button
            onClick={onClose}
            className="flex size-8 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-neutral-100 hover:text-foreground dark:hover:bg-neutral-800"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* 갤러리 그리드 */}
        <div className="flex-1 overflow-y-auto scrollbar-none p-5">
          {allImages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2">
              <p className="text-[14px] text-muted-foreground/50">
                {t("composeNoImages")}
              </p>
            </div>
          ) : (
            <div className="columns-3 gap-2">
              {allImages.map((gen) => (
                <button
                  key={gen.id}
                  onClick={() => onSelect(gen.result_url!)}
                  className="group relative mb-2 block w-full cursor-pointer overflow-hidden rounded-xl bg-neutral-100 break-inside-avoid transition-all active:scale-[0.97] dark:bg-neutral-800/60"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={gen.result_url!}
                    alt={gen.prompt ?? ""}
                    className="w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  {/* 호버 오버레이 */}
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/50 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
                  {/* 상단 프롬프트 */}
                  <div className="pointer-events-none absolute inset-x-0 top-0 px-3 pt-3 pb-8 text-left opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                    <p className="line-clamp-2 text-[13px] font-[500] leading-relaxed text-white/90">
                      {gen.prompt}
                    </p>
                  </div>
                  {/* 하단 메타 */}
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-start gap-0.5 px-3 pb-2.5 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                    {gen.model_id && (
                      <span className="text-[12px] font-[500] text-white/80">{gen.model_id}</span>
                    )}
                    {gen.created_at && (
                      <span className="text-[11px] text-white/60">{formatTimeAgo(gen.created_at)}</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
