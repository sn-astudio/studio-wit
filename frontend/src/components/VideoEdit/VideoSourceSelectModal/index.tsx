"use client";

import { Download, Loader2, Save } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/Button";
import { downloadVideo } from "../utils";
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg border border-zinc-700 bg-zinc-900 p-6 shadow-lg">
        {/* 헤더 */}
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-white">
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
          <p className="mb-4 text-xs text-zinc-400">
            {videoName.length > 50 ? `${videoName.slice(0, 50)}...` : videoName}
          </p>
        )}

        {/* 버튼 그룹 */}
        <div className="space-y-2">
          <Button
            size="sm"
            className="w-full gap-2"
            onClick={onSave}
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
