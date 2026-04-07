"use client";

import { useState } from "react";
import { Download, Globe, Lock, Loader2, Save } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/Button";
import type { VideoSourceSelectModalProps } from "./types";

export function VideoSourceSelectModal({
  isOpen,
  videoUrl,
  videoName,
  onSave,
  onDownload,
  onCancel,
  isSaving,
  isDownloading,
}: VideoSourceSelectModalProps) {
  const t = useTranslations("VideoEdit");
  const [isPublic, setIsPublic] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/50">
      <div className="w-full max-w-md rounded-lg border border-neutral-200 bg-white p-6 shadow-lg dark:border-neutral-700 dark:bg-neutral-900">
        {/* 헤더 */}
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
            {t("selectVideoAction")}
          </h2>
        </div>

        {/* 비디오 미리보기 */}
        {videoUrl && (
          <div className="mb-4 overflow-hidden rounded-lg">
            <video
              src={videoUrl}
              className="h-40 w-full object-cover"
              controls
              muted
            />
          </div>
        )}

        {/* 비디오 이름 */}
        {videoName && (
          <p className="mb-4 text-xs text-neutral-600 dark:text-neutral-400">
            {videoName.length > 50
              ? `${videoName.slice(0, 50)}...`
              : videoName}
          </p>
        )}

        {/* 공개/비공개 토글 */}
        <button
          type="button"
          className="mb-4 flex w-full items-center gap-2 rounded-lg border border-neutral-200 px-3 py-2 text-sm transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
          onClick={() => setIsPublic(!isPublic)}
        >
          {isPublic ? (
            <Globe className="size-4 text-blue-500" />
          ) : (
            <Lock className="size-4 text-neutral-500" />
          )}
          <span className="flex-1 text-left text-neutral-700 dark:text-neutral-300">
            {isPublic ? t("public") : t("private")}
          </span>
          <span className="text-xs text-neutral-500">
            {isPublic ? t("publicDescription") : t("privateDescription")}
          </span>
        </button>

        {/* 버튼 그룹 */}
        <div className="space-y-2">
          <Button
            size="sm"
            className="w-full gap-2"
            onClick={() => onSave(isPublic)}
            disabled={isSaving || isDownloading}
          >
            {isSaving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            {t("saveToHistory")}
          </Button>

          <Button
            size="sm"
            variant="outline"
            className="w-full gap-2"
            onClick={onDownload}
            disabled={isSaving || isDownloading}
          >
            {isDownloading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Download className="size-4" />
            )}
            {t("downloadOnly")}
          </Button>

          <Button
            size="sm"
            variant="ghost"
            className="w-full gap-2"
            onClick={onCancel}
            disabled={isSaving || isDownloading}
          >
            {t("cancel")}
          </Button>
        </div>
      </div>
    </div>
  );
}
