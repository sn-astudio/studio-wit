"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Camera, Download, Loader2, Sparkles, Play } from "lucide-react";
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
import { useCaptureFrame } from "@/hooks/queries/useVideoEdit";
import {
  useCreateGeneration,
  useGeneration,
} from "@/hooks/queries/useGeneration";
import { useAuthStore } from "@/stores/auth";

import { downloadVideo } from "../utils";
import type { AIEditPanelProps } from "./types";

const AI_VIDEO_MODELS = [
  { id: "veo-3.1", name: "Veo 3.1" },
  { id: "veo-3.1-fast", name: "Veo 3.1 Fast" },
  { id: "sora-2", name: "Sora 2" },
  { id: "sora-2-pro", name: "Sora 2 Pro" },
];

export function AIEditPanel({ sourceUrl, currentTime }: AIEditPanelProps) {
  const t = useTranslations("VideoEdit");
  const token = useAuthStore((s) => s.token);

  const [capturedImageUrl, setCapturedImageUrl] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [selectedModel, setSelectedModel] = useState("veo-3.1-fast");
  const [aspectRatio, setAspectRatio] = useState<"16:9" | "9:16" | "1:1">("16:9");
  const [duration, setDuration] = useState(5);
  const [generationId, setGenerationId] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const captureMutation = useCaptureFrame();
  const createMutation = useCreateGeneration();
  const { data: genData } = useGeneration(generationId, !!generationId);

  const generation = genData?.generation;
  const isGenerating =
    generation?.status === "pending" || generation?.status === "processing";
  const isCompleted = generation?.status === "completed";
  const isFailed = generation?.status === "failed";

  // 완료/실패 시 generationId 폴링 중단
  useEffect(() => {
    if ((isCompleted || isFailed) && generationId) {
      // 폴링은 useGeneration 내부에서 status 기반으로 자동 중단
    }
  }, [isCompleted, isFailed, generationId]);

  // 경과 시간 타이머
  useEffect(() => {
    if (isGenerating) {
      timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isGenerating]);

  const handleCaptureFrame = useCallback(async () => {
    if (!sourceUrl) return;
    try {
      const result = await captureMutation.mutateAsync({
        source_url: sourceUrl,
        timestamp: currentTime,
      });
      setCapturedImageUrl(result.image_url);
    } catch {
      toast.error(t("captureError"));
    }
  }, [sourceUrl, currentTime, captureMutation, t]);

  const handleGenerate = useCallback(async () => {
    if (!capturedImageUrl || !prompt.trim() || !token) return;
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
      setGenerationId(result.generation.id);
      setElapsed(0);
      toast.success(t("aiGenerateStarted"));
    } catch {
      toast.error(t("aiGenerateError"));
    }
  }, [capturedImageUrl, prompt, selectedModel, aspectRatio, duration, token, createMutation, t]);

  const ASPECT_OPTIONS = [
    { value: "16:9", label: "16:9" },
    { value: "9:16", label: "9:16" },
    { value: "1:1", label: "1:1" },
  ];

  const DURATION_OPTIONS = [5, 6, 7, 8, 9, 10];

  return (
    <div className="space-y-3">
      {/* 상단: 캡처 프리뷰 + 프롬프트 */}
      <div className="flex items-start gap-3">
        <div className="group relative w-56 shrink-0 overflow-hidden rounded-lg border border-zinc-700 bg-zinc-900 aspect-video">
          {capturedImageUrl ? (
            <>
              <Image
                src={capturedImageUrl}
                alt="Captured frame"
                fill
                className="object-cover"
                unoptimized
              />
              <a
                href={capturedImageUrl}
                download={`frame_${Date.now()}.png`}
                onClick={(e) => e.stopPropagation()}
                className="absolute top-1.5 right-1.5 flex size-7 items-center justify-center rounded-full bg-black/60 text-zinc-200 opacity-0 transition-opacity hover:bg-black/80 hover:text-white group-hover:opacity-100"
              >
                <Download className="size-3.5" />
              </a>
            </>
          ) : (
            <div className="flex h-full items-center justify-center text-zinc-600">
              <Camera className="size-6" />
            </div>
          )}
        </div>

        <Textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={t("aiPromptPlaceholder")}
          className="min-h-[126px] flex-1 border-zinc-700 bg-zinc-900/60 text-sm"
          rows={5}
        />
      </div>

      {/* 하단: 캡처 + 비율 + 모델 + 생성 버튼 */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="h-7 gap-1.5 text-xs"
          onClick={handleCaptureFrame}
          disabled={!sourceUrl || captureMutation.isPending}
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
              const a = document.createElement("a");
              a.href = capturedImageUrl;
              a.download = `frame_${Date.now()}.png`;
              a.click();
            }}
          >
            <Download className="size-3.5" />
            {t("download")}
          </Button>
        )}
        {/* 비율 선택 */}
        <Select
          value={aspectRatio}
          onValueChange={(v) => setAspectRatio(v as "16:9" | "9:16" | "1:1")}
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
            {DURATION_OPTIONS.map((sec) => (
              <SelectItem key={sec} value={String(sec)}>
                {sec}s
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* 모델 선택 */}
        <Select
          value={selectedModel}
          onValueChange={setSelectedModel}
        >
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

        <Button
          size="sm"
          className="ml-auto h-7 gap-1.5"
          onClick={handleGenerate}
          disabled={
            !capturedImageUrl ||
            !prompt.trim() ||
            isGenerating ||
            createMutation.isPending
          }
        >
          {isGenerating || createMutation.isPending ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Sparkles className="size-3.5" />
          )}
          {t("aiGenerate")}
        </Button>
      </div>

      {/* 생성 진행 상태 */}
      {isGenerating && (
        <div className="space-y-2 rounded-lg bg-primary/10 px-4 py-3">
          <div className="flex items-center gap-3">
            <Loader2 className="size-4 animate-spin text-primary" />
            <span className="flex-1 text-sm text-primary">
              {t("aiGenerating")}
              {generation?.progress != null && ` (${generation.progress}%)`}
            </span>
            <span className="text-xs tabular-nums text-zinc-400">
              {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")}
            </span>
          </div>
          {/* 프로그레스 바 — progress가 있으면 실제 값, 없으면 indeterminate */}
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
            {generation?.progress != null ? (
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${generation.progress}%` }}
              />
            ) : (
              <div className="h-full w-1/3 animate-[indeterminate_1.5s_ease-in-out_infinite] rounded-full bg-primary" />
            )}
          </div>
        </div>
      )}

      {/* 생성 실패 */}
      {isFailed && generation && (
        <div className="flex items-center gap-3 rounded-lg bg-red-950/20 border border-red-900/40 px-4 py-2">
          <span className="text-sm text-red-400">
            {t("aiGenerateError")}
            {generation.error?.message && `: ${generation.error.message}`}
          </span>
        </div>
      )}

      {/* 생성 완료 결과 */}
      {isCompleted && generation?.result_url && (
        <div className="flex items-start gap-3 rounded-lg border border-primary/30 bg-primary/5 p-2">
          <video
            src={generation.result_url}
            className="h-20 rounded-md"
            controls
            muted
            loop
          />
          <div className="flex flex-1 flex-col gap-1.5 py-0.5">
            <div className="flex items-center gap-1.5">
              <Play className="size-3 text-primary" />
              <span className="text-xs font-medium text-primary">
                {t("aiGenerateComplete")}
              </span>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="h-7 w-fit gap-1.5 text-xs"
              onClick={() =>
                downloadVideo(
                  generation.result_url!,
                  `ai_edit_${Date.now()}.mp4`,
                )
              }
            >
              <Download className="size-3" />
              {t("download")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
