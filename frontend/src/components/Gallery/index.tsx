import NextImage from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { Eye, Heart, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { GALLERY_ITEMS, STYLE_TAG_KEYS } from "./const";
import { Badge } from "@/components/ui/Badge";
import type { GalleryProps } from "./types";

export function Gallery({ variant = "landing" }: GalleryProps) {
  const t = useTranslations("Gallery");
  const isPage = variant === "page";

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
        )}

        <div className={isPage ? "relative" : "relative max-h-[700px] overflow-hidden sm:max-h-[850px]"}>
          <div className="columns-2 gap-2 lg:columns-4">
            {GALLERY_ITEMS.map((item) => (
              <div
                key={item.titleKey}
                className={`group relative mb-2 cursor-pointer overflow-hidden rounded-2xl bg-neutral-900 ${item.className}`}
              >
                {item.video ? (
                  <video
                    src={item.video}
                    poster={item.image}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <NextImage
                    src={item.image}
                    alt={t(item.titleKey)}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                )}

                {/* 호버 오버레이 */}
                <div className="pointer-events-none absolute inset-0 z-10 bg-black/40 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

                {/* 호버 시 제목 (상단) */}
                <div className="absolute inset-x-0 top-0 z-20 -translate-y-1 p-5 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                  <h3 className="text-lg font-semibold tracking-tight text-white">
                    {t(item.titleKey)}
                  </h3>
                  <p className="mt-1 text-sm text-white/60">@{item.author}</p>
                </div>

                {/* 호버 시 정보 (하단) */}
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
          {!isPage && (
            <div className="absolute inset-x-0 bottom-0 z-30 h-[28%] bg-gradient-to-t from-background from-10% via-background/80 via-40% to-transparent" />
          )}
        </div>
        {!isPage && (
          <div className="mt-10 flex justify-center">
            <Link href="/gallery">
              <Button variant="outline" size="lg" className="group relative h-12 px-12 text-base font-semibold">
                <span className="transition-transform duration-200 group-hover:-translate-x-3">{t("viewMore")}</span>
                <ArrowRight className="absolute right-8 h-4 w-4 opacity-0 transition-all duration-200 translate-x-1 group-hover:opacity-100 group-hover:translate-x-0" />
              </Button>
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
