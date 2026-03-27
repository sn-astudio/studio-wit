"use client";

import { useCallback, useRef, useState } from "react";
import Image from "next/image";
import { Camera, Download, Globe, Lock, Loader2, Save, Sparkles, Play } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
} from "@/components/ui/Select";
import { useCaptureFrame, useSaveEdit } from "@/hooks/queries/useVideoEdit";
import { useCreateGeneration } from "@/hooks/queries/useGeneration";
import { useAuthStore } from "@/stores/auth";

import { downloadImage, downloadVideo } from "../utils";
import type { AIEditPanelProps } from "./types";

const AI_VIDEO_MODELS = [
  { id: "veo-3.1", name: "Veo 3.1", durations: [5, 6, 7, 8, 9, 10] },
  { id: "veo-3.1-fast", name: "Veo 3.1 Fast", durations: [5, 6, 7, 8, 9, 10] },
  { id: "sora-2", name: "Sora 2", durations: [4, 8, 12] },
  { id: "sora-2-pro", name: "Sora 2 Pro", durations: [4, 8, 12] },
  { id: "kling", name: "Kling", durations: [5, 10] },
];

export function AIEditPanel({
  sourceUrl,
  currentTime,
  videoRef,
  onDirty,
  aiGenerationId,
  onAiGenerationIdChange,
  aiGeneration,
  aiIsGenerating,
  aiIsCompleted,
  aiIsFailed,
  aiElapsed,
}: AIEditPanelProps) {
  const t = useTranslations("VideoEdit");
  const token = useAuthStore((s) => s.token);

  const [capturedImageUrl, setCapturedImageUrl] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [selectedModel, setSelectedModel] = useState("veo-3.1-fast");
  const [aspectRatio, setAspectRatio] = useState<"16:9" | "9:16" | "1:1">("16:9");
  const [duration, setDuration] = useState(5);
  const [isPublic, setIsPublic] = useState(false);

  const captureMutation = useCaptureFrame();
  const createMutation = useCreateGeneration();
  const saveEditMutation = useSaveEdit();

  const handleCaptureFrame = useCallback(async () => {
    if (!sourceUrl || aiIsGenerating) return;
    // 비디오 엘리먼트의 실제 currentTime 사용 (state가 stale할 수 있음)
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
        is_public: isPublic,
      });
      onAiGenerationIdChange(result.generation.id);
      setPrompt("");
      toast.success(t("aiGenerateStarted"));
    } catch {
      toast.error(t("aiGenerateError"));
    }
  }, [capturedImageUrl, prompt, selectedModel, aspectRatio, duration, token, createMutation, t, onAiGenerationIdChange, aiIsGenerating]);

  const currentModelConfig = AI_VIDEO_MODELS.find((m) => m.id === selectedModel);
  const durationOptions = currentModelConfig?.durations ?? [5];

  // 모델 변경 시 duration이 지원 범위 밖이면 첫 번째 값으로 조정
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

  const ASPECT_OPTIONS = [
    { value: "16:9", label: "16:9" },
    { value: "9:16", label: "9:16" },
    { value: "1:1", label: "1:1" },
  ];

  return (
    <div className="space-y-3">
      {/* 캡처 프리뷰 */}
      <div className="flex flex-col gap-3">
        <div
          className="group relative aspect-video w-full cursor-pointer overflow-hidden rounded-lg border border-zinc-400 bg-zinc-100 transition-colors hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-zinc-500"
          onClick={handleCaptureFrame}
          role="button"
          tabIndex={0}
          title={t("captureFrame")}
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
                className="absolute top-1.5 right-1.5 z-50 flex size-7 items-center justify-center rounded-full bg-black/60 text-zinc-200 opacity-0 transition-opacity hover:bg-black/80 hover:text-white group-hover:opacity-100"
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
            <div className="flex h-full flex-col items-center justify-center gap-1 text-zinc-600 dark:text-zinc-600">
              {captureMutation.isPending ? (
                <Loader2 className="size-6 animate-spin" />
              ) : (
                <>
                  <Camera className="size-6" />
                  <span className="text-[10px] text-zinc-500">
                    {t("captureFrame")}
                  </span>
                </>
              )}
            </div>
          )}
        </div>

      </div>

      {/* 프롬프트 입력 */}
      <Textarea
        value={prompt}
        onChange={(e) => { setPrompt(e.target.value); onDirty?.(); }}
        placeholder={t("aiPromptPlaceholder")}
        className="min-h-[80px] border-zinc-400 bg-zinc-100/60 text-sm dark:border-zinc-700 dark:bg-zinc-900/60"
        rows={3}
      />

      {/* 하단: 캡처 + 비율 + 모델 + 생성 버튼 */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="h-7 gap-1.5 text-xs"
          onClick={handleCaptureFrame}
          disabled={!sourceUrl || captureMutation.isPending || aiIsGenerating}
        >
          {captureMutation.isPending ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Camera className="size-3.5" />
          )}
          {t("captureFrame")}
        </Button>
        {capturedImageUrl && (
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1.5 text-xs"
            onClick={() => {
              downloadImage(capturedImageUrl, `frame_${Date.now()}.png`);
            }}
          >
            <Download className="size-3.5" />
            {t("download")}
          </Button>
        )}
        {/* 비율 선택 */}
        <Select
          value={aspectRatio}
          onValueChange={(v) =>
            setAspectRatio(v as "16:9" | "9:16" | "1:1")
          }
        >
          <SelectTrigger className="h-7 w-20 text-xs">
            {aspectRatio}
          </SelectTrigger>
          <SelectContent>
            {ASPECT_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* 초 선택 */}
        <Select
          value={String(duration)}
          onValueChange={(v) => setDuration(Number(v))}
        >
          <SelectTrigger className="h-7 w-20 text-xs">
            {duration}s
          </SelectTrigger>
          <SelectContent>
            {durationOptions.map((sec) => (
              <SelectItem key={sec} value={String(sec)}>
                {sec}s
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* 모델 선택 */}
        <Select value={selectedModel} onValueChange={handleModelChange}>
          <SelectTrigger className="h-7 w-36 text-xs">
            {AI_VIDEO_MODELS.find((m) => m.id === selectedModel)?.name}
          </SelectTrigger>
          <SelectContent>
            {AI_VIDEO_MODELS.map((model) => (
              <SelectItem key={model.id} value={model.id}>
                {model.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* 공개/비공개 토글 */}
        <button
          type="button"
          className="flex h-7 items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-2 text-xs transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700"
          onClick={() => setIsPublic(!isPublic)}
        >
          {isPublic ? <Globe className="size-3.5 text-blue-500" /> : <Lock className="size-3.5 text-zinc-500" />}
          <span className="text-zinc-700 dark:text-zinc-300">{isPublic ? t("public") : t("private")}</span>
        </button>

        <Button
          size="sm"
          className="h-7 w-full gap-1.5"
          onClick={handleGenerate}
          disabled={
            !capturedImageUrl ||
            !prompt.trim() ||
            aiIsGenerating ||
            createMutation.isPending
          }
        >
          {aiIsGenerating || createMutation.isPending ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Sparkles className="size-3.5" />
          )}
          {t("aiGenerate")}
        </Button>
      </div>

      {/* 생성 진행 상태 */}
      {aiIsGenerating && (
        <div className="space-y-2 rounded-lg bg-primary/10 px-4 py-3">
          <div className="flex items-center gap-3">
            <Loader2 className="size-4 animate-spin text-primary" />
            <span className="flex-1 text-sm text-primary">
              {t("aiGenerating")}
              {aiGeneration?.progress != null && ` (${aiGeneration.progress}%)`}
            </span>
            <span className="text-xs tabular-nums text-zinc-400">
              {Math.floor(aiElapsed / 60)}:{String(aiElapsed % 60).padStart(2, "0")}
            </span>
          </div>
          {/* 프로그레스 바 */}
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
            {aiGeneration?.progress != null ? (
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${aiGeneration.progress}%` }}
              />
            ) : (
              <div className="h-full w-1/3 animate-[indeterminate_1.5s_ease-in-out_infinite] rounded-full bg-primary" />
            )}
          </div>
        </div>
      )}

      {/* 생성 실패 */}
      {aiIsFailed && aiGeneration && (
        <div className="flex items-center gap-3 rounded-lg border border-red-300/40 bg-red-50/20 px-4 py-2 dark:border-red-900/40 dark:bg-red-950/20">
          <span className="text-sm text-red-600 dark:text-red-400">
            {t("aiGenerateError")}
            {aiGeneration.error?.message && `: ${aiGeneration.error.message}`}
          </span>
        </div>
      )}

      {/* 생성 완료: 다운로드 버튼 (자동 저장됨) */}
      {aiIsCompleted && aiGeneration?.result_url && (
        <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2">
          <Sparkles className="size-3.5 text-primary" />
          <span className="flex-1 text-xs font-medium text-primary">
            {t("aiGenerateComplete")}
          </span>
          <Button
            size="sm"
            variant="outline"
            className="h-7 gap-1.5 text-xs"
            onClick={() =>
              downloadVideo(
                aiGeneration.result_url!,
                `ai_edit_${Date.now()}.mp4`,
              )
            }
          >
            <Download className="size-3" />
            {t("download")}
          </Button>
        </div>
      )}
    </div>
  );
}
