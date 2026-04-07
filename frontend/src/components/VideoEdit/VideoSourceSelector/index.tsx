"use client";

import { useEffect, useRef, useState } from "react";
import {
  Download,
  Film,
  Loader2,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { useGenerationHistory } from "@/hooks/queries/useGeneration";
import type { Generation } from "@/types/api";
import { downloadVideo } from "../utils";
import type { VideoSourceSelectorProps } from "./types";

export function VideoSourceSelector({
  onSourceSelected,
  isLoading,
  mergeMode,
  onAddToMerge,
  onSelectVideo,
}: VideoSourceSelectorProps) {
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

  const observerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = observerRef.current;
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

  const apiGenerations =
    historyData?.pages.flatMap((p) => p.generations) ?? [];

  // localStorage mock video generations
  const [mockGenerations, setMockGenerations] = useState<Generation[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const saved = localStorage.getItem("mock-video-generations");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const completedVideos = [...mockGenerations, ...apiGenerations];

  const handleSelectVideo = (gen: (typeof completedVideos)[0]) => {
    onSourceSelected({
      url: gen.result_url!,
      duration: 0,
      width: 0,
      height: 0,
      name: gen.prompt?.slice(0, 30) || gen.model_id,
    });
  };

  return (
    <div>
      {/* 섹션 타이틀 */}
      <div className="pt-8 pb-5">
        <h3 className="text-[24px] font-[700] text-foreground">
          {t("myVideos")}
        </h3>
      </div>

      {/* 히스토리 그리드 */}
      <div>
        {completedVideos.length === 0 ? (
          <div className="flex w-full flex-col items-center justify-center py-20">
            <div className="flex size-14 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800">
              <Film className="size-6 text-neutral-400 dark:text-neutral-500" />
            </div>
            <p className="mt-4 text-[16px] font-[600] text-foreground">
              {t("noVideos")}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            {completedVideos.map((gen) => (
              <div
                key={gen.id}
                className="group relative cursor-pointer overflow-hidden rounded-xl bg-neutral-100 text-left sm:h-[180px] dark:bg-neutral-800/60"
                style={{ aspectRatio: "16/9" }}
                onClick={() => handleSelectVideo(gen)}
                onMouseEnter={(e) => {
                  const video = e.currentTarget.querySelector("video");
                  video?.play().catch(() => {});
                }}
                onMouseLeave={(e) => {
                  const video = e.currentTarget.querySelector("video");
                  if (video) { video.pause(); video.currentTime = 0; }
                }}
              >
                {gen.result_url && (
                  <>
                    <video
                      src={gen.result_url}
                      poster={gen.thumbnail_url ?? undefined}
                      preload="metadata"
                      className="size-full object-cover sm:transition-transform sm:duration-300 sm:group-hover:scale-105"
                      muted
                      loop
                      playsInline
                    />
                    {/* 호버 오버레이 */}
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/50 opacity-100 sm:opacity-0 sm:transition-opacity sm:duration-200 sm:group-hover:opacity-100" />
                    {/* 상단 프롬프트 */}
                    <div className="pointer-events-none absolute inset-x-0 top-0 px-3 pt-3 pb-8 opacity-100 sm:px-4 sm:pt-4 sm:pb-10 sm:opacity-0 sm:transition-opacity sm:duration-200 sm:group-hover:opacity-100">
                      <p className="line-clamp-1 text-[13px] font-[500] leading-relaxed text-white/90 sm:line-clamp-2 sm:text-[15px]">
                        {gen.prompt}
                      </p>
                    </div>
                    {/* 하단 액션 버튼 */}
                    <div className="pointer-events-none absolute bottom-2 right-2 flex items-center gap-1 opacity-100 sm:bottom-2.5 sm:right-2.5 sm:gap-1.5 sm:opacity-0 sm:transition-opacity sm:duration-200 sm:group-hover:opacity-100">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          downloadVideo(gen.result_url!, `${gen.model_id}_${gen.id.slice(0, 8)}.mp4`);
                        }}
                        className="pointer-events-auto flex size-10 cursor-pointer items-center justify-center rounded-lg bg-black/40 text-white backdrop-blur-sm transition-all hover:bg-black/60"
                      >
                        <Download className="size-4" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
        <div ref={observerRef} className="h-1" />
        {isFetchingNextPage && (
          <div className="flex justify-center py-2">
            <Loader2 className="size-4 animate-spin text-neutral-500" />
          </div>
        )}
      </div>
    </div>
  );
}
