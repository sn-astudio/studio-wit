"use client";

import { useCallback, useState } from "react";
import {
  ChevronDown,
  Download,
  Globe,
  Loader2,
  Lock,
  Mic,
  MicOff,
  Music,
  Replace,
  Save,
  Volume2,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Slider as SliderPrimitive } from "@base-ui/react/slider";

import { Button } from "@/components/ui/Button";
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

  // 볼륨
  const [volume, setVolume] = useState(1.0);
  // 교체/믹싱용 오디오 파일
  const [audioFile, setAudioFile] = useState<File | null>(null);
  // 믹싱 볼륨
  const [originalVolume, setOriginalVolume] = useState(1.0);
  const [mixVolume, setMixVolume] = useState(0.5);
  // 결과 프리뷰 (저장 전 단계)
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
    extractMutation.isPending ||
    removeMutation.isPending ||
    replaceMutation.isPending ||
    volumeMutation.isPending ||
    mixMutation.isPending ||
    uploadMutation.isPending;

  // 오디오 파일 업로드 → URL 획득
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

  // 오디오 추출
  const handleExtract = useCallback(async () => {
    if (!sourceUrl) return;
    try {
      const result = await extractMutation.mutateAsync({ source_url: sourceUrl });
      // blob 다운로드
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

  // 음소거
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

  // 오디오 교체
  const handleReplace = useCallback(async () => {
    if (!sourceUrl || !audioFile) return;
    const audioUrl = await uploadAudioFile();
    if (!audioUrl) return;
    try {
      const result = await replaceMutation.mutateAsync({
        source_url: sourceUrl,
        audio_url: audioUrl,
      });
      setPendingResult(result.result_url);
      onAudioApplied?.(result.result_url);
      toast.success(t("audioReplaced"));
      notify(t("audioReplaced"));
    } catch {
      toast.error(t("audioError"));
    }
  }, [sourceUrl, audioFile, uploadAudioFile, replaceMutation, onAudioApplied, t, notify]);

  // 볼륨 조절
  const handleVolume = useCallback(async () => {
    if (!sourceUrl) return;
    try {
      const result = await volumeMutation.mutateAsync({
        source_url: sourceUrl,
        volume,
      });
      onAudioApplied?.(result.result_url);
      toast.success(t("audioVolumeApplied"));
      notify(t("audioVolumeApplied"));
    } catch {
      toast.error(t("audioError"));
    }
  }, [sourceUrl, volume, volumeMutation, onAudioApplied, t, notify]);

  // BGM 믹싱
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

  // DB 저장
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

  // 로컬 다운로드
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

  const [openSection, setOpenSection] = useState<string | null>(null);
  const toggle = (id: string) => setOpenSection((prev) => (prev === id ? null : id));

  return (
    <div className="space-y-1">
      {/* 오디오 추출 */}
      <AccordionSection id="extract" icon={<Download className="size-3.5" />} label={t("audioExtract")} open={openSection === "extract"} onToggle={() => toggle("extract")}>
        <p className="text-[11px] text-zinc-500">{t("audioExtractDesc")}</p>
        <Button size="sm" variant="outline" className="w-full gap-1.5" onClick={handleExtract} disabled={!sourceUrl || isPending}>
          {extractMutation.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
          {t("audioExtractBtn")}
        </Button>
      </AccordionSection>

      {/* 음소거 */}
      <AccordionSection id="remove" icon={<MicOff className="size-3.5" />} label={t("audioRemove")} open={openSection === "remove"} onToggle={() => toggle("remove")}>
        <p className="text-[11px] text-zinc-500">{t("audioRemoveDesc")}</p>
        <Button size="sm" variant="outline" className="w-full gap-1.5" onClick={handleRemove} disabled={!sourceUrl || isPending}>
          {removeMutation.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <MicOff className="size-3.5" />}
          {t("audioRemoveBtn")}
        </Button>
      </AccordionSection>

      {/* 볼륨 조절 */}
      <AccordionSection id="volume" icon={<Volume2 className="size-3.5" />} label={t("audioVolume")} badge={volume !== 1 ? `${volume.toFixed(1)}x` : undefined} open={openSection === "volume"} onToggle={() => toggle("volume")}>
        <SliderControl label={t("audioVolumeLabel")} value={volume} min={0} max={3} step={0.1} onChange={(v) => { setVolume(v); onDirty?.(); }} />
        <Button size="sm" variant="outline" className="w-full gap-1.5" onClick={handleVolume} disabled={!sourceUrl || isPending}>
          {volumeMutation.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Volume2 className="size-3.5" />}
          {t("audioVolumeBtn")}
        </Button>
      </AccordionSection>

      {/* 오디오 파일 선택 (교체/믹싱 공용) */}
      <div className="rounded-lg border border-zinc-200/60 px-3 py-2.5 dark:border-zinc-800/60">
        <div className="flex items-center gap-2">
          <Music className="size-3.5 text-zinc-400" />
          <span className="text-xs font-medium">{t("audioFile")}</span>
        </div>
        <label className="mt-1.5 flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-zinc-300 px-3 py-2 text-xs text-zinc-500 transition-colors hover:border-zinc-400 dark:border-zinc-700 dark:hover:border-zinc-600">
          <Music className="size-3.5" />
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
      <AccordionSection id="replace" icon={<Replace className="size-3.5" />} label={t("audioReplace")} open={openSection === "replace"} onToggle={() => toggle("replace")}>
        <p className="text-[11px] text-zinc-500">{t("audioReplaceDesc")}</p>
        <Button size="sm" variant="outline" className="w-full gap-1.5" onClick={handleReplace} disabled={!sourceUrl || !audioFile || isPending}>
          {replaceMutation.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Replace className="size-3.5" />}
          {t("audioReplaceBtn")}
        </Button>
      </AccordionSection>

      {/* BGM 믹싱 */}
      <AccordionSection id="mix" icon={<Mic className="size-3.5" />} label={t("audioMix")} open={openSection === "mix"} onToggle={() => toggle("mix")}>
        <p className="text-[11px] text-zinc-500">{t("audioMixDesc")}</p>
        <SliderControl label={t("audioOriginalVol")} value={originalVolume} min={0} max={3} step={0.1} onChange={(v) => { setOriginalVolume(v); onDirty?.(); }} />
        <SliderControl label={t("audioMixVol")} value={mixVolume} min={0} max={3} step={0.1} onChange={(v) => { setMixVolume(v); onDirty?.(); }} />
        <Button size="sm" variant="outline" className="w-full gap-1.5" onClick={handleMix} disabled={!sourceUrl || !audioFile || isPending}>
          {mixMutation.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Mic className="size-3.5" />}
          {t("audioMixBtn")}
        </Button>
      </AccordionSection>

      {/* 결과 저장/다운로드 */}
      {pendingResult && (
        <div className="space-y-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2.5">
          <p className="text-xs font-medium text-primary">{t("audioResultReady")}</p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsPublicSave(!isPublicSave)}
              className="flex items-center gap-1 rounded-lg bg-zinc-200/60 px-2 py-1 text-xs transition-colors hover:bg-zinc-300 dark:bg-zinc-800/60 dark:hover:bg-zinc-700"
            >
              {isPublicSave ? <Globe className="size-3" /> : <Lock className="size-3" />}
              {isPublicSave ? t("public") : t("private")}
            </button>
            <Button size="sm" className="flex-1 gap-1.5" onClick={handleSave} disabled={isSaving}>
              {isSaving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
              {t("saveToGallery")}
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5" onClick={handleDownload}>
              <Download className="size-3.5" />
              {t("download")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function AccordionSection({ id, icon, label, badge, open, onToggle, children }: { id: string; icon: React.ReactNode; label: string; badge?: string; open: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-zinc-200/60 dark:border-zinc-800/60">
      <button onClick={onToggle} className="flex w-full items-center gap-2 px-3 py-2.5 text-left transition-colors hover:bg-zinc-100/60 dark:hover:bg-zinc-800/40">
        <span className="text-zinc-400">{icon}</span>
        <span className="text-xs font-medium">{label}</span>
        {badge && <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">{badge}</span>}
        <ChevronDown className={`ml-auto size-3.5 text-zinc-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="space-y-2 px-3 pb-3">{children}</div>}
    </div>
  );
}

function SliderControl({ label, value, min, max, step, onChange }: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-16 text-[11px] text-zinc-500">{label}</span>
      <SliderPrimitive.Root value={value} onValueChange={(v) => onChange(v as number)} min={min} max={max} step={step} className="flex-1">
        <SliderPrimitive.Control className="relative flex h-4 w-full cursor-pointer items-center">
          <SliderPrimitive.Track className="h-1 w-full rounded-full bg-zinc-200 dark:bg-zinc-800">
            <SliderPrimitive.Indicator className="rounded-full bg-primary" />
          </SliderPrimitive.Track>
          <SliderPrimitive.Thumb className="block size-3 rounded-full border-2 border-primary bg-background shadow-sm" />
        </SliderPrimitive.Control>
      </SliderPrimitive.Root>
      <span className="w-8 text-right text-[11px] tabular-nums text-zinc-400">{value.toFixed(1)}</span>
    </div>
  );
}
