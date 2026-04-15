"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Video,
  Clapperboard,
  Loader2,
  Download,
  Scissors,
  Trash2,
  X,
  ChevronLeft,
  ChevronRight,
  VideoOff,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { useRouter } from "@/i18n/routing";
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/Tooltip";
import type { Generation } from "@/types/api";

import type { VideoPreviewProps } from "./types";
import { downloadVideo } from "./utils";
import { formatTimeAgo } from "@/components/MyPage/GenerationCard/utils";

export function VideoPreview({
  isGenerating = false,
  progress,
  generations = [],
  onSelectGeneration,
  onDelete,
  onCancel,
  generatingRatio,
}: VideoPreviewProps) {
  const t = useTranslations("VideoCreate");
  const router = useRouter();
  const [lightboxGen, setLightboxGen] = useState<Generation | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Generation | null>(null);
  const [failedUrls, setFailedUrls] = useState<Set<string>>(new Set());
  const [detectedAspects, setDetectedAspects] = useState<Map<string, string>>(new Map());

  // Hover-autoplay refs map
  const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());

  const handleVideoError = useCallback((url: string) => {
    setFailedUrls((prev) => new Set(prev).add(url));
  }, []);

  const handleMouseEnter = useCallback((genId: string) => {
    const v = videoRefs.current.get(genId);
    v?.play().catch(() => {});
  }, []);

  const handleMouseLeave = useCallback((genId: string) => {
    const v = videoRefs.current.get(genId);
    if (v) {
      v.pause();
      v.currentTime = 0;
    }
  }, []);

  // Lightbox navigation
  const lightboxIndex = lightboxGen
    ? generations.findIndex((g) => g.id === lightboxGen.id)
    : -1;
  const hasPrev = lightboxIndex > 0;
  const hasNext = lightboxIndex >= 0 && lightboxIndex < generations.length - 1;

  const goLightboxPrev = useCallback(() => {
    if (hasPrev) setLightboxGen(generations[lightboxIndex - 1]);
  }, [hasPrev, generations, lightboxIndex]);

  const goLightboxNext = useCallback(() => {
    if (hasNext) setLightboxGen(generations[lightboxIndex + 1]);
  }, [hasNext, generations, lightboxIndex]);

  // Lock body scroll when delete dialog is open
  useEffect(() => {
    if (!deleteTarget) return;
    const scrollY = window.scrollY;
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDeleteTarget(null);
      if (e.key === "Enter") {
        onDelete?.(deleteTarget);
        setDeleteTarget(null);
      }
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
  }, [deleteTarget, onDelete]);

  // Lock body scroll when lightbox is open + keyboard nav
  useEffect(() => {
    if (!lightboxGen) return;
    const scrollY = window.scrollY;
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxGen(null);
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
  }, [lightboxGen, goLightboxPrev, goLightboxNext]);

  const hasHistory = generations.length > 0;

  return (
    <div className="flex w-full flex-1 flex-col">
      {hasHistory || isGenerating ? (
        <div className="grid grid-cols-2 gap-1.5 sm:columns-3 sm:block sm:gap-2">
          {/* Generating card */}
          {isGenerating && (
            <div
              className="relative flex flex-col items-center justify-center overflow-hidden rounded-xl bg-neutral-100 sm:mb-2 sm:break-inside-avoid dark:bg-neutral-800/60"
              style={{ aspectRatio: generatingRatio?.replace(":", "/") ?? "16/9" }}
            >
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative flex items-center justify-center">
                  <span
                    className="absolute size-14 animate-ping rounded-full bg-neutral-300/30 dark:bg-neutral-600/20"
                    style={{ animationDuration: "2s" }}
                  />
                  <div className="relative flex size-12 items-center justify-center rounded-full bg-neutral-200 dark:bg-neutral-700">
                    <Loader2
                      className="size-5 animate-spin text-neutral-500 dark:text-neutral-400"
                      style={{ animationDuration: "1.5s" }}
                    />
                  </div>
                </div>
              </div>
              {onCancel && (
                <button
                  onClick={onCancel}
                  className="absolute bottom-3 left-1/2 -translate-x-1/2 flex cursor-pointer items-center justify-center rounded-full p-1.5 text-muted-foreground/40 transition-colors hover:text-muted-foreground"
                >
                  <X className="size-5" />
                </button>
              )}
            </div>
          )}

          {/* Completed video cards */}
          {generations.map((gen) => {
            const ratio = detectedAspects.get(gen.id) ?? gen.aspect_ratio?.replace(":", "/") ?? "16/9";
            const isFailed = gen.result_url
              ? failedUrls.has(gen.result_url)
              : false;
            return (
              <div
                key={gen.id}
                className="group relative cursor-pointer overflow-hidden rounded-xl bg-neutral-100 sm:mb-2 sm:break-inside-avoid dark:bg-neutral-800/60"
                style={{ aspectRatio: ratio }}
                onClick={() => setLightboxGen(gen)}
                onMouseEnter={() => handleMouseEnter(gen.id)}
                onMouseLeave={() => handleMouseLeave(gen.id)}
              >
                {gen.result_url && !isFailed && (
                  <>
                    <video
                      ref={(el) => {
                        if (el) videoRefs.current.set(gen.id, el);
                        else videoRefs.current.delete(gen.id);
                      }}
                      src={gen.result_url}
                      poster={gen.thumbnail_url ?? undefined}
                      preload="metadata"
                      className="size-full object-cover"
                      muted
                      loop
                      playsInline
                      onError={() => handleVideoError(gen.result_url!)}
                      onLoadedMetadata={(e) => {
                        const v = e.currentTarget;
                        if (v.videoWidth && v.videoHeight) {
                          setDetectedAspects((prev) => {
                            const next = new Map(prev);
                            next.set(gen.id, `${v.videoWidth}/${v.videoHeight}`);
                            return next;
                          });
                        }
                      }}
                    />
                    {/* Overlay -- mobile always, PC on hover */}
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/50 opacity-100 sm:opacity-0 sm:transition-opacity sm:duration-200 sm:group-hover:opacity-100" />

                    {/* Top prompt */}
                    <div className="pointer-events-none absolute inset-x-0 top-0 px-3 pt-3 pb-8 opacity-100 sm:px-4 sm:pt-4 sm:pb-10 sm:opacity-0 sm:transition-opacity sm:duration-200 sm:group-hover:opacity-100">
                      <p className="line-clamp-1 text-[13px] font-[500] leading-relaxed text-white/90 sm:line-clamp-2 sm:text-[15px]">
                        {gen.prompt}
                      </p>
                    </div>

                    {/* Bottom: meta + actions */}
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
                                  router.push(
                                    `/video-edit?url=${encodeURIComponent(gen.result_url!)}`,
                                  );
                                }}
                                className="pointer-events-auto flex size-10 cursor-pointer items-center justify-center rounded-lg bg-black/40 text-white backdrop-blur-sm transition-all hover:bg-black/60"
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
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  if (gen.result_url)
                                    await downloadVideo(gen.result_url);
                                }}
                                className="pointer-events-auto flex size-10 cursor-pointer items-center justify-center rounded-lg bg-black/40 text-white backdrop-blur-sm transition-all hover:bg-black/60"
                              >
                                <Download className="size-4" />
                              </button>
                            }
                          />
                          <TooltipContent>{t("download")}</TooltipContent>
                        </Tooltip>
                        {onDelete && (
                          <Tooltip>
                            <TooltipTrigger
                              render={
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeleteTarget(gen);
                                  }}
                                  className="pointer-events-auto flex size-10 cursor-pointer items-center justify-center rounded-lg bg-black/40 text-white backdrop-blur-sm transition-all hover:bg-red-500/80"
                                >
                                  <Trash2 className="size-4" />
                                </button>
                              }
                            />
                            <TooltipContent>{t("delete")}</TooltipContent>
                          </Tooltip>
                        )}
                      </TooltipProvider>
                    </div>
                    </div>
                  </>
                )}

                {/* Video load error fallback */}
                {isFailed && (
                  <div className="flex size-full flex-col items-center justify-center gap-3">
                    <div className="flex size-14 items-center justify-center rounded-2xl bg-neutral-200 dark:bg-neutral-700">
                      <VideoOff
                        className="size-6 text-neutral-400 dark:text-neutral-500"
                        strokeWidth={1.5}
                      />
                    </div>
                    <p className="text-[13px] text-muted-foreground/60">
                      {t("videoLoadError")}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* Empty state */
        <div className="flex flex-1 flex-col items-center justify-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800">
            <Clapperboard className="size-6 text-neutral-400 dark:text-neutral-500" />
          </div>
          <p className="mt-4 text-[16px] font-[600] text-foreground">
            {t("emptyPreview")}
          </p>
          <p className="mt-2.5 text-[14px] text-muted-foreground/60">
            {t("emptyPreviewDesc")}
          </p>
        </div>
      )}

      {/* Lightbox modal */}
      {lightboxGen?.result_url &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
            onClick={() => setLightboxGen(null)}
          >
            {/* Close button */}
            <button
              onClick={() => setLightboxGen(null)}
              className="absolute top-4 right-4 flex size-10 cursor-pointer items-center justify-center rounded-xl bg-white/10 text-white transition-colors hover:bg-white/20"
            >
              <X className="size-5" />
            </button>

            {/* Prev navigation */}
            {hasPrev && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  goLightboxPrev();
                }}
                className="absolute left-4 top-1/2 -translate-y-1/2 flex size-12 cursor-pointer items-center justify-center rounded-xl bg-white/10 text-white transition-colors hover:bg-white/20"
              >
                <ChevronLeft className="size-6" />
              </button>
            )}

            {/* Next navigation */}
            {hasNext && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  goLightboxNext();
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 flex size-12 cursor-pointer items-center justify-center rounded-xl bg-white/10 text-white transition-colors hover:bg-white/20"
              >
                <ChevronRight className="size-6" />
              </button>
            )}

            {/* Bottom center: action bar (like image zoom controls) */}
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
                          router.push(
                            `/video-edit?url=${encodeURIComponent(lightboxGen.result_url!)}`,
                          );
                          setLightboxGen(null);
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
                        onClick={async () => {
                          if (lightboxGen.result_url)
                            await downloadVideo(lightboxGen.result_url);
                        }}
                        className="flex size-10 cursor-pointer items-center justify-center rounded-xl bg-white/10 text-white transition-colors hover:bg-white/20"
                      >
                        <Download className="size-4" />
                      </button>
                    }
                  />
                  <TooltipContent>{t("download")}</TooltipContent>
                </Tooltip>
                {onDelete && (
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <button
                          onClick={() => {
                            setLightboxGen(null);
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
                )}
              </TooltipProvider>
            </div>

            {/* Video player */}
            <div
              className="relative overflow-hidden rounded-2xl"
              onClick={(e) => e.stopPropagation()}
              style={{
                aspectRatio: detectedAspects.get(lightboxGen.id) ?? lightboxGen.aspect_ratio?.replace(":", "/") ?? "16/9",
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

              {/* Overlay */}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-transparent" />

              {/* Top prompt */}
              <div className="pointer-events-none absolute inset-x-0 top-0 px-5 pt-5 pb-10">
                <p className="line-clamp-6 text-[15px] font-[500] leading-relaxed text-white/90">
                  {lightboxGen.prompt}
                </p>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {/* Delete confirmation dialog */}
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
                    onDelete?.(deleteTarget);
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
