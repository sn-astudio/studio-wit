"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ImageIcon, Upload } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { useAuthStore } from "@/stores/auth";
import { useGenerationHistory } from "@/hooks/queries/useGeneration";
import { useModels } from "@/hooks/queries/useModels";
import { cn } from "@/lib/utils";

import type { ImageSourceSelectorProps } from "./types";

export function ImageSourceSelector({
  onSourceSelected,
}: ImageSourceSelectorProps) {
  const t = useTranslations("ImageEdit");
  const token = useAuthStore((s) => s.token);

  const [modelFilter, setModelFilter] = useState<string | null>(null);

  const { data: modelsData } = useModels("image");
  const models = modelsData?.models ?? [];

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

  const filtered = modelFilter
    ? generations.filter((g) => g.model_id === modelFilter)
    : generations;

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

  // 파일 업로드
  const fileInputRef = useRef<HTMLInputElement>(null);
  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const url = URL.createObjectURL(file);
      onSourceSelected({ url });
      e.target.value = "";
    },
    [onSourceSelected],
  );

  return (
    <div className="border-t border-zinc-800/80">
      {/* 업로드 */}
      <div className="flex items-center gap-2 px-4 py-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          className="cursor-pointer gap-1.5"
        >
          <Upload className="size-4" />
          <span className="text-xs">{t("uploadImage")}</span>
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />

        <div className="mx-1 h-5 w-px bg-zinc-700" />

        <span className="text-[11px] text-zinc-500">
          {t("orSelectFromHistory")}
        </span>
      </div>

      {/* 모델 필터 */}
      <div className="flex items-center gap-1 px-4 pb-2">
        <button
          onClick={() => setModelFilter(null)}
          className={cn(
            "cursor-pointer rounded-md px-2 py-0.5 text-[10px] transition-colors",
            !modelFilter
              ? "bg-primary/20 text-primary"
              : "text-zinc-500 hover:text-zinc-300",
          )}
        >
          {t("filterAll")}
        </button>
        {models.map((m) => (
          <button
            key={m.id}
            onClick={() => setModelFilter(m.id)}
            className={cn(
              "cursor-pointer rounded-md px-2 py-0.5 text-[10px] transition-colors",
              modelFilter === m.id
                ? "bg-primary/20 text-primary"
                : "text-zinc-500 hover:text-zinc-300",
            )}
          >
            {m.name}
          </button>
        ))}
      </div>

      {/* 히스토리 그리드 */}
      <div className="max-h-[35vh] overflow-y-auto px-4 pb-3">
        {filtered.length === 0 ? (
          <div className="flex w-full items-center justify-center py-6">
            <div className="text-center">
              <ImageIcon className="mx-auto size-6 text-zinc-800" />
              <p className="mt-1.5 text-xs text-zinc-600">
                {t("noHistory")}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
            {filtered.map((gen) => (
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
                className="group relative aspect-square cursor-pointer overflow-hidden rounded-lg border border-zinc-800/60 bg-zinc-900/60 transition-colors hover:border-zinc-600"
              >
                {gen.result_url && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={gen.result_url}
                    alt={gen.prompt}
                    className="absolute inset-0 size-full object-cover"
                  />
                )}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-1.5 pt-4 opacity-0 transition-opacity group-hover:opacity-100">
                  <p className="truncate text-[10px] text-zinc-200">
                    {gen.prompt}
                  </p>
                  <span className="text-[9px] text-zinc-400">
                    {gen.model_id}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
        <div ref={sentinelRef} className="h-1" />
      </div>
    </div>
  );
}
