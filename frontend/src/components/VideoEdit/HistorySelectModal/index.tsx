"use client";

import { useCallback, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { Film, X } from "lucide-react";

import { useGenerationHistory } from "@/hooks/queries/useGeneration";
import { formatTimeAgo } from "@/components/MyPage/GenerationCard/utils";
import type { HistorySelectModalProps } from "./types";

export function HistorySelectModal({
  isOpen,
  onClose,
  onSelect,
}: HistorySelectModalProps) {
  const t = useTranslations("VideoEdit");

  const {
    data: historyData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useGenerationHistory({
    type: "video",
    status: "completed",
    limit: 20,
  });

  const apiGenerations =
    historyData?.pages.flatMap((p) => p.generations) ?? [];

  const allGenerations = apiGenerations;

  // 무한 스크롤
  const observerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = observerRef.current;
    if (!el || !isOpen) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage)
          fetchNextPage();
      },
      { threshold: 0.1 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, isOpen]);

  // ESC 닫기
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  const handleSelect = useCallback(
    (gen: (typeof allGenerations)[number]) => {
      onSelect?.({
        url: gen.result_url!,
        duration: 0,
        width: 0,
        height: 0,
        name: gen.prompt?.slice(0, 30) || gen.model_id,
        aspectRatio: gen.aspect_ratio ?? undefined,
      });
      onClose();
    },
    [onSelect, onClose],
  );

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="mx-4 flex h-[80vh] w-full max-w-[800px] flex-col overflow-hidden rounded-2xl border-2 border-neutral-200 bg-white shadow-lg dark:border-neutral-800/80 dark:bg-neutral-950"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex shrink-0 items-center justify-between border-b border-neutral-100 px-5 py-4 dark:border-neutral-800/60">
          <h3 className="text-[15px] font-[600] text-foreground">
            {t("selectVideosForMerge")}
          </h3>
          <button
            onClick={onClose}
            className="flex size-8 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-neutral-100 hover:text-foreground dark:hover:bg-neutral-800"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* 비디오 그리드 — 3열 masonry */}
        <div className="flex-1 overflow-y-auto scrollbar-none p-5">
          {allGenerations.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-3">
              <Film className="size-10 text-neutral-300 dark:text-neutral-700" strokeWidth={1.5} />
              <p className="text-[14px] text-muted-foreground/50">
                {t("noVideos")}
              </p>
            </div>
          ) : (
            <div className="columns-3 gap-2">
              {allGenerations
                .filter((g) => g.result_url && !g.result_url.match(/\.(png|jpg|jpeg|gif|webp)(\?|$)/i))
                .map((gen) => (
                  <button
                    key={gen.id}
                    onClick={() => handleSelect(gen)}
                    className="group relative mb-2 block w-full cursor-pointer overflow-hidden rounded-xl bg-neutral-100 break-inside-avoid transition-all active:scale-[0.97] dark:bg-neutral-800/60"
                  >
                    <video
                      src={gen.result_url!}
                      className="w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      muted
                      preload="metadata"
                      onMouseEnter={(e) =>
                        (e.target as HTMLVideoElement)
                          .play()
                          .catch(() => {})
                      }
                      onMouseLeave={(e) => {
                        const v = e.target as HTMLVideoElement;
                        v.pause();
                        v.currentTime = 0;
                      }}
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
              <div ref={observerRef} className="h-4" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
