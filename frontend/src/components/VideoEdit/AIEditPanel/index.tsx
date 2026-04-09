"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from "react";
import Image from "next/image";
import { Camera, Download, Loader2, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { useCaptureFrame } from "@/hooks/queries/useVideoEdit";
import { useCreateGeneration } from "@/hooks/queries/useGeneration";
import { useAuthStore } from "@/stores/auth";

import { downloadImage, downloadVideo } from "../utils";
import type { AIEditPanelProps, AIEditPanelRef } from "./types";

const AI_VIDEO_MODELS = [
  { id: "veo-3.1", name: "Veo 3.1", durations: [5, 6, 7, 8, 9, 10] },
  { id: "veo-3.1-fast", name: "Veo 3.1 Fast", durations: [5, 6, 7, 8, 9, 10] },
  { id: "sora-2", name: "Sora 2", durations: [4, 8, 12] },
  { id: "sora-2-pro", name: "Sora 2 Pro", durations: [4, 8, 12] },
  { id: "kling", name: "Kling", durations: [5, 10] },
];

const ASPECT_OPTIONS = ["16:9", "9:16", "1:1"] as const;

export const AIEditPanel = forwardRef<AIEditPanelRef, AIEditPanelProps>(function AIEditPanel({
  sourceUrl,
  currentTime,
  videoRef,
  onDirty,
  onAiGenerationIdChange,
  aiGeneration,
  aiIsGenerating,
  aiIsCompleted,
  aiIsFailed,
  aiElapsed,
  onStateChange,
}, ref) {
  const t = useTranslations("VideoEdit");
  const token = useAuthStore((s) => s.token);

  const [capturedImageUrl, setCapturedImageUrl] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [selectedModel, setSelectedModel] = useState("veo-3.1-fast");
  const [aspectRatio, setAspectRatio] = useState<"16:9" | "9:16" | "1:1">("16:9");
  const [duration, setDuration] = useState(5);

  const captureMutation = useCaptureFrame();
  const createMutation = useCreateGeneration();

  const currentModelConfig = AI_VIDEO_MODELS.find((m) => m.id === selectedModel);
  const durationOptions = currentModelConfig?.durations ?? [5];

  const handleCaptureFrame = useCallback(async () => {
    if (!sourceUrl || aiIsGenerating) return;
    const actualTime = videoRef?.current?.currentTime ?? currentTime;
    try {
      const result = await captureMutation.mutateAsync({
        source_url: sourceUrl,
        timestamp: actualTime,
      });
      setCapturedImageUrl(result.image_url);
      onDirty?.();
    } catch {
      toast.error(t("captureError"));
    }
  }, [sourceUrl, currentTime, videoRef, captureMutation, t, onDirty, aiIsGenerating]);

  const handleModelChange = useCallback(
    (modelId: string) => {
      setSelectedModel(modelId);
      const model = AI_VIDEO_MODELS.find((m) => m.id === modelId);
      if (model && !model.durations.includes(duration)) {
        setDuration(model.durations[0]);
      }
    },
    [duration],
  );

  const handleGenerate = useCallback(async () => {
    if (!capturedImageUrl || !prompt.trim() || !token || aiIsGenerating) return;
    try {
      const result = await createMutation.mutateAsync({
        model_id: selectedModel,
        prompt: prompt.trim(),
        params: {
          input_image_url: capturedImageUrl,
          aspect_ratio: aspectRatio,
          duration,
        },
      });
      onAiGenerationIdChange(result.generation.id);
      setPrompt("");
      toast.success(t("aiGenerateStarted"));
    } catch {
      toast.error(t("aiGenerateError"));
    }
  }, [capturedImageUrl, prompt, selectedModel, aspectRatio, duration, token, createMutation, t, onAiGenerationIdChange, aiIsGenerating]);

  const handleReset = useCallback(() => {
    setPrompt("");
    setCapturedImageUrl(null);
    setSelectedModel("veo-3.1-fast");
    setAspectRatio("16:9");
    setDuration(5);
  }, []);

  const canGenerate = !!capturedImageUrl && !!prompt.trim() && !aiIsGenerating && !createMutation.isPending;

  useImperativeHandle(ref, () => ({ reset: handleReset, apply: handleGenerate }), [handleReset, handleGenerate]);

  useEffect(() => {
    onStateChange?.({ canApply: canGenerate, isPending: aiIsGenerating || createMutation.isPending });
  }, [canGenerate, aiIsGenerating, createMutation.isPending, onStateChange]);

  return (
    <div className="flex flex-col gap-5">
      {/* 프레임 캡처 */}
      <div className="space-y-2.5">
        <p className="text-[13px] font-[600] text-foreground">{t("captureFrameLabel")}</p>
        <p className="text-[12px] text-muted-foreground/60">{t("captureFrameDesc")}</p>
        <div
          className="group relative aspect-video w-full cursor-pointer overflow-hidden rounded-xl bg-neutral-50 transition-all hover:opacity-90 active:opacity-80 dark:bg-neutral-800/60"
          onClick={handleCaptureFrame}
          role="button"
          tabIndex={0}
        >
          {capturedImageUrl ? (
            <>
              <Image
                src={capturedImageUrl}
                alt="Captured frame"
                fill
                className="object-cover"
                unoptimized
              />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  downloadImage(capturedImageUrl, `frame_${Date.now()}.png`);
                }}
                className="absolute top-2 right-2 z-10 flex size-7 items-center justify-center rounded-lg bg-black/60 text-white opacity-0 transition-opacity hover:bg-black/80 group-hover:opacity-100"
              >
                <Download className="size-3.5" />
              </button>
              {captureMutation.isPending && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <Loader2 className="size-5 animate-spin text-white" />
                </div>
              )}
              {!captureMutation.isPending && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                  <Camera className="size-5 text-white" />
                </div>
              )}
            </>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2">
              {captureMutation.isPending ? (
                <Loader2 className="size-6 animate-spin text-muted-foreground/40" />
              ) : (
                <>
                  <Camera className="size-6 text-muted-foreground/40" />
                  <span className="text-[12px] text-muted-foreground/60">{t("captureFrame")}</span>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 모델 선택 */}
      <div className="space-y-2.5">
        <p className="text-[13px] font-[600] text-foreground">{t("aiModelLabel")}</p>
        <div className="flex flex-wrap gap-1.5">
          {AI_VIDEO_MODELS.map((model) => (
            <button
              key={model.id}
              onClick={() => handleModelChange(model.id)}
              className={`cursor-pointer rounded-lg px-3.5 py-2 text-[12px] font-[500] transition-all active:opacity-80 ${
                selectedModel === model.id
                  ? "bg-foreground text-background"
                  : "bg-neutral-50 text-muted-foreground hover:bg-neutral-100 hover:text-foreground dark:bg-neutral-800/60 dark:hover:bg-neutral-800 dark:hover:text-white"
              }`}
            >
              {model.name}
            </button>
          ))}
        </div>
      </div>

      {/* 비율 선택 */}
      <div className="space-y-2.5">
        <p className="text-[13px] font-[600] text-foreground">{t("aspectRatio")}</p>
        <div className="flex flex-wrap gap-1.5">
          {ASPECT_OPTIONS.map((r) => (
            <button
              key={r}
              onClick={() => setAspectRatio(r)}
              className={`cursor-pointer rounded-lg px-3.5 py-2 text-[12px] font-[500] transition-all active:opacity-80 ${
                aspectRatio === r
                  ? "bg-foreground text-background"
                  : "bg-neutral-50 text-muted-foreground hover:bg-neutral-100 hover:text-foreground dark:bg-neutral-800/60 dark:hover:bg-neutral-800 dark:hover:text-white"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* 길이 선택 */}
      <div className="space-y-2.5">
        <p className="text-[13px] font-[600] text-foreground">{t("aiDuration")}</p>
        <div className="flex flex-wrap gap-1.5">
          {durationOptions.map((sec) => (
            <button
              key={sec}
              onClick={() => setDuration(sec)}
              className={`cursor-pointer rounded-lg px-3.5 py-2 text-[12px] font-[500] transition-all active:opacity-80 ${
                duration === sec
                  ? "bg-foreground text-background"
                  : "bg-neutral-50 text-muted-foreground hover:bg-neutral-100 hover:text-foreground dark:bg-neutral-800/60 dark:hover:bg-neutral-800 dark:hover:text-white"
              }`}
            >
              {sec}s
            </button>
          ))}
        </div>
      </div>

      {/* 프롬프트 */}
      <div className="space-y-2.5">
        <p className="text-[13px] font-[600] text-foreground">{t("promptLabel")}</p>
        <textarea
          value={prompt}
          onChange={(e) => { setPrompt(e.target.value); onDirty?.(); }}
          placeholder={t("aiPromptPlaceholder")}
          rows={3}
          className="w-full resize-none rounded-lg bg-neutral-50 px-3 py-2.5 text-[13px] text-foreground placeholder:text-muted-foreground/40 focus:outline-none dark:bg-neutral-800/60"
        />
      </div>

      {/* 생성 진행 상태 */}
      {aiIsGenerating && (
        <div className="space-y-2.5 rounded-xl bg-neutral-50 px-4 py-3 dark:bg-neutral-800/60">
          <div className="flex items-center gap-3">
            <Loader2 className="size-4 animate-spin text-primary" />
            <span className="flex-1 text-[12px] font-[500] text-primary">
              {t("aiGenerating")}
              {aiGeneration?.progress != null && ` (${aiGeneration.progress}%)`}
            </span>
            <span className="text-[11px] tabular-nums text-muted-foreground/60">
              {Math.floor(aiElapsed / 60)}:{String(aiElapsed % 60).padStart(2, "0")}
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-300 dark:bg-neutral-700">
            {aiGeneration?.progress != null ? (
              <div
                className="h-full rounded-full bg-foreground transition-all duration-500"
                style={{ width: `${aiGeneration.progress}%` }}
              />
            ) : (
              <div className="h-full w-1/3 animate-[indeterminate_1.5s_ease-in-out_infinite] rounded-full bg-foreground" />
            )}
          </div>
        </div>
      )}

      {/* 생성 실패 */}
      {aiIsFailed && aiGeneration && (
        <div className="rounded-xl bg-neutral-50 px-4 py-3 dark:bg-neutral-800/60">
          <span className="text-[12px] text-red-500">
            {t("aiGenerateError")}
            {aiGeneration.error?.message && `: ${aiGeneration.error.message}`}
          </span>
        </div>
      )}


    </div>
  );
});
