"use client";

import { useRef, useState, useCallback } from "react";
import NextImage from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { TOOLS } from "./const";

export function Features() {
  const t = useTranslations("Features");
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isAtEnd, setIsAtEnd] = useState(false);

  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setIsAtEnd(scrollLeft + clientWidth >= scrollWidth - 20);
  }, []);

  const scroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTo({
      left: direction === "left" ? 0 : scrollRef.current.scrollWidth,
      behavior: "smooth",
    });
  };

  return (
    <section
      id="features"
      className="bg-background pt-16 pb-16 text-foreground sm:pt-[120px] sm:pb-[120px]"
    >
      <div className="mx-auto max-w-7xl px-5 md:px-6">
        <div className="mb-10 flex items-end justify-between gap-6">
          <div>
            <h2 className="mb-4 text-[32px] font-bold tracking-tight">
              {t("title")}
            </h2>
            <p className="max-w-2xl text-lg font-normal text-muted-foreground">
              {t("description")}
            </p>
          </div>
          <div className="hidden gap-2 sm:flex">
            <button
              onClick={() => scroll("left")}
              className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-neutral-300 transition-colors hover:bg-neutral-100 dark:border-white/20 dark:hover:bg-white/[0.05]"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={() => scroll("right")}
              className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-neutral-300 transition-colors hover:bg-neutral-100 dark:border-white/20 dark:hover:bg-white/[0.05]"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="relative sm:overflow-hidden">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="scrollbar-none -mx-5 flex gap-6 overflow-x-auto px-5 md:-mx-6 md:px-6"
        >
          {TOOLS.map((tool, i) => {
            const content = (
              <div className="group relative flex w-[260px] shrink-0 flex-col gap-4 sm:w-[calc((100vw-48px-4*24px)/4.5)] lg:w-[calc((min(100vw,1280px)-48px-4*24px)/4.5)]">
                <div className={`relative aspect-square w-full overflow-hidden rounded-xl ${tool.imageBg || "bg-neutral-100 dark:bg-neutral-800"} [&>video]:transition-transform [&>video]:duration-500 [&>video]:ease-out group-hover:[&>video]:scale-105`}>
                  {tool.video ? (
                    <video
                      src={tool.video}
                      poster={tool.image}
                      autoPlay
                      loop
                      muted
                      playsInline
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <NextImage
                      src={tool.image}
                      alt={t(tool.titleKey)}
                      fill
                      className={`${tool.imageStyle === "contain" ? "object-contain p-6" : "object-cover"} transition-transform duration-500 ease-out group-hover:scale-105`}
                    />
                  )}
                  {/* 호버 딤드 + 아이콘 */}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                    <tool.icon className="h-10 w-10 text-white" strokeWidth={1.5} />
                  </div>
                </div>
                <div>
                  <h3 className="mb-1 text-xl font-semibold tracking-tight">
                    {t(tool.titleKey)}
                  </h3>
                  <p className="text-base font-normal leading-relaxed text-neutral-500 dark:text-muted-foreground/70">
                    {t(tool.descriptionKey)}
                  </p>
                </div>
              </div>
            );

            return tool.href ? (
              <Link key={tool.titleKey} href={tool.href}>
                {content}
              </Link>
            ) : (
              <div key={tool.titleKey}>{content}</div>
            );
          })}
        </div>
        <div className={`pointer-events-none absolute inset-y-0 -right-1 hidden w-[10%] bg-gradient-to-l from-background via-background/40 to-transparent transition-opacity duration-300 sm:block ${isAtEnd ? "opacity-0" : "opacity-100"}`} />
        </div>
      </div>
    </section>
  );
}
