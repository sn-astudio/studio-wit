"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Film,
  Loader2,
  Scissors,
  Trash2,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";

import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/Tooltip";
import { useGenerationHistory } from "@/hooks/queries/useGeneration";
import type { Generation } from "@/types/api";
import { downloadVideo } from "../utils";
import { formatTimeAgo } from "@/components/MyPage/GenerationCard/utils";
import type { VideoSourceSelectorProps } from "./types";

export function VideoSourceSelector({
  onSourceSelected,
  isLoading,
  mergeMode,
  onAddToMerge,
  onSelectVideo,
  onDelete,
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

  // 라이트박스
  const [lightboxGen, setLightboxGen] = useState<Generation | null>(null);
  const [lightboxClosing, setLightboxClosing] = useState(false);

  const closeLightbox = () => {
    setLightboxClosing(true);
    setTimeout(() => { setLightboxGen(null); setLightboxClosing(false); }, 200);
  };

  const lightboxIndex = lightboxGen ? completedVideos.findIndex((g) => g.id === lightboxGen.id) : -1;
  const hasPrev = lightboxIndex > 0;
  const hasNext = lightboxIndex >= 0 && lightboxIndex < completedVideos.length - 1;
  const goLightboxPrev = () => { if (hasPrev) setLightboxGen(completedVideos[lightboxIndex - 1]); };
  const goLightboxNext = () => { if (hasNext) setLightboxGen(completedVideos[lightboxIndex + 1]); };

  useEffect(() => {
    if (!lightboxGen) return;
    const scrollY = window.scrollY;
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft") goLightboxPrev();
      if (e.key === "ArrowRight") goLightboxNext();
    };
    document.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.left = "";
      document.body.style.right = "";
      window.scrollTo(0, scrollY);
      document.removeEventListener("keydown", handleKey);
    };
  }, [lightboxGen, lightboxIndex]);

  const [deleteTarget, setDeleteTarget] = useState<Generation | null>(null);

  useEffect(() => {
    if (!deleteTarget) return;
    const scrollY = window.scrollY;
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDeleteTarget(null);
    };
    document.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.left = "";
      document.body.style.right = "";
      window.scrollTo(0, scrollY);
      document.removeEventListener("keydown", handleKey);
    };
  }, [deleteTarget]);

  const handleDelete = (gen: Generation) => {
    if (gen.id.startsWith("mock-")) {
      setMockGenerations((prev) => {
        const next = prev.filter((g) => g.id !== gen.id);
        localStorage.setItem("mock-video-generations", JSON.stringify(next));
        return next;
      });
    }
    onDelete?.(gen);
  };

  const handleSelectVideo = (gen: (typeof completedVideos)[0]) => {
    onSourceSelected({
      url: gen.result_url!,
      duration: 0,
      width: 0,
      height: 0,
      name: gen.prompt?.slice(0, 30) || gen.model_id,
      aspectRatio: gen.aspect_ratio ?? undefined,
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
          <div className="grid grid-cols-2 gap-1.5 sm:columns-3 sm:block sm:gap-2 lg:columns-4">
            {completedVideos.map((gen) => {
              const ratio = gen.aspect_ratio?.replace(":", "/") ?? "16/9";
              return (
              <div
                key={gen.id}
                className="group relative cursor-pointer overflow-hidden rounded-xl bg-neutral-100 sm:mb-2 sm:break-inside-avoid dark:bg-neutral-800/60"
                style={{ aspectRatio: ratio }}
                onClick={() => setLightboxGen(gen)}
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
                      className="absolute inset-0 size-full object-cover sm:transition-transform sm:duration-300 sm:group-hover:scale-105"
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
                    {/* 하단: 메타 + 액션 */}
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between px-3 pb-2.5 opacity-100 sm:px-3 sm:pb-2.5 sm:opacity-0 sm:transition-opacity sm:duration-200 sm:group-hover:opacity-100">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[12px] font-[500] text-white/80">{gen.model_id}</span>
                        <span className="text-[11px] text-white/60">{formatTimeAgo(gen.created_at)}</span>
                      </div>
                      <div className="pointer-events-auto flex items-center gap-1">
                        <TooltipProvider delay={0} closeDelay={0}>
                          <Tooltip>
                            <TooltipTrigger
                              render={
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSelectVideo(gen);
                                  }}
                                  className="flex size-10 cursor-pointer items-center justify-center rounded-lg bg-black/40 text-white backdrop-blur-sm transition-all hover:bg-black/60"
                                >
                                  <Scissors className="size-4" />
                                </button>
                              }
                            />
                            <TooltipContent>{t("edit")}</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger
                              render={
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    downloadVideo(gen.result_url!, `${gen.model_id}_${gen.id.slice(0, 8)}.mp4`);
                                  }}
                                  className="flex size-10 cursor-pointer items-center justify-center rounded-lg bg-black/40 text-white backdrop-blur-sm transition-all hover:bg-black/60"
                                >
                                  <Download className="size-4" />
                                </button>
                              }
                            />
                            <TooltipContent>{t("download")}</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger
                              render={
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeleteTarget(gen);
                                  }}
                                  className="flex size-10 cursor-pointer items-center justify-center rounded-lg bg-black/40 text-white backdrop-blur-sm transition-all hover:bg-red-500/80"
                                >
                                  <Trash2 className="size-4" />
                                </button>
                              }
                            />
                            <TooltipContent>{t("delete")}</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>
                  </>
                )}
              </div>
              );
            })}
          </div>
        )}
        <div ref={observerRef} className="h-1" />
        {isFetchingNextPage && (
          <div className="flex justify-center py-2">
            <Loader2 className="size-4 animate-spin text-neutral-500" />
          </div>
        )}
      </div>

      {/* 라이트박스 */}
      {lightboxGen?.result_url &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
            onClick={closeLightbox}
          >
            {/* 닫기 */}
            <button
              onClick={closeLightbox}
              className="absolute top-4 right-4 flex size-10 cursor-pointer items-center justify-center rounded-xl bg-white/10 text-white transition-colors hover:bg-white/20"
            >
              <X className="size-5" />
            </button>

            {/* 좌측 네비 */}
            {hasPrev && (
              <button
                onClick={(e) => { e.stopPropagation(); goLightboxPrev(); }}
                className="absolute left-4 top-1/2 flex size-12 -translate-y-1/2 cursor-pointer items-center justify-center rounded-xl bg-white/10 text-white transition-colors hover:bg-white/20"
              >
                <ChevronLeft className="size-6" />
              </button>
            )}

            {/* 우측 네비 */}
            {hasNext && (
              <button
                onClick={(e) => { e.stopPropagation(); goLightboxNext(); }}
                className="absolute right-4 top-1/2 flex size-12 -translate-y-1/2 cursor-pointer items-center justify-center rounded-xl bg-white/10 text-white transition-colors hover:bg-white/20"
              >
                <ChevronRight className="size-6" />
              </button>
            )}

            {/* 하단 중앙: 액션 바 */}
            <div
              className="absolute bottom-8 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5"
              onClick={(e) => e.stopPropagation()}
            >
              <TooltipProvider delay={0} closeDelay={0}>
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <button
                        onClick={() => {
                          handleSelectVideo(lightboxGen);
                          closeLightbox();
                        }}
                        className="flex size-10 cursor-pointer items-center justify-center rounded-xl bg-white/10 text-white transition-colors hover:bg-white/20"
                      >
                        <Scissors className="size-4" />
                      </button>
                    }
                  />
                  <TooltipContent>{t("edit")}</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <button
                        onClick={() => downloadVideo(lightboxGen.result_url!, `${lightboxGen.model_id}_${lightboxGen.id.slice(0, 8)}.mp4`)}
                        className="flex size-10 cursor-pointer items-center justify-center rounded-xl bg-white/10 text-white transition-colors hover:bg-white/20"
                      >
                        <Download className="size-4" />
                      </button>
                    }
                  />
                  <TooltipContent>{t("download")}</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <button
                        onClick={() => {
                          closeLightbox();
                          setDeleteTarget(lightboxGen);
                        }}
                        className="flex size-10 cursor-pointer items-center justify-center rounded-xl bg-white/10 text-white transition-colors hover:bg-red-500/80"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    }
                  />
                  <TooltipContent>{t("delete")}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            {/* 비디오 */}
            <div
              className="relative overflow-hidden rounded-2xl"
              onClick={(e) => e.stopPropagation()}
              style={{
                aspectRatio: lightboxGen.aspect_ratio?.replace(":", "/") ?? "16/9",
                maxHeight: "78vh",
                maxWidth: "75vw",
              }}
            >
              <video
                src={lightboxGen.result_url}
                className="block size-full object-cover"
                controls
                autoPlay
                loop
                muted
              />

              {/* 오버레이 */}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-transparent" />

              {/* 상단 프롬프트 */}
              <div className="pointer-events-none absolute inset-x-0 top-0 px-5 pt-5 pb-10">
                <p className="line-clamp-6 text-[15px] font-[500] leading-relaxed text-white/90">
                  {lightboxGen.prompt}
                </p>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {/* 삭제 확인 다이얼로그 */}
      {deleteTarget &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden overscroll-none bg-black/60 backdrop-blur-sm"
            onWheel={(e) => e.preventDefault()}
            onTouchMove={(e) => e.preventDefault()}
          >
            <div
              className="w-[340px] rounded-2xl border border-neutral-200 bg-background p-6 shadow-2xl dark:border-neutral-800"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-[16px] font-semibold text-foreground">
                {t("deleteVideoTitle")}
              </h3>
              <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">
                {t("deleteVideoDesc")}
              </p>
              <div className="mt-5 flex gap-2">
                <button
                  onClick={() => setDeleteTarget(null)}
                  className="flex-1 cursor-pointer rounded-xl bg-neutral-100 py-2.5 text-[14px] font-[500] text-foreground transition-colors hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700"
                >
                  {t("deleteCancel")}
                </button>
                <button
                  onClick={() => {
                    handleDelete(deleteTarget);
                    setDeleteTarget(null);
                  }}
                  className="flex-1 cursor-pointer rounded-xl bg-red-500 py-2.5 text-[14px] font-[500] text-white transition-colors hover:bg-red-600"
                >
                  {t("deleteConfirm")}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
