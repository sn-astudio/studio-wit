"use client";

import { useCallback, useState } from "react";
import { ImageIcon, Loader2, Download, Wand2, Sparkles, X } from "lucide-react";
import { useTranslations } from "next-intl";

import { useRouter } from "@/i18n/routing";
import type { Generation } from "@/types/api";

import type { ImagePreviewProps } from "./types";
import { downloadImage } from "./utils";

export function ImagePreview({
  imageUrl,
  isGenerating = false,
  progress,
  generations = [],
  onSelectGeneration,
  onEdit,
}: ImagePreviewProps) {
  const t = useTranslations("ImageCreate");
  const router = useRouter();
  const [lightboxGen, setLightboxGen] = useState<Generation | null>(null);

  const hasHistory = generations.length > 0;

  return (
    <div className="size-full">
      {/* 로딩 + 히스토리 동시 표시 가능 */}
      {hasHistory || isGenerating ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {/* 생성 중 카드 */}
          {isGenerating && (
            <div className="relative flex aspect-square flex-col items-center justify-center overflow-hidden rounded-2xl bg-neutral-100 dark:bg-neutral-800/60">
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
              <p className="mt-6 text-[13px] font-medium text-foreground">
                {t("generating")}
              </p>
              {/* 프로그레스 바 */}
              <div className="mt-3 w-32 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700">
                {progress != null && progress > 0 ? (
                  <div
                    className="h-1.5 rounded-full bg-neutral-900 transition-all duration-500 ease-out dark:bg-neutral-200"
                    style={{ width: `${Math.min(progress, 100)}%` }}
                  />
                ) : (
                  <div className="h-1.5 w-1/3 animate-pulse rounded-full bg-neutral-400 dark:bg-neutral-500" />
                )}
              </div>
              {progress != null && progress > 0 && (
                <p className="mt-2 text-[13px] tabular-nums font-medium text-muted-foreground">
                  {Math.min(progress, 100)}%
                </p>
              )}
            </div>
          )}

          {/* 생성된 이미지 카드 */}
          {generations.map((gen) => (
            <div
              key={gen.id}
              className="group relative aspect-square cursor-pointer overflow-hidden rounded-xl bg-neutral-100 dark:bg-neutral-800/60"
              onClick={() => setLightboxGen(gen)}
            >
              {gen.result_url && (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={gen.result_url}
                    alt={gen.prompt}
                    className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  {/* 호버 오버레이 */}
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/50 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />

                  {/* 호버 시 상단 프롬프트 */}
                  <div className="pointer-events-none absolute inset-x-0 top-0 px-4 pt-4 pb-10 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                    <p className="line-clamp-2 text-[14px] leading-relaxed text-white/90">
                      {gen.prompt}
                    </p>
                  </div>

                  {/* 호버 시 하단 액션 버튼 */}
                  <div className="pointer-events-none absolute bottom-2.5 right-2.5 flex items-center gap-1.5 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
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
                      className="pointer-events-auto flex size-9 cursor-pointer items-center justify-center rounded-lg bg-black/40 text-white backdrop-blur-sm hover:bg-black/60"
                    >
                      <Wand2 className="size-4" />
                    </button>
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (gen.result_url) await downloadImage(gen.result_url);
                      }}
                      className="pointer-events-auto flex size-9 cursor-pointer items-center justify-center rounded-lg bg-black/40 text-white backdrop-blur-sm hover:bg-black/60"
                    >
                      <Download className="size-4" />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      ) : (
        /* 완전 빈 상태 */
        <div className="flex flex-col items-center pt-[22vh] gap-5">
          <div className="flex size-20 items-center justify-center rounded-2xl bg-neutral-100 dark:bg-neutral-800/80">
            <Sparkles className="size-8 text-neutral-300 dark:text-neutral-600" strokeWidth={1.5} />
          </div>
          <div className="text-center">
            <p className="text-[15px] font-semibold text-muted-foreground">
              {t("emptyPreview")}
            </p>
            <p className="mt-1.5 text-[13px] text-muted-foreground/60">
              {t("emptyPreviewDesc")}
            </p>
          </div>
        </div>
      )}

      {/* 라이트박스 모달 */}
      {lightboxGen?.result_url && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setLightboxGen(null)}
        >
          {/* 닫기 버튼 */}
          <button
            onClick={() => setLightboxGen(null)}
            className="absolute top-4 right-4 flex size-10 cursor-pointer items-center justify-center rounded-xl bg-white/10 text-white transition-colors hover:bg-white/20"
          >
            <X className="size-5" />
          </button>

          {/* 이미지 */}
          <div
            className="relative overflow-hidden rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lightboxGen.result_url}
              alt={lightboxGen.prompt}
              className="block max-h-[85vh] max-w-[90vw] object-contain"
            />

            {/* 상단 프롬프트 */}
            <div className="absolute inset-x-0 top-0 bg-gradient-to-b from-black/70 to-transparent px-5 pt-4 pb-10">
              <p className="line-clamp-6 text-[14px] leading-relaxed text-white/90">
                {lightboxGen.prompt}
              </p>
            </div>

            {/* 하단 액션 버튼 */}
            <div className="absolute bottom-3 right-3 flex items-center gap-1.5">
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
                  className="flex size-9 cursor-pointer items-center justify-center rounded-lg bg-black/40 text-white backdrop-blur-sm transition-colors hover:bg-black/60"
                >
                  <Wand2 className="size-4" />
                </button>
                <button
                  onClick={async () => {
                    if (lightboxGen.result_url)
                      await downloadImage(lightboxGen.result_url);
                  }}
                  className="flex size-9 cursor-pointer items-center justify-center rounded-lg bg-black/40 text-white backdrop-blur-sm transition-colors hover:bg-black/60"
                >
                  <Download className="size-4" />
                </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
