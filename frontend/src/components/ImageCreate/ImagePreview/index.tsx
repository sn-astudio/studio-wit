"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ImageIcon,
  Loader2,
  Download,
  Wand2,
  ImagePlus,
  Trash2,
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Minus,
  Plus,
  ChevronLeft,
  ChevronRight,
  ImageOff,
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

import type { ImagePreviewProps } from "./types";
import { downloadImage } from "./utils";
import { formatTimeAgo } from "@/components/MyPage/GenerationCard/utils";

export function ImagePreview({
  imageUrl,
  isGenerating = false,
  progress,
  generations = [],
  onSelectGeneration,
  onEdit,
  onDelete,
  onCancel,
  generatingRatio,
  generatingCount = 1,
}: ImagePreviewProps) {
  const t = useTranslations("ImageCreate");
  const router = useRouter();
  const [lightboxGen, setLightboxGen] = useState<Generation | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Generation | null>(null);
  const [failedUrls, setFailedUrls] = useState<Set<string>>(new Set());
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0 });
  const panOffset = useRef({ x: 0, y: 0 });

  const handleImageError = useCallback((url: string) => {
    setFailedUrls((prev) => new Set(prev).add(url));
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
      if (next === 1) { setPan({ x: 0, y: 0 }); panOffset.current = { x: 0, y: 0 }; }
      return next;
    });
  }, []);

  // lightbox 변경 시 줌 리셋
  useEffect(() => {
    resetZoom();
  }, [lightboxGen, resetZoom]);

  // 라이트박스 네비게이션
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

  const getRowSpan = (ratio: string) => {
    const [w, h] = ratio.split("/").map(Number);
    if (!w || !h) return 7;
    return Math.max(3, Math.round(7 * (h / w)));
  };

  return (
    <div className="flex w-full flex-1 flex-col">
      {/* 로딩 + 히스토리 동시 표시 가능 */}
      {hasHistory || isGenerating ? (
        <div className="grid auto-rows-[32px] grid-cols-2 gap-2 sm:auto-rows-[36px] sm:grid-cols-3" style={{ gridAutoFlow: "dense" }}>
          {/* 생성 중 카드 */}
          {isGenerating &&
            Array.from({ length: generatingCount }).map((_, i) => (
              <div
                key={`loading-${i}`}
                className="relative flex flex-col items-center justify-center overflow-hidden rounded-xl bg-neutral-100 dark:bg-neutral-800/60"
                style={{ gridRow: `span ${getRowSpan(generatingRatio?.replace(":", "/") ?? "1/1")}` }}
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
                {onCancel && i === 0 && (
                  <button
                    onClick={onCancel}
                    className="absolute bottom-3 left-1/2 -translate-x-1/2 flex cursor-pointer items-center justify-center rounded-full p-1.5 text-muted-foreground/40 transition-colors hover:text-muted-foreground"
                  >
                    <X className="size-5" />
                  </button>
                )}
              </div>
            ))}

          {/* 생성된 이미지 카드 */}
          {generations.map((gen) => {
            const ratio = gen.aspect_ratio?.replace(":", "/") ?? "1/1";
            const isFailed = gen.result_url ? failedUrls.has(gen.result_url) : false;
            return (
            <div
              key={gen.id}
              className="group relative cursor-pointer overflow-hidden rounded-xl bg-neutral-100 dark:bg-neutral-800/60"
              style={{ gridRow: `span ${getRowSpan(ratio)}` }}
              onClick={() => setLightboxGen(gen)}
            >
              {gen.result_url && !isFailed && (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={gen.result_url}
                    alt={gen.prompt}
                    className="size-full object-cover sm:transition-transform sm:duration-300 sm:group-hover:scale-105"
                    onError={() => handleImageError(gen.result_url!)}
                  />
                  {/* 오버레이 — 모바일 항상 표시, PC 호버 시 */}
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/50 opacity-100 sm:opacity-0 sm:transition-opacity sm:duration-200 sm:group-hover:opacity-100" />

                  {/* 상단 프롬프트 — 모바일 항상 표시, PC 호버 시 */}
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
                              if (onEdit) {
                                onEdit(gen.result_url!);
                              } else {
                                router.push(
                                  `/image-edit?img=${encodeURIComponent(gen.result_url!)}`,
                                );
                              }
                            }}
                            className="pointer-events-auto flex size-10 cursor-pointer items-center justify-center rounded-lg bg-black/40 text-white backdrop-blur-sm transition-all hover:bg-black/60"
                          >
                            <Wand2 className="size-4" />
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

              {/* 이미지 로드 실패 fallback */}
              {isFailed && (
                <div className="flex size-full flex-col items-center justify-center gap-3">
                  <div className="flex size-14 items-center justify-center rounded-2xl bg-neutral-200 dark:bg-neutral-700">
                    <ImageOff className="size-6 text-neutral-400 dark:text-neutral-500" strokeWidth={1.5} />
                  </div>
                  <p className="text-[13px] text-muted-foreground/60">
                    {t("imageLoadError")}
                  </p>
                </div>
              )}
            </div>
            );
          })}
        </div>
      ) : (
        /* 완전 빈 상태 */
        <div className="flex flex-1 flex-col items-center justify-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800">
            <ImagePlus className="size-6 text-neutral-400 dark:text-neutral-500" />
          </div>
          <p className="mt-4 text-[16px] font-[600] text-foreground">
            {t("emptyPreview")}
          </p>
          <p className="mt-2.5 text-[14px] text-muted-foreground/60">
            {t("emptyPreviewDesc")}
          </p>
        </div>
      )}

      {/* 라이트박스 모달 */}
      {lightboxGen?.result_url && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setLightboxGen(null)}
        >
          {/* 상단 우측: 닫기 */}
          <button
            onClick={() => setLightboxGen(null)}
            className="absolute top-4 right-4 flex size-10 cursor-pointer items-center justify-center rounded-xl bg-white/10 text-white transition-colors hover:bg-white/20"
          >
            <X className="size-5" />
          </button>

          {/* 하단 중앙: 줌 컨트롤 */}
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
              className="absolute left-4 top-1/2 -translate-y-1/2 flex size-12 cursor-pointer items-center justify-center rounded-xl bg-white/10 text-white transition-colors hover:bg-white/20"
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
              className="absolute right-4 top-1/2 -translate-y-1/2 flex size-12 cursor-pointer items-center justify-center rounded-xl bg-white/10 text-white transition-colors hover:bg-white/20"
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
            style={{ cursor: zoom > 1 ? (isPanning.current ? "grabbing" : "grab") : "default" }}
            onMouseDown={(e) => {
              if (zoom <= 1) return;
              isPanning.current = true;
              panStart.current = { x: e.clientX - panOffset.current.x, y: e.clientY - panOffset.current.y };
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
              style={{ transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)` }}
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
                          if (onEdit) {
                            onEdit(lightboxGen.result_url!);
                          } else {
                            router.push(
                              `/image-edit?img=${encodeURIComponent(lightboxGen.result_url!)}`,
                            );
                          }
                          setLightboxGen(null);
                        }}
                        className="pointer-events-auto flex size-10 cursor-pointer items-center justify-center rounded-lg bg-black/40 text-white backdrop-blur-sm transition-all hover:bg-black/60"
                      >
                        <Wand2 className="size-4" />
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
                {onDelete && (
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <button
                          onClick={() => {
                            setLightboxGen(null);
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
                )}
              </TooltipProvider>
            </div>
          </div>
        </div>,
        document.body,
      )}

      {/* 삭제 확인 다이얼로그 */}
      {deleteTarget && createPortal(
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
