"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  Globe,
  ImageIcon,
  Loader2,
  Lock,
  Plus,
  Save,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  useExtractThumbnails,
  useCaptureFrame,
} from "@/hooks/queries/useVideoEdit";

import type { ThumbnailPanelProps } from "./types";

const COUNT_PRESETS = [4, 6, 8, 12, 16];

export function ThumbnailPanel({ sourceUrl, onSave, onThumbnailsChange }: ThumbnailPanelProps) {
  const t = useTranslations("VideoEdit");
  const extractMutation = useExtractThumbnails();
  const captureMutation = useCaptureFrame();

  const [count, setCount] = useState(8);
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  // 직접 초수 입력
  const [manualTime, setManualTime] = useState("");
  // 저장
  const [isPublicSave, setIsPublicSave] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  // 모달
  const [modalIdx, setModalIdx] = useState<number | null>(null);
  // 일괄 다운로드
  const [isBulkDownloading, setIsBulkDownloading] = useState(false);

  // 모달 키보드 네비게이션
  useEffect(() => {
    if (modalIdx === null) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setModalIdx(null);
      else if (e.key === "ArrowLeft")
        setModalIdx((prev) => (prev !== null && prev > 0 ? prev - 1 : prev));
      else if (e.key === "ArrowRight")
        setModalIdx((prev) =>
          prev !== null && prev < thumbnails.length - 1 ? prev + 1 : prev,
        );
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [modalIdx, thumbnails.length]);

  // 썸네일 변경 시 부모에 전달
  useEffect(() => {
    onThumbnailsChange?.(thumbnails);
  }, [thumbnails, onThumbnailsChange]);

  const isPending = extractMutation.isPending || captureMutation.isPending;

  // 균등 분할 추출
  const handleExtract = useCallback(async () => {
    if (!sourceUrl) return;
    try {
      const result = await extractMutation.mutateAsync({
        source_url: sourceUrl,
        count,
      });
      setThumbnails(result.thumbnails);
      setSelectedIdx(null);
      toast.success(t("thumbnailsExtracted"));
    } catch {
      toast.error(t("thumbnailError"));
    }
  }, [sourceUrl, count, extractMutation, t]);

  // 특정 초수 캡처
  const handleCapture = useCallback(async () => {
    if (!sourceUrl || !manualTime.trim()) return;
    const timestamp = parseFloat(manualTime);
    if (isNaN(timestamp) || timestamp < 0) {
      toast.error(t("thumbnailInvalidTime"));
      return;
    }
    try {
      const result = await captureMutation.mutateAsync({
        source_url: sourceUrl,
        timestamp,
      });
      setThumbnails((prev) => [...prev, result.image_url]);
      setSelectedIdx(thumbnails.length);
      setManualTime("");
      toast.success(t("thumbnailCaptured"));
    } catch {
      toast.error(t("thumbnailError"));
    }
  }, [sourceUrl, manualTime, captureMutation, thumbnails.length, t]);

  // 다운로드 (특정 인덱스)
  const downloadAt = useCallback(
    async (idx: number) => {
      if (!thumbnails[idx]) return;
      try {
        const resp = await fetch(thumbnails[idx]);
        const blob = await resp.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `thumbnail_${idx + 1}.jpg`;
        a.click();
        URL.revokeObjectURL(url);
      } catch {
        toast.error(t("thumbnailError"));
      }
    },
    [thumbnails, t],
  );

  // DB 저장 (특정 인덱스)
  const saveAt = useCallback(
    async (idx: number) => {
      if (!thumbnails[idx]) return;
      setIsSaving(true);
      try {
        await onSave?.(thumbnails[idx], isPublicSave);
        toast.success(t("saved"));
      } catch {
        toast.error(t("saveError"));
      } finally {
        setIsSaving(false);
      }
    },
    [thumbnails, isPublicSave, onSave, t],
  );

  // 개별 삭제
  const handleRemove = useCallback(
    (idx: number) => {
      setThumbnails((prev) => prev.filter((_, i) => i !== idx));
      if (selectedIdx === idx) setSelectedIdx(null);
      else if (selectedIdx !== null && selectedIdx > idx)
        setSelectedIdx(selectedIdx - 1);
      if (modalIdx === idx) setModalIdx(null);
      else if (modalIdx !== null && modalIdx > idx)
        setModalIdx(modalIdx - 1);
    },
    [selectedIdx, modalIdx],
  );

  return (
    <div className="space-y-4">
      <p className="text-xs text-neutral-500">{t("thumbnailDesc")}</p>

      {/* 특정 초수 캡처 */}
      <div className="space-y-2">
        <span className="text-xs font-medium">{t("thumbnailManual")}</span>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Clock className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-neutral-400" />
            <Input
              type="number"
              min={0}
              step={0.1}
              value={manualTime}
              onChange={(e) => setManualTime(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCapture();
              }}
              placeholder={t("thumbnailTimePlaceholder")}
              className="h-8 pl-8 text-xs"
            />
          </div>
          <Button
            size="sm"
            className="gap-1 px-3"
            onClick={handleCapture}
            disabled={!sourceUrl || isPending || !manualTime.trim()}
          >
            {captureMutation.isPending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Plus className="size-3.5" />
            )}
            {t("thumbnailCaptureBtn")}
          </Button>
        </div>
      </div>

      {/* 균등 분할 추출 */}
      <div className="space-y-2">
        <span className="text-xs font-medium">{t("thumbnailCount")}</span>
        <div className="flex flex-wrap gap-1.5">
          {COUNT_PRESETS.map((c) => (
            <button
              key={c}
              type="button"
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                count === c
                  ? "bg-primary text-primary-foreground"
                  : "bg-neutral-200/60 text-neutral-600 hover:bg-neutral-300 dark:bg-neutral-800/60 dark:text-neutral-300 dark:hover:bg-neutral-700"
              }`}
              onClick={() => setCount(c)}
            >
              {c}
            </button>
          ))}
        </div>
        <Button
          variant="outline"
          className="w-full gap-1.5"
          onClick={handleExtract}
          disabled={!sourceUrl || isPending}
        >
          {extractMutation.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <ImageIcon className="size-4" />
          )}
          {t("extractThumbnails")}
        </Button>
      </div>

      {/* 썸네일 그리드 */}
      {thumbnails.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium">{t("selectThumbnail")}</span>
            <Button
              size="sm"
              variant="outline"
              className="h-7 gap-1.5 text-[11px]"
              disabled={isBulkDownloading}
              onClick={async () => {
                setIsBulkDownloading(true);
                try {
                  const filenames = thumbnails.map((_, i) => `thumbnail_${i + 1}.png`);
                  const res = await fetch(
                    `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}/api/video/bulk-download`,
                    {
                      method: "POST",
                      headers: { "Content-Type": "application/json", Authorization: `Bearer ${(await import("@/services/api")).getAccessToken()}` },
                      body: JSON.stringify({ urls: thumbnails, filenames }),
                    },
                  );
                  if (!res.ok) throw new Error("ZIP 다운로드 실패");
                  const blob = await res.blob();
                  const a = document.createElement("a");
                  a.href = URL.createObjectURL(blob);
                  a.download = `thumbnails_${Date.now()}.zip`;
                  a.click();
                  URL.revokeObjectURL(a.href);
                  toast.success(t("bulkDownloadSuccess", { count: thumbnails.length }));
                } catch {
                  toast.error(t("bulkDownloadError"));
                } finally {
                  setIsBulkDownloading(false);
                }
              }}
            >
              {isBulkDownloading ? <Loader2 className="size-3 animate-spin" /> : <Download className="size-3" />}
              {t("downloadAll")} ({thumbnails.length})
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {thumbnails.map((url, idx) => (
              <div key={`${url}-${idx}`} className="group relative">
                <button
                  type="button"
                  onClick={() => setModalIdx(idx)}
                  className={`relative w-full overflow-hidden rounded-lg border-2 transition-all ${
                    selectedIdx === idx
                      ? "border-primary ring-2 ring-primary/30"
                      : "border-transparent hover:border-neutral-400 dark:hover:border-neutral-600"
                  }`}
                >
                  <img
                    src={url}
                    alt={`Frame ${idx + 1}`}
                    className="aspect-video w-full object-cover"
                  />
                  {selectedIdx === idx && (
                    <div className="absolute inset-0 flex items-center justify-center bg-primary/20">
                      <Check className="size-6 text-white drop-shadow-md" />
                    </div>
                  )}
                  <span className="absolute bottom-0.5 right-1 rounded bg-black/60 px-1 py-0.5 text-[10px] text-white">
                    #{idx + 1}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => handleRemove(idx)}
                  className="absolute -right-1 -top-1 hidden rounded-full bg-red-500 p-0.5 text-white shadow-sm group-hover:block"
                >
                  <X className="size-3" />
                </button>
              </div>
            ))}
          </div>

          {/* 선택 저장/다운로드 (그리드 하단) */}
          {selectedIdx !== null && (
            <div className="space-y-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2.5">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsPublicSave(!isPublicSave)}
                  className="flex items-center gap-1 rounded-lg bg-neutral-200/60 px-2 py-1 text-xs transition-colors hover:bg-neutral-300 dark:bg-neutral-800/60 dark:hover:bg-neutral-700"
                >
                  {isPublicSave ? (
                    <Globe className="size-3" />
                  ) : (
                    <Lock className="size-3" />
                  )}
                  {isPublicSave ? t("public") : t("private")}
                </button>
                <Button
                  size="sm"
                  className="flex-1 gap-1.5"
                  onClick={() => saveAt(selectedIdx)}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Save className="size-3.5" />
                  )}
                  {t("saveToGallery")}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  onClick={() => downloadAt(selectedIdx)}
                >
                  <Download className="size-3.5" />
                  {t("downloadThumbnail")}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 크게 보기 모달 */}
      {modalIdx !== null && thumbnails[modalIdx] && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setModalIdx(null)}
        >
          <div
            className="relative flex max-h-[90vh] w-full max-w-3xl flex-col gap-3 rounded-xl bg-white p-4 dark:bg-neutral-900"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 닫기 */}
            <button
              type="button"
              onClick={() => setModalIdx(null)}
              className="absolute right-3 top-3 rounded-full bg-neutral-200 p-1.5 text-neutral-500 transition-colors hover:bg-neutral-300 hover:text-neutral-900 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700 dark:hover:text-white"
            >
              <X className="size-5" />
            </button>

            {/* 이미지 */}
            <div className="flex-1 overflow-hidden rounded-lg">
              <img
                src={thumbnails[modalIdx]}
                alt={`Frame ${modalIdx + 1}`}
                className="h-full w-full object-contain"
              />
            </div>

            {/* 네비게이션 */}
            <div className="flex items-center justify-between">
              <Button
                size="sm"
                variant="ghost"
                className="gap-1 text-neutral-400"
                onClick={() =>
                  setModalIdx((prev) =>
                    prev !== null && prev > 0 ? prev - 1 : prev,
                  )
                }
                disabled={modalIdx === 0}
              >
                <ChevronLeft className="size-4" />
                {t("thumbnailPrev")}
              </Button>
              <span className="text-sm text-neutral-400">
                {modalIdx + 1} / {thumbnails.length}
              </span>
              <Button
                size="sm"
                variant="ghost"
                className="gap-1 text-neutral-400"
                onClick={() =>
                  setModalIdx((prev) =>
                    prev !== null && prev < thumbnails.length - 1
                      ? prev + 1
                      : prev,
                  )
                }
                disabled={modalIdx === thumbnails.length - 1}
              >
                {t("thumbnailNext")}
                <ChevronRight className="size-4" />
              </Button>
            </div>

            {/* 액션 */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsPublicSave(!isPublicSave)}
                className="flex items-center gap-1 rounded-lg bg-neutral-200 px-2.5 py-1.5 text-xs text-neutral-600 transition-colors hover:bg-neutral-300 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
              >
                {isPublicSave ? (
                  <Globe className="size-3" />
                ) : (
                  <Lock className="size-3" />
                )}
                {isPublicSave ? t("public") : t("private")}
              </button>
              <Button
                size="sm"
                className="flex-1 gap-1.5"
                onClick={() => saveAt(modalIdx)}
                disabled={isSaving}
              >
                {isSaving ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Save className="size-3.5" />
                )}
                {t("saveToGallery")}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
                onClick={() => downloadAt(modalIdx)}
              >
                <Download className="size-3.5" />
                {t("downloadThumbnail")}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
                onClick={() => {
                  setSelectedIdx(modalIdx);
                  setModalIdx(null);
                }}
              >
                <Check className="size-3.5" />
                {t("thumbnailSelect")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
