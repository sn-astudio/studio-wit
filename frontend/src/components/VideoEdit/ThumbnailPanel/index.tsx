"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  Camera,
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
  const [manualTime, setManualTime] = useState("");
  const [isPublicSave, setIsPublicSave] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [modalIdx, setModalIdx] = useState<number | null>(null);
  const [isBulkDownloading, setIsBulkDownloading] = useState(false);

  useEffect(() => {
    if (modalIdx === null) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setModalIdx(null);
      else if (e.key === "ArrowLeft") setModalIdx((prev) => (prev !== null && prev > 0 ? prev - 1 : prev));
      else if (e.key === "ArrowRight") setModalIdx((prev) => (prev !== null && prev < thumbnails.length - 1 ? prev + 1 : prev));
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [modalIdx, thumbnails.length]);

  useEffect(() => {
    onThumbnailsChange?.(thumbnails);
  }, [thumbnails, onThumbnailsChange]);

  const isPending = extractMutation.isPending || captureMutation.isPending;

  const handleExtract = useCallback(async () => {
    if (!sourceUrl) return;
    try {
      const result = await extractMutation.mutateAsync({ source_url: sourceUrl, count });
      setThumbnails(result.thumbnails);
      setSelectedIdx(null);
      toast.success(t("thumbnailsExtracted"));
    } catch {
      toast.error(t("thumbnailError"));
    }
  }, [sourceUrl, count, extractMutation, t]);

  const handleCapture = useCallback(async () => {
    if (!sourceUrl || !manualTime.trim()) return;
    const timestamp = parseFloat(manualTime);
    if (isNaN(timestamp) || timestamp < 0) {
      toast.error(t("thumbnailInvalidTime"));
      return;
    }
    try {
      const result = await captureMutation.mutateAsync({ source_url: sourceUrl, timestamp });
      setThumbnails((prev) => [...prev, result.image_url]);
      setSelectedIdx(thumbnails.length);
      setManualTime("");
      toast.success(t("thumbnailCaptured"));
    } catch {
      toast.error(t("thumbnailError"));
    }
  }, [sourceUrl, manualTime, captureMutation, thumbnails.length, t]);

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

  const handleRemove = useCallback(
    (idx: number) => {
      setThumbnails((prev) => prev.filter((_, i) => i !== idx));
      if (selectedIdx === idx) setSelectedIdx(null);
      else if (selectedIdx !== null && selectedIdx > idx) setSelectedIdx(selectedIdx - 1);
      if (modalIdx === idx) setModalIdx(null);
      else if (modalIdx !== null && modalIdx > idx) setModalIdx(modalIdx - 1);
    },
    [selectedIdx, modalIdx],
  );

  return (
    <div className="flex flex-1 flex-col gap-5">
      {/* 특정 초수 캡처 */}
      <div className="space-y-2.5">
        <p className="text-[13px] font-[600] text-foreground">{t("thumbnailManual")}</p>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Clock className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground/40" />
            <input
              type="number"
              min={0}
              step={0.1}
              value={manualTime}
              onChange={(e) => setManualTime(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleCapture(); }}
              placeholder={t("thumbnailTimePlaceholder")}
              className="h-9 w-full rounded-lg bg-neutral-50 pl-9 pr-3 text-[13px] text-foreground placeholder:text-muted-foreground/40 focus:outline-none dark:bg-neutral-800/60"
            />
          </div>
          <button
            onClick={handleCapture}
            disabled={!sourceUrl || isPending || !manualTime.trim()}
            className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-foreground px-3.5 py-2 text-[12px] font-[500] text-background transition-all hover:opacity-90 active:opacity-80 disabled:pointer-events-none disabled:opacity-30"
          >
            {captureMutation.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Camera className="size-3.5" />}
            {t("thumbnailCaptureBtn")}
          </button>
        </div>
      </div>

      {/* 균등 분할 추출 */}
      <div className="space-y-2.5">
        <p className="text-[13px] font-[600] text-foreground">{t("thumbnailCount")}</p>
        <div className="flex flex-wrap gap-1.5">
          {COUNT_PRESETS.map((c) => (
            <button
              key={c}
              onClick={() => setCount(c)}
              className={`cursor-pointer rounded-lg px-3.5 py-2 text-[12px] font-[500] transition-all active:opacity-80 ${
                count === c
                  ? "bg-foreground text-background"
                  : "bg-neutral-50 text-muted-foreground hover:bg-neutral-100 hover:text-foreground dark:bg-neutral-800/60 dark:hover:bg-neutral-800 dark:hover:text-white"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
        <button
          onClick={handleExtract}
          disabled={!sourceUrl || isPending}
          className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-neutral-50 py-2.5 text-[12px] font-[500] text-muted-foreground transition-all hover:bg-neutral-100 hover:text-foreground active:opacity-80 disabled:pointer-events-none disabled:opacity-30 dark:bg-neutral-800/60 dark:hover:bg-neutral-800 dark:hover:text-white"
        >
          {extractMutation.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <ImageIcon className="size-3.5" />}
          {t("extractThumbnails")}
        </button>
      </div>

      {/* 썸네일 그리드 */}
      {thumbnails.length > 0 && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-[600] text-foreground">{t("selectThumbnail")}</span>
            <button
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
              className="flex cursor-pointer items-center gap-1 text-[11px] font-[500] text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
            >
              {isBulkDownloading ? <Loader2 className="size-3 animate-spin" /> : <Download className="size-3" />}
              {t("downloadAll")} ({thumbnails.length})
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {thumbnails.map((url, idx) => (
              <div key={`${url}-${idx}`} className="group relative">
                <button
                  type="button"
                  onClick={() => setModalIdx(idx)}
                  className={`relative w-full cursor-pointer overflow-hidden rounded-xl transition-all ${
                    selectedIdx === idx
                      ? "ring-2 ring-foreground ring-offset-2"
                      : "hover:opacity-80"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt={`Frame ${idx + 1}`} className="aspect-video w-full object-cover" />
                  {selectedIdx === idx && (
                    <div className="absolute inset-0 flex items-center justify-center bg-foreground/20">
                      <Check className="size-6 text-white drop-shadow-md" />
                    </div>
                  )}
                  <span className="absolute bottom-1 right-1 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-[500] text-white">
                    #{idx + 1}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => handleRemove(idx)}
                  className="absolute -right-1 -top-1 hidden size-5 cursor-pointer items-center justify-center rounded-full bg-red-500 text-white shadow-sm group-hover:flex"
                >
                  <X className="size-3" />
                </button>
              </div>
            ))}
          </div>

          {/* 선택 저장/다운로드 */}
          {selectedIdx !== null && (
            <div className="sticky bottom-0 z-10 -mx-5 bg-white px-5 pt-4 pb-4 dark:bg-neutral-950">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsPublicSave(!isPublicSave)}
                  className="flex items-center gap-1 rounded-lg bg-neutral-50 px-2.5 py-2 text-[12px] font-[500] text-muted-foreground transition-all hover:bg-neutral-100 dark:bg-neutral-800/60 dark:hover:bg-neutral-800"
                >
                  {isPublicSave ? <Globe className="size-3.5" /> : <Lock className="size-3.5" />}
                  {isPublicSave ? t("public") : t("private")}
                </button>
                <button
                  onClick={() => saveAt(selectedIdx)}
                  disabled={isSaving}
                  className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-primary py-2.5 text-[13px] font-[600] text-white transition-all hover:opacity-90 active:opacity-80 disabled:pointer-events-none disabled:opacity-30"
                >
                  {isSaving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
                  {t("saveToGallery")}
                </button>
                <button
                  onClick={() => downloadAt(selectedIdx)}
                  className="flex cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-neutral-50 px-3.5 py-2.5 text-[12px] font-[500] text-muted-foreground transition-all hover:bg-neutral-100 hover:text-foreground active:opacity-80 dark:bg-neutral-800/60 dark:hover:bg-neutral-800 dark:hover:text-white"
                >
                  <Download className="size-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 크게 보기 모달 */}
      {modalIdx !== null && thumbnails[modalIdx] && typeof document !== "undefined" && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => setModalIdx(null)}
        >
          <div
            className="relative flex max-h-[90vh] w-full max-w-3xl flex-col gap-4 rounded-2xl bg-white p-5 dark:bg-neutral-950"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setModalIdx(null)}
              className="absolute right-4 top-4 flex size-8 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-neutral-100 hover:text-foreground dark:hover:bg-neutral-800"
            >
              <X className="size-4" />
            </button>

            <div className="flex-1 overflow-hidden rounded-xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={thumbnails[modalIdx]} alt={`Frame ${modalIdx + 1}`} className="h-full w-full object-contain" />
            </div>

            <div className="flex items-center justify-between">
              <button
                onClick={() => setModalIdx((prev) => (prev !== null && prev > 0 ? prev - 1 : prev))}
                disabled={modalIdx === 0}
                className="flex cursor-pointer items-center gap-1 text-[12px] text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
              >
                <ChevronLeft className="size-4" />
                {t("thumbnailPrev")}
              </button>
              <span className="text-[12px] tabular-nums text-muted-foreground">
                {modalIdx + 1} / {thumbnails.length}
              </span>
              <button
                onClick={() => setModalIdx((prev) => (prev !== null && prev < thumbnails.length - 1 ? prev + 1 : prev))}
                disabled={modalIdx === thumbnails.length - 1}
                className="flex cursor-pointer items-center gap-1 text-[12px] text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
              >
                {t("thumbnailNext")}
                <ChevronRight className="size-4" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsPublicSave(!isPublicSave)}
                className="flex items-center gap-1 rounded-lg bg-neutral-50 px-2.5 py-2 text-[12px] font-[500] text-muted-foreground transition-all hover:bg-neutral-100 dark:bg-neutral-800/60 dark:hover:bg-neutral-800"
              >
                {isPublicSave ? <Globe className="size-3.5" /> : <Lock className="size-3.5" />}
                {isPublicSave ? t("public") : t("private")}
              </button>
              <button
                onClick={() => saveAt(modalIdx)}
                disabled={isSaving}
                className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-primary py-2.5 text-[13px] font-[600] text-white transition-all hover:opacity-90 active:opacity-80 disabled:pointer-events-none disabled:opacity-30"
              >
                {isSaving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
                {t("saveToGallery")}
              </button>
              <button
                onClick={() => downloadAt(modalIdx)}
                className="flex cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-neutral-50 px-3.5 py-2.5 text-[12px] font-[500] text-muted-foreground transition-all hover:bg-neutral-100 hover:text-foreground active:opacity-80 dark:bg-neutral-800/60 dark:hover:bg-neutral-800 dark:hover:text-white"
              >
                <Download className="size-3.5" />
              </button>
              <button
                onClick={() => { setSelectedIdx(modalIdx); setModalIdx(null); }}
                className="flex cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-neutral-50 px-3.5 py-2.5 text-[12px] font-[500] text-muted-foreground transition-all hover:bg-neutral-100 hover:text-foreground active:opacity-80 dark:bg-neutral-800/60 dark:hover:bg-neutral-800 dark:hover:text-white"
              >
                <Check className="size-3.5" />
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
