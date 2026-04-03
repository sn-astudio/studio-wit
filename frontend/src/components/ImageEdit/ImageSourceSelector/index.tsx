"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ImageIcon } from "lucide-react";

import { useAuthStore } from "@/stores/auth";
import { useGenerationHistory } from "@/hooks/queries/useGeneration";

import type { ImageSourceSelectorProps } from "./types";

export function ImageSourceSelector({
  onSourceSelected,
}: ImageSourceSelectorProps) {
  const t = useTranslations("ImageEdit");
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

  const apiGenerations =
    data?.pages.flatMap((page) => page.generations) ?? [];

  // Mock 생성 이미지도 표시
  const [mockGenerations, setMockGenerations] = useState<typeof apiGenerations>([]);
  useEffect(() => {
    try {
      const saved = localStorage.getItem("mock-generations");
      if (saved) setMockGenerations(JSON.parse(saved));
    } catch {
      // ignore
    }
  }, []);

  const generations = [...mockGenerations, ...apiGenerations];


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

  return (
    <div>
      {/* 업로드 + 라벨 */}
      <div className="pb-3">
        <span className="text-[13px] text-muted-foreground">
          {t("orSelectFromHistory")}
        </span>
      </div>

      {/* 히스토리 그리드 */}
      <div>
        {generations.length === 0 ? (
          <div className="flex w-full items-center justify-center py-10">
            <div className="text-center">
              <ImageIcon className="mx-auto size-8 text-neutral-300 dark:text-neutral-600" />
              <p className="mt-2 text-[13px] text-muted-foreground/60">
                {t("noHistory")}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            {generations.map((gen) => {
              const ratio = gen.aspect_ratio?.replace(":", "/") ?? "1/1";
              return (
              <button
                key={gen.id}
                onClick={() => {
                  if (gen.result_url) {
                    onSourceSelected({
                      url: gen.result_url,
                      generationId: gen.id,
                    });
                  }
                }}
                className="group relative aspect-square cursor-pointer overflow-hidden rounded-xl bg-neutral-100 sm:aspect-auto sm:h-[280px] sm:max-w-[320px] sm:flex-grow dark:bg-neutral-800/60"
                style={{ aspectRatio: ratio }}
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
                    {/* 프롬프트 */}
                    <div className="pointer-events-none absolute inset-x-0 top-0 px-3 pt-3 pb-8 opacity-100 sm:px-4 sm:pt-4 sm:pb-10 sm:opacity-0 sm:transition-opacity sm:duration-200 sm:group-hover:opacity-100">
                      <p className="line-clamp-1 text-[13px] font-[500] leading-relaxed text-white/90 sm:line-clamp-2 sm:text-[15px]">
                        {gen.prompt}
                      </p>
                    </div>
                  </>
                )}
              </button>
              );
            })}
          </div>
        )}
        <div ref={sentinelRef} className="h-1" />
      </div>
    </div>
  );
}
