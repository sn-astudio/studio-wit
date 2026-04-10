"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import NextImage from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { Eye, Heart, ArrowRight, ChevronLeft, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { GALLERY_ITEMS, STYLE_TAG_KEYS } from "./const";
import type { GalleryItem, GalleryProps } from "./types";

export function Gallery({ variant = "landing" }: GalleryProps) {
  const t = useTranslations("Gallery");
  const tCommon = useTranslations("MyPage");
  const isPage = variant === "page";
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const visibleItems = isPage
    ? GALLERY_ITEMS.filter((item) => !selectedStyle || item.style === selectedStyle)
    : GALLERY_ITEMS;
  const lightboxItem: GalleryItem | null =
    lightboxIndex != null ? visibleItems[lightboxIndex] ?? null : null;

  const closeLightbox = useCallback(() => setLightboxIndex(null), []);
  const goPrev = useCallback(
    () => setLightboxIndex((i) => (i == null ? null : (i - 1 + visibleItems.length) % visibleItems.length)),
    [visibleItems.length],
  );
  const goNext = useCallback(
    () => setLightboxIndex((i) => (i == null ? null : (i + 1) % visibleItems.length)),
    [visibleItems.length],
  );

  useEffect(() => {
    if (lightboxIndex == null) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    };
    document.addEventListener("keydown", handleKey);
    const scrollY = window.scrollY;
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.left = "";
      document.body.style.right = "";
      window.scrollTo(0, scrollY);
    };
  }, [lightboxIndex, closeLightbox, goPrev, goNext]);

  return (
    <section id="gallery" className={isPage ? "pb-32 pt-8" : "pb-32"}>
      <div className="mx-auto max-w-7xl px-5 md:px-6">
        {!isPage && (
          <div className="mb-16 h-px bg-border/60 sm:mb-[120px]" />
        )}
        <div className="mb-10 flex items-end justify-between">
          <div>
            <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
              {t("title")}
            </h2>
            <p className="max-w-2xl text-lg font-normal text-muted-foreground">
              {t("description")}
            </p>
          </div>
        </div>

        {isPage && (
          <div className="mb-8 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
            <button
              onClick={() => setSelectedStyle(null)}
              className={`shrink-0 cursor-pointer rounded-lg px-3 py-2 text-[14px] font-[500] transition-colors ${
                selectedStyle === null
                  ? "bg-foreground text-background"
                  : "bg-neutral-100 text-muted-foreground hover:bg-neutral-200/60 dark:bg-neutral-800 dark:hover:bg-neutral-700/70"
              }`}
            >
              {tCommon("allTypes")}
            </button>
            {STYLE_TAG_KEYS.map((key) => (
              <button
                key={key}
                onClick={() => setSelectedStyle(key)}
                className={`shrink-0 cursor-pointer rounded-lg px-3 py-2 text-[14px] font-[500] transition-colors ${
                  selectedStyle === key
                    ? "bg-foreground text-background"
                    : "bg-neutral-100 text-muted-foreground hover:bg-neutral-200/60 dark:bg-neutral-800 dark:hover:bg-neutral-700/70"
                }`}
              >
                {t(key)}
              </button>
            ))}
          </div>
        )}

        {isPage ? (
          <div className="columns-2 gap-2 lg:columns-4">
            {visibleItems.map((item, idx) => (
              <div
                key={item.titleKey}
                onClick={() => setLightboxIndex(idx)}
                className="group relative mb-2 cursor-pointer overflow-hidden rounded-2xl bg-neutral-900 break-inside-avoid"
              >
                {item.video ? (
                  <video
                    src={item.video}
                    poster={item.image}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="block h-auto w-full transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={item.image}
                    alt={t(item.titleKey)}
                    className="block h-auto w-full transition-transform duration-500 group-hover:scale-105"
                  />
                )}

                <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-b from-black/50 via-transparent to-black/60 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

                <div className="absolute inset-x-0 top-0 z-20 -translate-y-1 p-4 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                  <h3 className="text-[15px] font-semibold leading-snug tracking-tight text-white">
                    {t(item.titleKey)}
                  </h3>
                </div>

                <div className="absolute inset-x-0 bottom-0 z-20 translate-y-1 px-4 pb-3.5 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-medium text-white/70">@{item.author}</span>
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1 text-[12px] text-white/50">
                        <Eye className="size-3.5" />
                        {item.views}
                      </span>
                      <span className="flex items-center gap-1 text-[12px] text-white/50">
                        <Heart className="size-3.5" />
                        {item.likes}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="relative max-h-[700px] overflow-hidden sm:max-h-[850px]">
              <div className="columns-2 gap-2 lg:columns-4">
                {GALLERY_ITEMS.map((item, idx) => (
                  <div
                    key={item.titleKey}
                    onClick={() => setLightboxIndex(idx)}
                    className="group relative mb-2 cursor-pointer overflow-hidden rounded-2xl bg-neutral-900 break-inside-avoid"
                  >
                    {item.video ? (
                      <video
                        src={item.video}
                        poster={item.image}
                        autoPlay
                        loop
                        muted
                        playsInline
                        className="block h-auto w-full transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={item.image}
                        alt={t(item.titleKey)}
                        className="block h-auto w-full transition-transform duration-500 group-hover:scale-105"
                      />
                    )}

                    <div className="pointer-events-none absolute inset-0 z-10 bg-black/40 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

                    <div className="absolute inset-x-0 top-0 z-20 -translate-y-1 p-5 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                      <h3 className="text-lg font-semibold tracking-tight text-white">
                        {t(item.titleKey)}
                      </h3>
                      <p className="mt-1 text-sm text-white/60">@{item.author}</p>
                    </div>

                    <div className="absolute inset-x-0 bottom-0 z-20 translate-y-1 p-5 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                      <div className="flex gap-4">
                        <span className="flex items-center gap-1.5 text-sm text-white/50">
                          <Eye className="h-4 w-4" />
                          {item.views}
                        </span>
                        <span className="flex items-center gap-1.5 text-sm text-white/50">
                          <Heart className="h-4 w-4" />
                          {item.likes}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="absolute inset-x-0 bottom-0 z-30 h-[28%] bg-gradient-to-t from-background from-10% via-background/80 via-40% to-transparent" />
            </div>
            <div className="mt-10 flex justify-center">
              <Link href="/gallery">
                <Button variant="outline" size="lg" className="group relative h-12 px-12 text-base font-semibold">
                  <span className="transition-transform duration-200 group-hover:-translate-x-3">{t("viewMore")}</span>
                  <ArrowRight className="absolute right-8 h-4 w-4 opacity-0 transition-all duration-200 translate-x-1 group-hover:opacity-100 group-hover:translate-x-0" />
                </Button>
              </Link>
            </div>
          </>
        )}
      </div>

      {/* Lightbox */}
      {lightboxItem &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/85 px-4 pt-16 pb-6 backdrop-blur-sm"
            onClick={closeLightbox}
          >
            <button
              onClick={(e) => { e.stopPropagation(); closeLightbox(); }}
              className="absolute top-4 right-4 z-10 flex size-10 cursor-pointer items-center justify-center rounded-xl bg-white/10 text-white transition-colors hover:bg-white/20"
              aria-label="Close"
            >
              <X className="size-5" />
            </button>
            {visibleItems.length > 1 && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); goPrev(); }}
                  className="absolute left-4 top-1/2 z-10 flex size-12 -translate-y-1/2 cursor-pointer items-center justify-center rounded-xl bg-white/10 text-white transition-colors hover:bg-white/20"
                  aria-label="Previous"
                >
                  <ChevronLeft className="size-6" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); goNext(); }}
                  className="absolute right-4 top-1/2 z-10 flex size-12 -translate-y-1/2 cursor-pointer items-center justify-center rounded-xl bg-white/10 text-white transition-colors hover:bg-white/20"
                  aria-label="Next"
                >
                  <ChevronRight className="size-6" />
                </button>
              </>
            )}
            <div
              className="relative flex min-h-0 w-full max-w-[600px] flex-1 flex-col items-center justify-center gap-5"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex min-h-0 w-full flex-1 items-center justify-center overflow-hidden">
                {lightboxItem.video ? (
                  <video
                    key={lightboxItem.video}
                    src={lightboxItem.video}
                    poster={lightboxItem.image}
                    autoPlay
                    loop
                    controls
                    playsInline
                    className="block h-auto w-auto max-h-full max-w-full rounded-2xl"
                  />
                ) : (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={lightboxItem.image}
                    alt={t(lightboxItem.titleKey)}
                    className="block h-auto w-auto max-h-full max-w-full rounded-2xl"
                  />
                )}
              </div>
              <div className="w-full max-w-[600px] px-2 text-center">
                <h3 className="text-[18px] font-[600] leading-snug text-white">
                  {t(lightboxItem.titleKey)}
                </h3>
                <div className="mt-2 flex items-center justify-center gap-4 text-[13px] text-white/60">
                  <span>@{lightboxItem.author}</span>
                  <span className="flex items-center gap-1">
                    <Eye className="size-3.5" />
                    {lightboxItem.views}
                  </span>
                  <span className="flex items-center gap-1">
                    <Heart className="size-3.5" />
                    {lightboxItem.likes}
                  </span>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </section>
  );
}
