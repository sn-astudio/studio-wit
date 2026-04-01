"use client";

import { useEffect, useRef } from "react";
import { Badge } from "@/components/ui/Badge";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { useGalleryList } from "@/hooks/queries/useGallery";
import { STYLE_TAG_KEYS } from "./const";
import { GalleryCard } from "./GalleryCard";

export function Gallery() {
  const t = useTranslations("Gallery");
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useGalleryList({ sort: "recent", limit: 20 });

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

  const allItems = data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <section id="gallery" className="border-t border-border/60 pt-24 pb-32">
      <div className="mx-auto max-w-7xl px-5 md:px-6">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="mb-2 text-3xl font-bold tracking-tight sm:text-4xl">
              {t("title")}
            </h2>
            <p className="text-muted-foreground">{t("description")}</p>
          </div>
        </div>

        <div className="mb-8 flex flex-wrap gap-2">
          {STYLE_TAG_KEYS.map((key) => (
            <Badge
              key={key}
              variant="outline"
              className="cursor-pointer px-3 py-1 transition-colors hover:bg-secondary"
            >
              {t(key)}
            </Badge>
          ))}
        </div>

        {isLoading && (
          <div className="flex min-h-[30vh] items-center justify-center">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {!isLoading && allItems.length === 0 && (
          <div className="flex min-h-[20vh] items-center justify-center">
            <p className="text-sm text-muted-foreground">
              {t("noPublicWorks")}
            </p>
          </div>
        )}

        {!isLoading && allItems.length > 0 && (
          <>
            <div className="columns-2 gap-3 sm:columns-3 lg:columns-4">
              {allItems.map((item) => (
                <div key={item.id} className="mb-3 break-inside-avoid">
                  <GalleryCard item={item} />
                </div>
              ))}
            </div>

            <div ref={observerRef} className="h-1" />
            {isFetchingNextPage && (
              <div className="flex justify-center py-6">
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
