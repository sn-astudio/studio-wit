"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Download, Loader2, Sparkles } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/Button";
import { useAuthStore } from "@/stores/auth";
import {
  useCreateGeneration,
  useGeneration,
} from "@/hooks/queries/useGeneration";
import { useModels } from "@/hooks/queries/useModels";
import { queryKeys } from "@/hooks/queries/keys";
import { imageApi } from "@/services/api";
import { cn } from "@/lib/utils";
import type { AspectRatio } from "@/types/api";

import { downloadImage } from "../utils";
import type { AIEditPanelProps } from "./types";

const ASPECT_RATIOS: AspectRatio[] = ["1:1", "16:9", "9:16", "4:3", "3:4"];

export function AIEditPanel({ sourceUrl, onUseAsSource }: AIEditPanelProps) {
  const t = useTranslations("ImageEdit");
  const token = useAuthStore((s) => s.token);
  const queryClient = useQueryClient();

  const [prompt, setPrompt] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("1:1");
  const [genId, setGenId] = useState<string | null>(null);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [resultUrl, setResultUrl] = useState<string | null>(null);

  const { data: modelsData } = useModels("image");
  const models = modelsData?.models ?? [];

  // 기본 모델 설정
  useEffect(() => {
    if (models.length > 0 && !selectedModel) {
      setSelectedModel(models[0].id);
    }
  }, [models, selectedModel]);

  const createMutation = useCreateGeneration();
  const { data: pollingData } = useGeneration(genId, !!genId);
  const currentGen = pollingData?.generation ?? null;

  const isGenerating =
    currentGen?.status === "pending" || currentGen?.status === "processing";
  const isCompleted = currentGen?.status === "completed";
  const progress = currentGen?.progress ?? null;

  // 경과 시간 타이머
  useEffect(() => {
    if (!startTime || !isGenerating) return;
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime, isGenerating]);

  // 완료/실패 처리
  const prevStatusRef = useRef<string | null>(null);
  useEffect(() => {
    if (!currentGen) return;
    const prev = prevStatusRef.current;
    prevStatusRef.current = currentGen.status;

    if (prev && prev !== currentGen.status) {
      if (currentGen.status === "completed") {
        toast.success(t("aiGenerateComplete"));
        setResultUrl(currentGen.result_url ?? null);
        setGenId(null);
        setStartTime(null);
        queryClient.invalidateQueries({ queryKey: queryKeys.generation.all });
      } else if (currentGen.status === "failed") {
        toast.error(currentGen.error?.message ?? t("aiGenerateError"));
        setGenId(null);
        setStartTime(null);
      }
    }
  }, [currentGen, t]);

  const handleGenerate = useCallback(async () => {
    if (!token) {
      toast.error(t("loginRequired"));
      return;
    }
    if (!prompt.trim() || !selectedModel || createMutation.isPending) return;

    let imageUrl = sourceUrl;
    if (
      imageUrl &&
      (imageUrl.startsWith("blob:") || imageUrl.startsWith("data:"))
    ) {
      try {
        const resp = await fetch(imageUrl);
        const blob = await resp.blob();
        const file = new File([blob], `input-${Date.now()}.png`, {
          type: blob.type || "image/png",
        });
        const uploaded = await imageApi.upload(file);
        imageUrl = uploaded.url;
      } catch {
        toast.error(t("aiGenerateError"));
        return;
      }
    }

    createMutation.mutate(
      {
        model_id: selectedModel,
        prompt: prompt.trim(),
        params: {
          aspect_ratio: aspectRatio,
          ...(imageUrl ? { input_image_url: imageUrl } : {}),
        },
      },
      {
        onSuccess: (res) => {
          toast.success(t("aiGenerateStarted"));
          setResultUrl(null);
          prevStatusRef.current = res.generation.status;
          setGenId(res.generation.id);
          setStartTime(Date.now());
          setElapsed(0);
        },
        onError: (err) => {
          toast.error(err.message || t("aiGenerateError"));
        },
      },
    );
  }, [
    token,
    prompt,
    selectedModel,
    aspectRatio,
    sourceUrl,
    createMutation,
    t,
  ]);

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* 프롬프트 */}
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder={t("aiPromptPlaceholder")}
        rows={3}
        className="w-full resize-none rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-primary focus:outline-none"
      />

      {/* 모델 선택 */}
      <div className="space-y-1.5">
        <span className="text-xs text-zinc-400">{t("modelLabel")}</span>
        <div className="flex flex-wrap gap-1.5">
          {models.map((m) => (
            <button
              key={m.id}
              onClick={() => setSelectedModel(m.id)}
              className={cn(
                "cursor-pointer rounded-md border px-2.5 py-1 text-xs transition-colors",
                selectedModel === m.id
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-zinc-700 text-zinc-400 hover:border-zinc-500",
              )}
            >
              {m.name}
            </button>
          ))}
        </div>
      </div>

      {/* 비율 선택 */}
      <div className="space-y-1.5">
        <span className="text-xs text-zinc-400">{t("aspectRatio")}</span>
        <div className="flex flex-wrap gap-1.5">
          {ASPECT_RATIOS.map((r) => (
            <button
              key={r}
              onClick={() => setAspectRatio(r)}
              className={cn(
                "cursor-pointer rounded-md border px-2.5 py-1 text-xs transition-colors",
                aspectRatio === r
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-zinc-700 text-zinc-400 hover:border-zinc-500",
              )}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* 생성 버튼 */}
      <Button
        onClick={handleGenerate}
        disabled={
          !prompt.trim() || !selectedModel || isGenerating || createMutation.isPending
        }
        className="cursor-pointer gap-2"
      >
        {isGenerating ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Sparkles className="size-4" />
        )}
        {isGenerating ? t("aiGenerating") : t("aiGenerate")}
      </Button>

      {/* 프로그레스 */}
      {isGenerating && (
        <div className="space-y-2">
          <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${progress ?? 0}%` }}
            />
          </div>
          <p className="text-center text-xs text-zinc-500">
            {t("elapsed")}: {elapsed}s
            {progress != null && ` · ${progress}%`}
          </p>
        </div>
      )}

      {/* 결과 */}
      {resultUrl && (
        <div className="space-y-2">
          <div className="overflow-hidden rounded-lg border border-zinc-700">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={resultUrl}
              alt="AI generated"
              className="w-full object-contain"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => downloadImage(resultUrl)}
              className="cursor-pointer gap-1.5"
            >
              <Download className="size-4" />
              {t("download")}
            </Button>
            <Button
              size="sm"
              onClick={() => onUseAsSource(resultUrl)}
              className="cursor-pointer"
            >
              {t("useAsSource")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
