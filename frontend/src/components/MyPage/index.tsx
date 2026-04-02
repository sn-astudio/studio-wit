"use client";

import { useEffect, useRef, useState } from "react";
import NextImage from "next/image";
import { useSession, signIn } from "next-auth/react";
import { useTranslations } from "next-intl";
import { ImageIcon, Film, Layers, Loader2, LogIn } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAuthStore } from "@/stores/auth";
import { useGenerationHistory } from "@/hooks/queries/useGeneration";
import { GenerationCard } from "./GenerationCard";
import { TYPE_FILTERS, STATUS_FILTERS } from "./const";
import type { TypeFilter, StatusFilter } from "./types";

const TYPE_FILTER_ICONS: Record<TypeFilter, React.ReactNode> = {
  all: <Layers className="size-3.5" />,
  image: <ImageIcon className="size-3.5" />,
  video: <Film className="size-3.5" />,
};

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

  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

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

  const allGenerations =
    data?.pages.flatMap((page) => page.generations) ?? [];

  if (!session) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="text-center">
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
            <LogIn className="size-7 text-zinc-400" />
          </div>
          <h2 className="text-lg font-semibold">{t("loginRequired")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("loginRequiredDesc")}
          </p>
          <Button
            className="mt-4"
            onClick={() =>
              signIn("google", { callbackUrl: window.location.href })
            }
          >
            {t("signIn")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
      {/* Profile section */}
      <div className="mb-8 flex items-center gap-4">
        {session.user?.image ? (
          <NextImage
            src={session.user.image}
            alt={session.user.name ?? ""}
            width={56}
            height={56}
            className="rounded-full"
          />
        ) : (
          <div className="flex size-14 items-center justify-center rounded-full bg-zinc-200 dark:bg-zinc-700">
            <span className="text-xl font-bold text-zinc-500">
              {session.user?.name?.charAt(0) ?? "?"}
            </span>
          </div>
        )}
        <div>
          <h1 className="text-xl font-bold">{session.user?.name}</h1>
          <p className="text-sm text-muted-foreground">
            {session.user?.email}
          </p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">{t("myWorks")}</h2>
          {!isLoading && (
            <span className="text-sm text-muted-foreground">
              {t("totalCount", { count: allGenerations.length })}
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Type filters */}
          <div className="flex rounded-lg border border-zinc-200 dark:border-zinc-700">
            {TYPE_FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setTypeFilter(f)}
                className={`flex cursor-pointer items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors first:rounded-l-lg last:rounded-r-lg ${
                  typeFilter === f
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-zinc-100 dark:hover:bg-zinc-800"
                }`}
              >
                {TYPE_FILTER_ICONS[f]}
                {t(TYPE_FILTER_KEYS[f])}
              </button>
            ))}
          </div>
          {/* Status filters */}
          <div className="flex rounded-lg border border-zinc-200 dark:border-zinc-700">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                className={`cursor-pointer px-3 py-1.5 text-xs font-medium transition-colors first:rounded-l-lg last:rounded-r-lg ${
                  statusFilter === f
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-zinc-100 dark:hover:bg-zinc-800"
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
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && allGenerations.length === 0 && (
        <div className="flex min-h-[40vh] items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
              <Layers className="size-7 text-zinc-400" />
            </div>
            <h3 className="text-base font-semibold">
              {t("noGenerations")}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("noGenerationsDesc")}
            </p>
          </div>
        </div>
      )}

      {/* Grid */}
      {!isLoading && allGenerations.length > 0 && (
        <>
          <div className="columns-2 gap-3 sm:columns-3 lg:columns-4">
            {allGenerations.map((gen) => (
              <div key={gen.id} className="mb-3 break-inside-avoid">
                <GenerationCard gen={gen} />
              </div>
            ))}
          </div>

          {/* Infinite scroll sentinel */}
          <div ref={observerRef} className="h-1" />
          {isFetchingNextPage && (
            <div className="flex justify-center py-6">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          )}
        </>
      )}
    </div>
  );
}
