"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Download, Loader2, Sparkle } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

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
  const allModels = modelsData?.models ?? [];
  const img2imgModels = allModels.filter((m) =>
    m.supported_params.includes("input_image_url"),
  );
  // 백엔드 미배포 시 폴백: imagen-4만 제외
  const models =
    img2imgModels.length > 0
      ? img2imgModels
      : allModels.filter((m) => m.id !== "imagen-4");

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
    <div className="flex flex-1 flex-col gap-6 pt-3">
      {/* 프롬프트 */}
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder={t("aiPromptPlaceholder")}
        rows={3}
        className="w-full resize-none rounded-xl bg-neutral-50 px-4 py-3 text-[14px] text-foreground placeholder:text-muted-foreground/40 focus:outline-none dark:bg-neutral-800/60"
      />

      {/* 모델 선택 */}
      <div className="space-y-3">
        <p className="text-[13px] font-[600] text-foreground">{t("modelLabel")}</p>
        <div className="flex flex-wrap gap-2">
          {models.map((m) => (
            <button
              key={m.id}
              onClick={() => setSelectedModel(m.id)}
              className={cn(
                "cursor-pointer rounded-lg px-3.5 py-2 text-[12px] font-[500] transition-all active:opacity-80",
                selectedModel === m.id
                  ? "bg-foreground text-background"
                  : "bg-neutral-50 text-muted-foreground hover:bg-neutral-100 hover:text-foreground dark:bg-neutral-800/60 dark:hover:bg-neutral-800 dark:hover:text-white",
              )}
            >
              {m.name}
            </button>
          ))}
        </div>
      </div>

      {/* 비율 선택 */}
      <div className="space-y-3">
        <p className="text-[13px] font-[600] text-foreground">{t("aspectRatio")}</p>
        <div className="flex flex-wrap gap-1.5">
          {ASPECT_RATIOS.map((r) => (
            <button
              key={r}
              onClick={() => setAspectRatio(r)}
              className={cn(
                "cursor-pointer rounded-lg px-3.5 py-2 text-[12px] font-[500] transition-all active:opacity-80",
                aspectRatio === r
                  ? "bg-foreground text-background"
                  : "bg-neutral-50 text-muted-foreground hover:bg-neutral-100 hover:text-foreground dark:bg-neutral-800/60 dark:hover:bg-neutral-800 dark:hover:text-white",
              )}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* 생성 버튼 — 하단 고정 */}
      <div className="sticky bottom-0 z-10 mt-auto -mx-5 bg-white px-5 pt-6 pb-4 dark:bg-transparent">
      <button
        onClick={handleGenerate}
        disabled={
          !prompt.trim() || !selectedModel || isGenerating || createMutation.isPending
        }
        className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-[13px] font-[600] text-white transition-colors hover:opacity-90 disabled:pointer-events-none disabled:opacity-30"
      >
        {isGenerating ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Sparkle className="size-4" />
        )}
        {isGenerating ? t("aiGenerating") : t("aiGenerate")}
      </button>

      {/* 프로그레스 */}
      {isGenerating && (
        <div className="space-y-3">
          <div className="h-1.5 overflow-hidden rounded-full bg-neutral-300 dark:bg-neutral-700">
            <div
              className="h-full rounded-full bg-foreground transition-all duration-500"
              style={{ width: `${progress ?? 0}%` }}
            />
          </div>
          <p className="text-center text-[12px] tabular-nums text-muted-foreground/60">
            {t("elapsed")}: {elapsed}s
            {progress != null && ` · ${progress}%`}
          </p>
        </div>
      )}

      {/* 결과 */}
      {resultUrl && (
        <div className="space-y-3">
          <div className="overflow-hidden rounded-lg">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={resultUrl}
              alt="AI generated"
              className="w-full object-contain"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => downloadImage(resultUrl)}
              className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-white py-2.5 text-[13px] font-[500] text-muted-foreground transition-colors hover:text-foreground dark:bg-neutral-800 dark:hover:text-white"
            >
              <Download className="size-4" />
              {t("download")}
            </button>
            <button
              onClick={() => onUseAsSource(resultUrl)}
              className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-foreground py-2.5 text-[13px] font-[600] text-background transition-colors hover:opacity-90"
            >
              {t("useAsSource")}
            </button>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
