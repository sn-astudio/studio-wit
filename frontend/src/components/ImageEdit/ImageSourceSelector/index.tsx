"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import {
  ImagePlus,
  X,
  Minus,
  Plus,
  ChevronLeft,
  ChevronRight,
  Wand2,
  Download,
  Trash2,
} from "lucide-react";

import { useRouter } from "@/i18n/routing";
import { useAuthStore } from "@/stores/auth";
import { useGenerationHistory } from "@/hooks/queries/useGeneration";
import type { Generation } from "@/types/api";


import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/Tooltip";
import { downloadImage } from "@/components/ImageCreate/ImagePreview/utils";

import type { ImageSourceSelectorProps } from "./types";

export function ImageSourceSelector({
  onSourceSelected,
  selectedUrl,
}: ImageSourceSelectorProps) {
  const t = useTranslations("ImageEdit");
  const router = useRouter();
  const token = useAuthStore((s) => s.token);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useGenerationHistory(
    token
      ? { type: "image", status: "completed", limit: 20 }
      : undefined,
  );

  const generations =
    data?.pages.flatMap((page) => page.generations) ?? [];

  // 삭제 다이얼로그
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

  // 무한 스크롤
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

  // 라이트박스
  const [lightboxGen, setLightboxGen] = useState<Generation | null>(null);
  const [lightboxClosing, setLightboxClosing] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0 });
  const panOffset = useRef({ x: 0, y: 0 });

  const skipRestoreRef = useRef(false);

  const closeLightbox = useCallback(() => {
    setLightboxClosing(true);
    setTimeout(() => {
      setLightboxGen(null);
      setLightboxClosing(false);
    }, 200);
  }, []);

  const resetZoom = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    panOffset.current = { x: 0, y: 0 };
  }, []);

  const zoomIn = useCallback(() => setZoom((z) => Math.min(z + 0.25, 5)), []);
  const zoomOut = useCallback(() => {
    setZoom((z) => {
      const next = Math.max(z - 0.25, 1);
      if (next === 1) {
        setPan({ x: 0, y: 0 });
        panOffset.current = { x: 0, y: 0 };
      }
      return next;
    });
  }, []);

  useEffect(() => {
    resetZoom();
  }, [lightboxGen, resetZoom]);

  const lightboxIndex = lightboxGen
    ? generations.findIndex((g) => g.id === lightboxGen.id)
    : -1;
  const hasPrev = lightboxIndex > 0;
  const hasNext =
    lightboxIndex >= 0 && lightboxIndex < generations.length - 1;

  const goLightboxPrev = useCallback(() => {
    if (hasPrev) setLightboxGen(generations[lightboxIndex - 1]);
  }, [hasPrev, generations, lightboxIndex]);

  const goLightboxNext = useCallback(() => {
    if (hasNext) setLightboxGen(generations[lightboxIndex + 1]);
  }, [hasNext, generations, lightboxIndex]);

  // 라이트박스 스크롤 잠금 + 키보드
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
      if (skipRestoreRef.current) {
        skipRestoreRef.current = false;
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        window.scrollTo(0, scrollY);
      }
      document.removeEventListener("keydown", handleKey);
    };
  }, [lightboxGen, goLightboxPrev, goLightboxNext, closeLightbox]);

  return (
    <div>
      {/* 구분선 + 섹션 타이틀 */}
      <div className="pt-8 pb-5">
        <h3 className="text-[24px] font-[700] text-foreground">
          {t("historyTitle")}
        </h3>
      </div>

      {/* 히스토리 그리드 */}
      <div>
        {generations.length === 0 ? (
          <div className="flex w-full flex-col items-center justify-center py-20">
            <div className="flex size-14 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800">
              <ImagePlus className="size-6 text-neutral-400 dark:text-neutral-500" />
            </div>
            <p className="mt-4 text-[16px] font-[600] text-foreground">
              {t("noHistory")}
            </p>
            <p className="mt-2.5 text-[14px] text-muted-foreground/60">
              {t("noHistoryDesc")}
            </p>
            <button
              onClick={() => router.push("/image")}
              className="mt-6 flex h-10 cursor-pointer items-center rounded-lg bg-neutral-100 px-5 text-[14px] font-[500] text-muted-foreground transition-colors hover:bg-neutral-200 dark:bg-neutral-800 dark:text-white dark:hover:bg-neutral-700"
            >
              {t("goToCreate")}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            {generations.map((gen) => {
              const ratio = gen.aspect_ratio?.replace(":", "/") ?? "1/1";
              return (
              <div
                key={gen.id}
                className="group relative cursor-pointer overflow-hidden rounded-xl bg-neutral-100 text-left sm:h-[280px] dark:bg-neutral-800/60"
                style={{ aspectRatio: ratio }}
                onClick={() => setLightboxGen(gen)}
              >
                {gen.result_url && (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={gen.result_url}
                      alt={gen.prompt}
                      className="size-full object-cover sm:transition-transform sm:duration-300 sm:group-hover:scale-105"
                    />
                    {/* 호버 오버레이 */}
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/50 opacity-100 sm:opacity-0 sm:transition-opacity sm:duration-200 sm:group-hover:opacity-100" />
                    {/* 상단 프롬프트 */}
                    <div className="pointer-events-none absolute inset-x-0 top-0 px-3 pt-3 pb-8 opacity-100 sm:px-4 sm:pt-4 sm:pb-10 sm:opacity-0 sm:transition-opacity sm:duration-200 sm:group-hover:opacity-100">
                      <p className="line-clamp-1 text-[13px] font-[500] leading-relaxed text-white/90 sm:line-clamp-2 sm:text-[15px]">
                        {gen.prompt}
                      </p>
                    </div>
                    {/* 하단 액션 버튼 — 모바일 항상 표시, PC 호버 시 */}
                    <div className="pointer-events-none absolute bottom-2 right-2 flex items-center gap-1 opacity-100 sm:bottom-2.5 sm:right-2.5 sm:gap-1.5 sm:opacity-0 sm:transition-opacity sm:duration-200 sm:group-hover:opacity-100">
                      <TooltipProvider delay={0} closeDelay={0}>
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (gen.result_url) {
                                  onSourceSelected({
                                    url: gen.result_url,
                                    generationId: gen.id,
                                  });
                                  window.scrollTo({ top: 0, behavior: "smooth" });
                                }
                              }}
                              className="pointer-events-auto flex size-10 cursor-pointer items-center justify-center rounded-lg bg-black/40 text-white backdrop-blur-sm transition-all hover:bg-black/60"
                            >
                              <Wand2 className="size-4" />
                            </button>
                          }
                        />
                        <TooltipContent>{t("startEdit")}</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                if (gen.result_url) await downloadImage(gen.result_url);
                              }}
                              className="pointer-events-auto flex size-10 cursor-pointer items-center justify-center rounded-lg bg-black/40 text-white backdrop-blur-sm transition-all hover:bg-black/60"
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
                              className="pointer-events-auto flex size-10 cursor-pointer items-center justify-center rounded-lg bg-black/40 text-white backdrop-blur-sm transition-all hover:bg-red-500/80"
                            >
                              <Trash2 className="size-4" />
                            </button>
                          }
                        />
                        <TooltipContent>{t("delete")}</TooltipContent>
                      </Tooltip>
                      </TooltipProvider>
                    </div>
                  </>
                )}
              </div>
              );
            })}
          </div>
        )}
        <div ref={sentinelRef} className="h-1" />
      </div>

      {/* 라이트박스 모달 */}
      {lightboxGen?.result_url &&
        createPortal(
          <div
            className={`fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm transition-opacity duration-200 ${
              lightboxClosing ? "opacity-0" : "opacity-100"
            }`}
            onClick={closeLightbox}
          >
            {/* 닫기 */}
            <button
              onClick={closeLightbox}
              className="absolute top-4 right-4 flex size-10 cursor-pointer items-center justify-center rounded-xl bg-white/10 text-white transition-colors hover:bg-white/20"
            >
              <X className="size-5" />
            </button>

            {/* 줌 컨트롤 */}
            <div
              className="absolute bottom-8 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 rounded-full bg-black/50 px-1.5 py-1.5 backdrop-blur-md"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={zoomOut}
                disabled={zoom <= 1}
                className="flex size-8 cursor-pointer items-center justify-center rounded-full text-white transition-colors hover:bg-white/15 disabled:cursor-default disabled:opacity-30"
              >
                <Minus className="size-4" />
              </button>
              <button
                onClick={resetZoom}
                className="min-w-[52px] cursor-pointer rounded-full px-2 py-1 text-center text-[12px] font-[500] tabular-nums text-white transition-colors hover:bg-white/15"
              >
                {Math.round(zoom * 100)}%
              </button>
              <button
                onClick={zoomIn}
                disabled={zoom >= 5}
                className="flex size-8 cursor-pointer items-center justify-center rounded-full text-white transition-colors hover:bg-white/15 disabled:cursor-default disabled:opacity-30"
              >
                <Plus className="size-4" />
              </button>
            </div>

            {/* 좌측 네비게이션 */}
            {hasPrev && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  goLightboxPrev();
                }}
                className="absolute left-4 top-1/2 flex size-12 -translate-y-1/2 cursor-pointer items-center justify-center rounded-xl bg-white/10 text-white transition-colors hover:bg-white/20"
              >
                <ChevronLeft className="size-6" />
              </button>
            )}

            {/* 우측 네비게이션 */}
            {hasNext && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  goLightboxNext();
                }}
                className="absolute right-4 top-1/2 flex size-12 -translate-y-1/2 cursor-pointer items-center justify-center rounded-xl bg-white/10 text-white transition-colors hover:bg-white/20"
              >
                <ChevronRight className="size-6" />
              </button>
            )}

            {/* 이미지 */}
            <div
              className="relative overflow-hidden rounded-2xl"
              onClick={(e) => e.stopPropagation()}
              onWheel={(e) => {
                e.preventDefault();
                if (e.deltaY < 0) zoomIn();
                else zoomOut();
              }}
              style={{ cursor: zoom > 1 ? "grab" : "default" }}
              onMouseDown={(e) => {
                if (zoom <= 1) return;
                isPanning.current = true;
                panStart.current = {
                  x: e.clientX - panOffset.current.x,
                  y: e.clientY - panOffset.current.y,
                };
                (e.currentTarget as HTMLElement).style.cursor = "grabbing";
                e.preventDefault();
              }}
              onMouseMove={(e) => {
                if (!isPanning.current) return;
                const x = e.clientX - panStart.current.x;
                const y = e.clientY - panStart.current.y;
                panOffset.current = { x, y };
                setPan({ x, y });
              }}
              onMouseUp={(e) => { isPanning.current = false; (e.currentTarget as HTMLElement).style.cursor = zoom > 1 ? "grab" : ""; }}
              onMouseLeave={(e) => { isPanning.current = false; (e.currentTarget as HTMLElement).style.cursor = zoom > 1 ? "grab" : ""; }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={lightboxGen.result_url}
                alt={lightboxGen.prompt}
                className="block max-h-[70vh] max-w-[90vw] object-contain transition-transform duration-100"
                style={{
                  transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
                }}
                draggable={false}
              />

              {/* 오버레이 */}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/50" />

              {/* 상단 프롬프트 */}
              <div className="pointer-events-none absolute inset-x-0 top-0 px-5 pt-5 pb-10">
                <p className="line-clamp-6 text-[15px] font-[500] leading-relaxed text-white/90">
                  {lightboxGen.prompt}
                </p>
              </div>

              {/* 하단 액션 버튼 */}
              <div className="absolute bottom-3 right-3 flex items-center gap-1.5">
                <TooltipProvider delay={0} closeDelay={0}>
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <button
                          onClick={() => {
                            if (lightboxGen.result_url) {
                              skipRestoreRef.current = true;
                              onSourceSelected({
                                url: lightboxGen.result_url,
                                generationId: lightboxGen.id,
                              });
                              closeLightbox();
                            }
                          }}
                          className="pointer-events-auto flex size-10 cursor-pointer items-center justify-center rounded-lg bg-black/40 text-white backdrop-blur-sm transition-all hover:bg-black/60"
                        >
                          <Wand2 className="size-4" />
                        </button>
                      }
                    />
                    <TooltipContent>{t("startEdit")}</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <button
                          onClick={async () => {
                            if (lightboxGen.result_url)
                              await downloadImage(lightboxGen.result_url);
                          }}
                          className="pointer-events-auto flex size-10 cursor-pointer items-center justify-center rounded-lg bg-black/40 text-white backdrop-blur-sm transition-all hover:bg-black/60"
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
                          className="pointer-events-auto flex size-10 cursor-pointer items-center justify-center rounded-lg bg-black/40 text-white backdrop-blur-sm transition-all hover:bg-red-500/80"
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
                {t("deleteTitle")}
              </h3>
              <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">
                {t("deleteDesc")}
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
                    // TODO: API 삭제 연동
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
