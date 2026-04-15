"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import NextImage from "next/image";
import { useSession, signIn, signOut } from "next-auth/react";
import { useTranslations } from "next-intl";
import {
  Layers,
  Loader2,
  LogIn,
  X,
  ChevronLeft,
  ChevronRight,
  Download,
  Wand2,
  Scissors,
  Minus,
  Plus,
  Trash2,
} from "lucide-react";
import { useAuthStore } from "@/stores/auth";
import { useRouter } from "@/i18n/routing";
import { useGenerationHistory } from "@/hooks/queries/useGeneration";
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/Tooltip";
import type { Generation } from "@/types/api";
import { GenerationCard } from "./GenerationCard";
import { downloadFile } from "./GenerationCard/utils";
import { TYPE_FILTERS, STATUS_FILTERS } from "./const";
import type { TypeFilter, StatusFilter } from "./types";

const TYPE_FILTER_KEYS: Record<TypeFilter, string> = {
  all: "allTypes",
  image: "images",
  video: "videos",
};

const STATUS_FILTER_KEYS: Record<StatusFilter, string> = {
  all: "allStatus",
  pending: "processing",
  completed: "completed",
  processing: "processing",
  failed: "failed",
};

export function MyPage() {
  const { data: session } = useSession();
  const token = useAuthStore((s) => s.token);
  const t = useTranslations("MyPage");
  const router = useRouter();

  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [lightboxGen, setLightboxGen] = useState<Generation | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0 });
  const panOffset = useRef({ x: 0, y: 0 });

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

  const [deleteTarget, setDeleteTarget] = useState<Generation | null>(null);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useGenerationHistory(
      token
        ? {
            type: typeFilter === "all" ? undefined : typeFilter,
            status: statusFilter === "all" ? undefined : statusFilter,
            limit: 20,
          }
        : undefined,
    );

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
    data?.pages.flatMap((page) => page.generations) ?? [];

  const allGenerations = apiGenerations;

  // Lightbox navigation
  const lightboxIndex = lightboxGen
    ? allGenerations.findIndex((g) => g.id === lightboxGen.id)
    : -1;
  const hasPrev = lightboxIndex > 0;
  const hasNext = lightboxIndex >= 0 && lightboxIndex < allGenerations.length - 1;

  const goLightboxPrev = useCallback(() => {
    if (hasPrev) setLightboxGen(allGenerations[lightboxIndex - 1]);
  }, [hasPrev, allGenerations, lightboxIndex]);

  const goLightboxNext = useCallback(() => {
    if (hasNext) setLightboxGen(allGenerations[lightboxIndex + 1]);
  }, [hasNext, allGenerations, lightboxIndex]);

  // Lock body scroll + keyboard nav
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

  // Lock body scroll for delete dialog
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
        // TODO: API 삭제 연동
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
  }, [deleteTarget]);

  if (!session) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="flex flex-col items-center text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800">
            <LogIn className="size-6 text-neutral-400 dark:text-neutral-500" />
          </div>
          <p className="mt-4 text-[16px] font-[600] text-foreground">
            {t("loginRequired")}
          </p>
          <p className="mt-2.5 text-[14px] text-muted-foreground/60">
            {t("loginRequiredDesc")}
          </p>
          <button
            onClick={() =>
              signIn("google", { callbackUrl: window.location.href })
            }
            className="mt-6 flex h-10 cursor-pointer items-center gap-2 rounded-lg bg-neutral-100 px-5 text-[14px] font-[500] text-muted-foreground transition-colors hover:bg-neutral-200 dark:bg-neutral-800 dark:text-white dark:hover:bg-neutral-700"
          >
            <LogIn className="size-4" />
            {t("signIn")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
      {/* Profile section */}
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
        {session.user?.image ? (
          <NextImage
            src={session.user.image}
            alt={session.user.name ?? ""}
            width={48}
            height={48}
            className="rounded-full"
          />
        ) : (
          <div className="flex size-12 items-center justify-center rounded-full bg-neutral-200 dark:bg-neutral-700">
            <span className="text-[18px] font-[600] text-neutral-500">
              {session.user?.name?.charAt(0) ?? "?"}
            </span>
          </div>
        )}
        <div>
          <h1 className="text-[18px] font-[700] text-foreground">{session.user?.name}</h1>
          <p className="text-[13px] text-muted-foreground/60">
            {session.user?.email}
          </p>
        </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="cursor-pointer rounded-lg border border-neutral-200 px-4 py-2 text-[13px] font-[500] text-muted-foreground transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
        >
          {t("signOut")}
        </button>
      </div>

      <div className="mb-8 h-px bg-neutral-200 dark:bg-neutral-800" />

      {/* Filter bar */}
      <div className="mb-6 flex flex-col gap-5">
        <div className="flex items-baseline gap-2.5">
          <h2 className="text-[24px] font-[700] text-foreground">{t("myWorks")}</h2>
          {!isLoading && (
            <span className="relative top-[1px] text-[24px] font-[700] text-muted-foreground/50">
              {allGenerations.length}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {TYPE_FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setTypeFilter(f)}
                className={`flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-2 text-[14px] font-[500] transition-colors ${
                  typeFilter === f
                    ? "bg-foreground text-background"
                    : "bg-neutral-100 text-muted-foreground hover:bg-neutral-200/60 dark:bg-neutral-800 dark:hover:bg-neutral-700/70"
                }`}
              >
                {t(TYPE_FILTER_KEYS[f])}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                className={`cursor-pointer rounded-lg px-2.5 py-1.5 text-[14px] font-[500] transition-colors ${
                  statusFilter === f
                    ? "text-foreground"
                    : "text-muted-foreground/40 hover:text-muted-foreground"
                }`}
              >
                {t(STATUS_FILTER_KEYS[f])}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex min-h-[calc(100dvh-340px)] items-center justify-center">
          <Loader2 className="size-6 animate-spin text-muted-foreground/40" />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && allGenerations.length === 0 && (
        <div className="flex min-h-[calc(100dvh-340px)] flex-col items-center justify-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800">
            <Layers className="size-6 text-neutral-400 dark:text-neutral-500" />
          </div>
          <p className="mt-4 text-[16px] font-[600] text-foreground">
            {t("noGenerations")}
          </p>
          <p className="mt-2.5 text-[14px] text-muted-foreground/60">
            {t("noGenerationsDesc")}
          </p>
        </div>
      )}

      {/* Grid */}
      {!isLoading && allGenerations.length > 0 && (
        <>
          <div
            className="grid auto-rows-[32px] grid-cols-2 gap-2 sm:auto-rows-[36px] sm:grid-cols-3 lg:grid-cols-4"
            style={{ gridAutoFlow: "dense" }}
          >
            {allGenerations.map((gen) => (
              <GenerationCard
                key={gen.id}
                gen={gen}
                onClick={() => setLightboxGen(gen)}
                onDelete={() => setDeleteTarget(gen)}
              />
            ))}
          </div>

          {/* Infinite scroll sentinel */}
          <div ref={observerRef} className="h-1" />
          {isFetchingNextPage && (
            <div className="flex justify-center py-6">
              <Loader2 className="size-5 animate-spin text-muted-foreground/40" />
            </div>
          )}
        </>
      )}

      {/* Lightbox */}
      {lightboxGen?.result_url &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
            onClick={() => setLightboxGen(null)}
          >
            {/* Close */}
            <button
              onClick={() => setLightboxGen(null)}
              className="absolute top-4 right-4 flex size-10 cursor-pointer items-center justify-center rounded-xl bg-white/10 text-white transition-colors hover:bg-white/20"
            >
              <X className="size-5" />
            </button>

            {/* Prev */}
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

            {/* Next */}
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

            {/* Image: zoom controls */}
            {lightboxGen.type === "image" && (
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
            )}

            {/* Video: bottom action bar */}
            {lightboxGen.type === "video" && (
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
                            router.push(`/video-edit?url=${encodeURIComponent(lightboxGen.result_url!)}`);
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
                          onClick={() => {
                            downloadFile(
                              lightboxGen.result_url!,
                              `${lightboxGen.model_id}_${lightboxGen.id.slice(0, 8)}.mp4`,
                            );
                          }}
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
                </TooltipProvider>
              </div>
            )}

            {/* Media */}
            {lightboxGen.type === "video" ? (
              <div
                className="relative overflow-hidden rounded-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <video
                  src={lightboxGen.result_url}
                  className="block max-h-[70vh] max-w-[90vw] object-contain"
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
            ) : (
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
                {/* Overlay */}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/50" />
                {/* Top prompt */}
                <div className="pointer-events-none absolute inset-x-0 top-0 px-5 pt-5 pb-10">
                  <p className="line-clamp-6 text-[15px] font-[500] leading-relaxed text-white/90">
                    {lightboxGen.prompt}
                  </p>
                </div>
                {/* Bottom action buttons */}
                <div className="absolute bottom-3 right-3 flex items-center gap-1.5">
                  <TooltipProvider delay={0} closeDelay={0}>
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <button
                            onClick={() => {
                              router.push(`/image-edit?img=${encodeURIComponent(lightboxGen.result_url!)}`);
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
                            onClick={() => {
                              downloadFile(
                                lightboxGen.result_url!,
                                `${lightboxGen.model_id}_${lightboxGen.id.slice(0, 8)}.png`,
                              );
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
                  </TooltipProvider>
                </div>
              </div>
            )}
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
                {t(deleteTarget.type === "video" ? "deleteVideoTitle" : "deleteImageTitle")}
              </h3>
              <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">
                {t(deleteTarget.type === "video" ? "deleteVideoDesc" : "deleteImageDesc")}
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
