"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Download, Loader2, Sparkle, Blend } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

import { useAuthStore } from "@/stores/auth";
import {
  useCreateGeneration,
  useGeneration,
} from "@/hooks/queries/useGeneration";
import { useModels } from "@/hooks/queries/useModels";
import { queryKeys } from "@/hooks/queries/keys";
import { composeApi, imageApi } from "@/services/api";
import { cn } from "@/lib/utils";
import type { AspectRatio } from "@/types/api";

import { downloadImage } from "../utils";
import { ImageSlot } from "../ComposePanel/ImageSlot";
import type { AIMode, AIEditPanelProps } from "./types";

const ASPECT_RATIOS: AspectRatio[] = ["1:1", "16:9", "9:16", "4:3", "3:4"];

export function AIEditPanel({ sourceUrl, onUseAsSource }: AIEditPanelProps) {
  const t = useTranslations("ImageEdit");
  const token = useAuthStore((s) => s.token);
  const queryClient = useQueryClient();

  const [mode, setMode] = useState<AIMode>("edit");

  // 공통 상태
  const [prompt, setPrompt] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [genId, setGenId] = useState<string | null>(null);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 편집 모드
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("1:1");

  // 합성 모드
  const [baseImageUrl, setBaseImageUrl] = useState<string | null>(null);
  const [referenceImageUrl, setReferenceImageUrl] = useState<string | null>(null);

  // 모델 목록
  const { data: modelsData } = useModels("image");
  const allModels = modelsData?.models ?? [];

  const editModels = (() => {
    const img2img = allModels.filter((m) =>
      m.supported_params.includes("input_image_url"),
    );
    return img2img.length > 0
      ? img2img
      : allModels.filter((m) => m.id !== "imagen-4");
  })();

  const composeModels = allModels.filter((m) =>
    m.supported_params.includes("compose"),
  );

  const models = mode === "edit" ? editModels : composeModels;

  // 모드 변경 시 모델 리셋
  useEffect(() => {
    if (models.length > 0 && !models.find((m) => m.id === selectedModel)) {
      setSelectedModel(models[0].id);
    }
  }, [models, selectedModel]);

  // 모드 전환 시 결과 초기화
  const handleModeChange = useCallback((newMode: AIMode) => {
    setMode(newMode);
    setResultUrl(null);
    setGenId(null);
    setStartTime(null);
  }, []);

  // Polling
  const createMutation = useCreateGeneration();
  const { data: pollingData } = useGeneration(genId, !!genId);
  const currentGen = pollingData?.generation ?? null;

  const isGenerating =
    currentGen?.status === "pending" || currentGen?.status === "processing";
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
        toast.success(
          mode === "edit" ? t("aiGenerateComplete") : t("composeComplete"),
        );
        setResultUrl(currentGen.result_url ?? null);
        setGenId(null);
        setStartTime(null);
        queryClient.invalidateQueries({ queryKey: queryKeys.generation.all });
      } else if (currentGen.status === "failed") {
        toast.error(
          currentGen.error?.message ??
            (mode === "edit" ? t("aiGenerateError") : t("composeError")),
        );
        setGenId(null);
        setStartTime(null);
      }
    }
  }, [currentGen, mode, t, queryClient]);

  /** blob/data URI → CDN URL */
  async function ensureUploadedUrl(url: string): Promise<string> {
    if (url.startsWith("blob:") || url.startsWith("data:")) {
      const resp = await fetch(url);
      const blob = await resp.blob();
      const file = new File([blob], `ai-${Date.now()}.png`, {
        type: blob.type || "image/png",
      });
      const uploaded = await imageApi.upload(file);
      return uploaded.url;
    }
    return url;
  }

  // 편집 모드 생성
  const handleEditGenerate = useCallback(async () => {
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
  }, [token, prompt, selectedModel, aspectRatio, sourceUrl, createMutation, t]);

  // 합성 모드 생성
  const handleComposeGenerate = useCallback(async () => {
    if (!token) {
      toast.error(t("loginRequired"));
      return;
    }
    if (!baseImageUrl || !referenceImageUrl || !prompt.trim()) return;

    setIsSubmitting(true);
    try {
      const [uploadedBase, uploadedRef] = await Promise.all([
        ensureUploadedUrl(baseImageUrl),
        ensureUploadedUrl(referenceImageUrl),
      ]);

      const res = await composeApi.create({
        model_id: selectedModel || undefined,
        base_image_url: uploadedBase,
        reference_image_url: uploadedRef,
        prompt: prompt.trim(),
      });

      toast.success(t("composeStarted"));
      setResultUrl(null);
      prevStatusRef.current = res.generation.status;
      setGenId(res.generation.id);
      setStartTime(Date.now());
      setElapsed(0);
    } catch {
      toast.error(t("composeError"));
    } finally {
      setIsSubmitting(false);
    }
  }, [token, baseImageUrl, referenceImageUrl, prompt, selectedModel, t]);

  const handleGenerate = mode === "edit" ? handleEditGenerate : handleComposeGenerate;

  const canGenerate =
    mode === "edit"
      ? !!(prompt.trim() && selectedModel && !isGenerating && !createMutation.isPending)
      : !!(baseImageUrl && referenceImageUrl && prompt.trim() && !isGenerating && !isSubmitting);

  return (
    <div className="flex flex-1 flex-col gap-5">
      {/* 서브 모드 전환 */}
      <div className="grid grid-cols-2 gap-2">
        {([
          { id: "edit" as AIMode, icon: Sparkle, labelKey: "aiModeEdit" },
          { id: "compose" as AIMode, icon: Blend, labelKey: "aiModeCompose" },
        ]).map(({ id, icon: Icon, labelKey }) => (
          <button
            key={id}
            onClick={() => handleModeChange(id)}
            className={cn(
              "flex cursor-pointer flex-col items-center gap-2 rounded-lg py-3.5 text-[12px] font-[500] transition-all active:opacity-80",
              mode === id
                ? "bg-foreground text-background"
                : "bg-neutral-50 text-muted-foreground hover:bg-neutral-100 hover:text-foreground dark:bg-neutral-800/60 dark:hover:bg-neutral-800 dark:hover:text-white",
            )}
          >
            <Icon className="size-5" strokeWidth={1.5} />
            {t(labelKey)}
          </button>
        ))}
      </div>

      {/* 합성 모드: 이미지 슬롯 */}
      {mode === "compose" && (
        <div className="grid grid-cols-2 gap-3">
          <ImageSlot
            label={t("composeBaseImage")}
            imageUrl={baseImageUrl}
            onSelect={setBaseImageUrl}
            onRemove={() => setBaseImageUrl(null)}
            currentEditingImageUrl={sourceUrl}
            compact
          />
          <ImageSlot
            label={t("composeReferenceImage")}
            imageUrl={referenceImageUrl}
            onSelect={setReferenceImageUrl}
            onRemove={() => setReferenceImageUrl(null)}
            currentEditingImageUrl={sourceUrl}
            compact
          />
        </div>
      )}

      {/* 모델 선택 */}
      {models.length > 0 && (
        <div className="space-y-2.5">
          <p className="text-[13px] font-[600] text-foreground">
            {mode === "edit" ? t("modelLabel") : t("composeModelLabel")}
          </p>
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
      )}

      {/* 비율 선택 (편집 모드만) */}
      {mode === "edit" && (
        <div className="space-y-2.5">
          <p className="text-[13px] font-[600] text-foreground">
            {t("aspectRatio")}
          </p>
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
      )}

      {/* 프롬프트 */}
      <div className="space-y-2.5">
        <p className="text-[13px] font-[600] text-foreground">
          {t("promptLabel")}
        </p>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={
            mode === "edit" ? t("aiPromptPlaceholder") : t("composePrompt")
          }
          rows={3}
          className="w-full resize-none rounded-lg bg-neutral-50 px-3 py-2.5 text-[13px] text-foreground placeholder:text-muted-foreground/40 focus:outline-none dark:bg-neutral-800/60"
        />
      </div>

      {/* 초기화 / 생성 — 하단 고정 */}
      <div className="sticky bottom-0 z-10 mt-auto -mx-5 bg-white px-5 pt-4 pb-4 dark:bg-neutral-950">
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setPrompt("");
              setResultUrl(null);
              setGenId(null);
              setStartTime(null);
              if (mode === "compose") {
                setBaseImageUrl(null);
                setReferenceImageUrl(null);
              }
            }}
            className="flex flex-1 cursor-pointer items-center justify-center rounded-lg bg-neutral-50 py-2.5 text-[13px] font-[500] text-muted-foreground transition-all hover:bg-neutral-100 hover:text-foreground active:opacity-80 dark:bg-neutral-800/60 dark:hover:bg-neutral-800 dark:hover:text-white"
          >
            {t("reset")}
          </button>
          <button
            onClick={handleGenerate}
            disabled={!canGenerate}
            className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-primary py-2.5 text-[13px] font-[600] text-white transition-all hover:opacity-90 active:opacity-80 disabled:pointer-events-none disabled:opacity-30"
          >
            {(isGenerating || isSubmitting) && (
              <Loader2 className="size-3.5 animate-spin" />
            )}
            {isGenerating
              ? mode === "edit"
                ? t("aiGenerating")
                : t("composeLoading")
              : <>{t("generate")} ✦ 1</>}
          </button>
        </div>

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
