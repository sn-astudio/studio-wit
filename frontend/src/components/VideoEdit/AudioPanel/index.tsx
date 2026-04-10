"use client";

import { useCallback, useState } from "react";
import {
  Download,
  Globe,
  Loader2,
  Lock,
  Mic,
  MicOff,
  Plus,
  Replace,
  Save,
  Volume2,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { useNotifyOnComplete } from "@/hooks/useNotifyOnComplete";
import {
  useExtractAudio,
  useRemoveAudio,
  useReplaceAudio,
  useAdjustVolume,
  useMixAudio,
  useUploadVideo,
} from "@/hooks/queries/useVideoEdit";

import type { AudioPanelProps } from "./types";

export function AudioPanel({ sourceUrl, onAudioApplied, onSave, onDirty }: AudioPanelProps) {
  const t = useTranslations("VideoEdit");
  const notify = useNotifyOnComplete();

  const [volume, setVolume] = useState(1.0);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [originalVolume, setOriginalVolume] = useState(1.0);
  const [mixVolume, setMixVolume] = useState(0.5);
  const [pendingResult, setPendingResult] = useState<string | null>(null);
  const [isPublicSave, setIsPublicSave] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const extractMutation = useExtractAudio();
  const removeMutation = useRemoveAudio();
  const replaceMutation = useReplaceAudio();
  const volumeMutation = useAdjustVolume();
  const mixMutation = useMixAudio();
  const uploadMutation = useUploadVideo();

  const isPending =
    extractMutation.isPending || removeMutation.isPending || replaceMutation.isPending ||
    volumeMutation.isPending || mixMutation.isPending || uploadMutation.isPending;

  const uploadAudioFile = useCallback(async (): Promise<string | null> => {
    if (!audioFile) return null;
    try {
      const result = await uploadMutation.mutateAsync(audioFile);
      return result.url;
    } catch {
      toast.error(t("audioUploadError"));
      return null;
    }
  }, [audioFile, uploadMutation, t]);

  const handleExtract = useCallback(async () => {
    if (!sourceUrl) return;
    try {
      const result = await extractMutation.mutateAsync({ source_url: sourceUrl });
      const res = await fetch(result.audio_url);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "audio.mp3";
      a.click();
      URL.revokeObjectURL(url);
      toast.success(t("audioExtracted"));
      notify(t("audioExtracted"));
    } catch {
      toast.error(t("audioError"));
    }
  }, [sourceUrl, extractMutation, t, notify]);

  const handleRemove = useCallback(async () => {
    if (!sourceUrl) return;
    try {
      const result = await removeMutation.mutateAsync({ source_url: sourceUrl });
      onAudioApplied?.(result.result_url);
      toast.success(t("audioRemoved"));
      notify(t("audioRemoved"));
    } catch {
      toast.error(t("audioError"));
    }
  }, [sourceUrl, removeMutation, onAudioApplied, t, notify]);

  const handleReplace = useCallback(async () => {
    if (!sourceUrl || !audioFile) return;
    const audioUrl = await uploadAudioFile();
    if (!audioUrl) return;
    try {
      const result = await replaceMutation.mutateAsync({ source_url: sourceUrl, audio_url: audioUrl });
      setPendingResult(result.result_url);
      onAudioApplied?.(result.result_url);
      toast.success(t("audioReplaced"));
      notify(t("audioReplaced"));
    } catch {
      toast.error(t("audioError"));
    }
  }, [sourceUrl, audioFile, uploadAudioFile, replaceMutation, onAudioApplied, t, notify]);

  const handleVolume = useCallback(async () => {
    if (!sourceUrl) return;
    try {
      const result = await volumeMutation.mutateAsync({ source_url: sourceUrl, volume });
      onAudioApplied?.(result.result_url);
      toast.success(t("audioVolumeApplied"));
      notify(t("audioVolumeApplied"));
    } catch {
      toast.error(t("audioError"));
    }
  }, [sourceUrl, volume, volumeMutation, onAudioApplied, t, notify]);

  const handleMix = useCallback(async () => {
    if (!sourceUrl || !audioFile) return;
    const audioUrl = await uploadAudioFile();
    if (!audioUrl) return;
    try {
      const result = await mixMutation.mutateAsync({
        source_url: sourceUrl,
        audio_url: audioUrl,
        original_volume: originalVolume,
        mix_volume: mixVolume,
      });
      setPendingResult(result.result_url);
      onAudioApplied?.(result.result_url);
      toast.success(t("audioMixed"));
      notify(t("audioMixed"));
    } catch {
      toast.error(t("audioError"));
    }
  }, [sourceUrl, audioFile, uploadAudioFile, originalVolume, mixVolume, mixMutation, onAudioApplied, t, notify]);

  const handleSave = useCallback(async () => {
    if (!pendingResult) return;
    setIsSaving(true);
    try {
      await onSave?.(pendingResult, isPublicSave);
      toast.success(t("saved"));
      setPendingResult(null);
    } catch {
      toast.error(t("saveError"));
    } finally {
      setIsSaving(false);
    }
  }, [pendingResult, isPublicSave, onSave, t]);

  const handleDownload = useCallback(async () => {
    if (!pendingResult) return;
    const res = await fetch(pendingResult);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "audio_edited.mp4";
    a.click();
    URL.revokeObjectURL(url);
  }, [pendingResult]);

  return (
    <div className="flex flex-1 flex-col gap-5">
      {/* 빠른 작업 */}
      <div className="space-y-2.5">
        <p className="text-[13px] font-[600] text-foreground">{t("audioQuickActions")}</p>
        <p className="text-[12px] text-muted-foreground/60">{t("audioQuickActionsDesc")}</p>
        <div className="flex gap-1.5">
          <button
            onClick={handleExtract}
            disabled={!sourceUrl || isPending}
            className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg py-2 text-[12px] font-[500] transition-all active:opacity-80 disabled:pointer-events-none disabled:opacity-30 bg-neutral-50 text-muted-foreground hover:bg-neutral-100 hover:text-foreground dark:bg-neutral-800/60 dark:hover:bg-neutral-800 dark:hover:text-white"
          >
            {extractMutation.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
            {t("audioExtractBtn")}
          </button>
          <button
            onClick={handleRemove}
            disabled={!sourceUrl || isPending}
            className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg py-2 text-[12px] font-[500] transition-all active:opacity-80 disabled:pointer-events-none disabled:opacity-30 bg-neutral-50 text-muted-foreground hover:bg-neutral-100 hover:text-foreground dark:bg-neutral-800/60 dark:hover:bg-neutral-800 dark:hover:text-white"
          >
            {removeMutation.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <MicOff className="size-3.5" />}
            {t("audioRemoveBtn")}
          </button>
        </div>
      </div>

      {/* 볼륨 조절 */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-[600] text-foreground">{t("audioVolume")}</span>
          <span className="text-[12px] font-[500] tabular-nums text-muted-foreground">{(volume * 100).toFixed(0)}%</span>
        </div>
        <input
          type="range"
          min={0}
          max={3}
          step={0.1}
          value={volume}
          onChange={(e) => { setVolume(Number(e.target.value)); onDirty?.(); }}
          className="filter-slider h-1.5 w-full cursor-pointer appearance-none rounded-full bg-neutral-300 accent-white dark:bg-neutral-700"
          style={{ "--slider-pct": `${(volume / 3) * 100}%` } as React.CSSProperties}
        />
        <button
          onClick={handleVolume}
          disabled={!sourceUrl || isPending}
          className="mt-3 flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-neutral-50 py-2.5 text-[12px] font-[500] text-muted-foreground transition-all hover:bg-neutral-100 hover:text-foreground active:opacity-80 disabled:pointer-events-none disabled:opacity-30 dark:bg-neutral-800/60 dark:hover:bg-neutral-800 dark:hover:text-white"
        >
          {volumeMutation.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Volume2 className="size-3.5" />}
          {t("audioVolumeBtn")}
        </button>
      </div>

      {/* 오디오 파일 선택 */}
      <div className="space-y-2.5">
        <p className="text-[13px] font-[600] text-foreground">{t("audioFile")}</p>
        <label className="flex cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-neutral-50 py-2.5 text-[12px] font-[500] text-muted-foreground transition-all hover:bg-neutral-100 hover:text-foreground active:opacity-80 dark:bg-neutral-800/60 dark:hover:bg-neutral-800 dark:hover:text-white">
          <Plus className="size-3.5" />
          {audioFile ? audioFile.name : t("audioSelectFile")}
          <input
            type="file"
            accept="audio/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) { setAudioFile(file); onDirty?.(); }
              e.target.value = "";
            }}
          />
        </label>
      </div>

      {/* 오디오 교체 */}
      <div className="space-y-2.5">
        <p className="text-[13px] font-[600] text-foreground">{t("audioReplace")}</p>
        <p className="text-[12px] text-muted-foreground/60">{t("audioReplaceDesc")}</p>
      <button
        onClick={handleReplace}
        disabled={!sourceUrl || !audioFile || isPending}
        className="mt-1 flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-neutral-50 py-2.5 text-[12px] font-[500] text-muted-foreground transition-all hover:bg-neutral-100 hover:text-foreground active:opacity-80 disabled:pointer-events-none disabled:opacity-30 dark:bg-neutral-800/60 dark:hover:bg-neutral-800 dark:hover:text-white"
      >
        {replaceMutation.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Replace className="size-3.5" />}
        {t("audioReplaceBtn")}
      </button>
      </div>

      {/* BGM 믹싱 */}
      <div className="space-y-2.5">
        <p className="text-[13px] font-[600] text-foreground">{t("audioMix")}</p>
        <p className="text-[12px] text-muted-foreground/60">{t("audioMixDesc")}</p>
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[12px] text-muted-foreground">{t("audioOriginalVol")}</span>
            <span className="text-[12px] font-[500] tabular-nums text-muted-foreground">{(originalVolume * 100).toFixed(0)}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={3}
            step={0.1}
            value={originalVolume}
            onChange={(e) => { setOriginalVolume(Number(e.target.value)); onDirty?.(); }}
            className="filter-slider h-1.5 w-full cursor-pointer appearance-none rounded-full bg-neutral-300 accent-white dark:bg-neutral-700"
            style={{ "--slider-pct": `${(originalVolume / 3) * 100}%` } as React.CSSProperties}
          />
        </div>
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[12px] text-muted-foreground">{t("audioMixVol")}</span>
            <span className="text-[12px] font-[500] tabular-nums text-muted-foreground">{(mixVolume * 100).toFixed(0)}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={3}
            step={0.1}
            value={mixVolume}
            onChange={(e) => { setMixVolume(Number(e.target.value)); onDirty?.(); }}
            className="filter-slider h-1.5 w-full cursor-pointer appearance-none rounded-full bg-neutral-300 accent-white dark:bg-neutral-700"
            style={{ "--slider-pct": `${(mixVolume / 3) * 100}%` } as React.CSSProperties}
          />
        </div>
        <button
          onClick={handleMix}
          disabled={!sourceUrl || !audioFile || isPending}
          className="mt-1 flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-neutral-50 py-2.5 text-[12px] font-[500] text-muted-foreground transition-all hover:bg-neutral-100 hover:text-foreground active:opacity-80 disabled:pointer-events-none disabled:opacity-30 dark:bg-neutral-800/60 dark:hover:bg-neutral-800 dark:hover:text-white"
        >
          {mixMutation.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Mic className="size-3.5" />}
          {t("audioMixBtn")}
        </button>
      </div>

      {/* 결과 저장/다운로드 */}
      {pendingResult && (
        <div className="sticky bottom-0 z-10 mt-auto -mx-5 bg-white px-5 pt-4 pb-4 dark:bg-neutral-950">
          <p className="mb-2 text-[12px] font-[500] text-primary">{t("audioResultReady")}</p>
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
              onClick={handleSave}
              disabled={isSaving}
              className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-primary py-2.5 text-[13px] font-[600] text-white transition-all hover:opacity-90 active:opacity-80 disabled:pointer-events-none disabled:opacity-30"
            >
              {isSaving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
              {t("saveToGallery")}
            </button>
            <button
              onClick={handleDownload}
              className="flex cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-neutral-50 px-3.5 py-2.5 text-[12px] font-[500] text-muted-foreground transition-all hover:bg-neutral-100 hover:text-foreground active:opacity-80 dark:bg-neutral-800/60 dark:hover:bg-neutral-800 dark:hover:text-white"
            >
              <Download className="size-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
