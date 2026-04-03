"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Download, Layers, Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { useAuthStore } from "@/stores/auth";
import { useGeneration } from "@/hooks/queries/useGeneration";
import { useModels } from "@/hooks/queries/useModels";
import { queryKeys } from "@/hooks/queries/keys";
import { composeApi, imageApi } from "@/services/api";

import { downloadImage } from "../utils";
import { ImageSlot } from "./ImageSlot";
import type { ComposePanelProps } from "./types";

export function ComposePanel({
  currentEditingImageUrl,
  onUseAsSource,
}: ComposePanelProps) {
  const t = useTranslations("ImageEdit");
  const token = useAuthStore((s) => s.token);
  const queryClient = useQueryClient();

  // 모델 목록
  const { data: modelsData } = useModels("image");
  const composeModels = (modelsData?.models ?? []).filter((m) =>
    m.supported_params.includes("compose"),
  );
  const [selectedModel, setSelectedModel] = useState<string>("");

  // 모델 목록 로드 시 자동 초기화
  useEffect(() => {
    if (composeModels.length > 0 && !composeModels.find((m) => m.id === selectedModel)) {
      setSelectedModel(composeModels[0].id);
    }
  }, [composeModels, selectedModel]);

  const [baseImageUrl, setBaseImageUrl] = useState<string | null>(null);
  const [referenceImageUrl, setReferenceImageUrl] = useState<string | null>(
    null,
  );
  const [prompt, setPrompt] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [genId, setGenId] = useState<string | null>(null);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [resultUrl, setResultUrl] = useState<string | null>(null);

  // polling
  const { data: pollingData } = useGeneration(genId, !!genId);
  const currentGen = pollingData?.generation ?? null;

  const isGenerating =
    currentGen?.status === "pending" || currentGen?.status === "processing";
  const progress = currentGen?.progress ?? null;

  const canGenerate =
    !!baseImageUrl &&
    !!referenceImageUrl &&
    prompt.trim().length > 0 &&
    !isGenerating &&
    !isSubmitting;

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
        toast.success(t("composeComplete"));
        setResultUrl(currentGen.result_url ?? null);
        setGenId(null);
        setStartTime(null);
        queryClient.invalidateQueries({ queryKey: queryKeys.generation.all });
      } else if (currentGen.status === "failed") {
        toast.error(currentGen.error?.message ?? t("composeError"));
        setGenId(null);
        setStartTime(null);
      }
    }
  }, [currentGen, t, queryClient]);

  /** blob/data URI → CDN URL 변환 */
  async function ensureUploadedUrl(url: string): Promise<string> {
    if (url.startsWith("blob:") || url.startsWith("data:")) {
      const resp = await fetch(url);
      const blob = await resp.blob();
      const file = new File([blob], `compose-${Date.now()}.png`, {
        type: blob.type || "image/png",
      });
      const uploaded = await imageApi.upload(file);
      return uploaded.url;
    }
    return url;
  }

  const handleGenerate = useCallback(async () => {
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

  return (
    <div className="flex flex-col gap-5 p-4">
      {/* 이미지 1 */}
      <ImageSlot
        label={t("composeBaseImage")}
        imageUrl={baseImageUrl}
        onSelect={setBaseImageUrl}
        onRemove={() => setBaseImageUrl(null)}
        currentEditingImageUrl={currentEditingImageUrl}
      />

      {/* 이미지 2 */}
      <ImageSlot
        label={t("composeReferenceImage")}
        imageUrl={referenceImageUrl}
        onSelect={setReferenceImageUrl}
        onRemove={() => setReferenceImageUrl(null)}
        currentEditingImageUrl={currentEditingImageUrl}
      />

      {/* 프롬프트 */}
      <div className="space-y-1.5">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={t("composePrompt")}
          rows={3}
          className="w-full resize-none rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-primary focus:outline-none"
        />
      </div>

      {/* 모델 선택 */}
      {composeModels.length > 0 && (
        <div className="space-y-1.5">
          <span className="text-xs text-zinc-400">
            {t("composeModelLabel")}
          </span>
          <div className="flex flex-wrap gap-1.5">
            {composeModels.map((m) => (
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
      )}

      {/* 합성 버튼 */}
      <Button
        onClick={handleGenerate}
        disabled={!canGenerate}
        className="w-full cursor-pointer gap-2"
      >
        {isGenerating || isSubmitting ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Layers className="size-4" />
        )}
        {isGenerating ? t("composeLoading") : t("composeGenerate")}
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
              alt="Composed"
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
