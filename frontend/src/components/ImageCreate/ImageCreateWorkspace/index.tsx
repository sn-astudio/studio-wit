"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { PromptInput } from "@/components/PromptInput";
import type { PromptInputState } from "@/components/PromptInput/types";
import type { Generation } from "@/types/api";
import { useAuthStore } from "@/stores/auth";
import { usePromptStore } from "@/stores/promptStore";
import { useQueryClient } from "@tanstack/react-query";
import {
  useCreateGeneration,
  useGeneration,
  useGenerationHistory,
} from "@/hooks/queries/useGeneration";
import { queryKeys } from "@/hooks/queries/keys";

import { ImagePreview } from "../ImagePreview";
import { toImageGenerateParams } from "./utils";

interface ImageCreateWorkspaceProps {
  onSwitchToEdit?: (imageUrl?: string) => void;
}

export function ImageCreateWorkspace({ onSwitchToEdit }: ImageCreateWorkspaceProps) {
  const t = useTranslations("ImageCreate");
  const token = useAuthStore((s) => s.token);
  const setPrompt = usePromptStore((s) => s.setPrompt);
  const setSelectedModel = usePromptStore((s) => s.setSelectedModel);
  const setParam = usePromptStore((s) => s.setParam);

  const queryClient = useQueryClient();
  const [currentGenId, setCurrentGenId] = useState<string | null>(null);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(
    null,
  );
  const [promptInputHeight, setPromptInputHeight] = useState(240);
  const promptInputWrapRef = useCallback((node: HTMLDivElement | null) => {
    if (!node) return;
    const update = () => setPromptInputHeight(node.offsetHeight);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(node);
    return () => ro.disconnect();
  }, []);

  const createMutation = useCreateGeneration();

  // 히스토리에서 진행중인 생성 감지 (새로고침 시 폴링 재개용)
  const { data: historyPages } = useGenerationHistory(
    token ? { type: "image", limit: 12 } : undefined,
  );

  // 완료/실패 처리된 ID를 추적하여 중복 폴링 방지
  const handledIdsRef = useRef<Set<string>>(new Set());

  // 새로고침 시 히스토리에서 진행중인 생성 감지 → 폴링 재개
  useEffect(() => {
    if (currentGenId) return;
    const gens = historyPages?.pages.flatMap((p) => p.generations) ?? [];
    const processing = gens.find(
      (g) =>
        (g.status === "pending" || g.status === "processing") &&
        !handledIdsRef.current.has(g.id),
    );
    if (processing) {
      prevStatusRef.current = processing.status;
      setCurrentGenId(processing.id);
    }
  }, [historyPages, currentGenId]);

  // currentGenId가 설정되어 있으면 폴링, 완료/실패 시 null로 초기화하여 폴링 중지
  const { data: pollingData } = useGeneration(currentGenId, !!currentGenId);
  const currentGen = pollingData?.generation ?? null;

  const isGenerating =
    currentGen?.status === "pending" || currentGen?.status === "processing";
  const imageUrl =
    currentGen?.status === "completed"
      ? currentGen.result_url
      : selectedImageUrl;
  const progress = currentGen?.progress ?? null;

  // 완료/실패 시 토스트
  const prevStatusRef = useRef<string | null>(null);
  useEffect(() => {
    if (!currentGen) return;
    const prev = prevStatusRef.current;
    prevStatusRef.current = currentGen.status;

    if (prev && prev !== currentGen.status) {
      if (currentGen.status === "completed") {
        handledIdsRef.current.add(currentGen.id);
        toast.success(t("generateSuccess"));
        setSelectedImageUrl(currentGen.result_url ?? null);
        setCurrentGenId(null);
        queryClient.invalidateQueries({ queryKey: queryKeys.generation.all });
      } else if (currentGen.status === "failed") {
        handledIdsRef.current.add(currentGen.id);
        toast.error(currentGen.error?.message ?? t("generateFailed"));
        setCurrentGenId(null);
        queryClient.invalidateQueries({ queryKey: queryKeys.generation.all });
      }
    }
  }, [currentGen, t, queryClient]);

  const handleSubmit = useCallback(
    (state: PromptInputState) => {
      if (!token) {
        toast.error(t("loginRequired"));
        return;
      }
      if (createMutation.isPending || isGenerating) return;

      const params = toImageGenerateParams(state.params);

      createMutation.mutate(
        {
          model_id: state.selectedModel,
          prompt: state.prompt,
          negative_prompt: state.params.negativePrompt
            ? String(state.params.negativePrompt)
            : undefined,
          params,
        },
        {
          onSuccess: (res) => {
            setSelectedImageUrl(null);
            prevStatusRef.current = res.generation.status;
            setCurrentGenId(res.generation.id);
            usePromptStore.getState().setPrompt("");
              },
          onError: (err) => {
            toast.error(err.message || t("generateFailed"));
          },
        },
      );
    },
    [token, createMutation, isGenerating, t],
  );

  const handleCancel = useCallback(() => {
    setCurrentGenId(null);
    toast(t("generationCancelled"));
  }, [t]);

  const handleSelectGeneration = useCallback(
    (gen: Generation) => {
      setCurrentGenId(null);
      setSelectedImageUrl(gen.result_url ?? null);

      // promptStore에 프롬프트/모델/파라미터 복원
      setPrompt(gen.prompt);
      setSelectedModel(gen.model_id);
      if (gen.aspect_ratio) {
        setParam("aspectRatio", gen.aspect_ratio);
      }
    },
    [setPrompt, setSelectedModel, setParam],
  );

  // 완료된 생성 이력만 추출
  const apiGenerations =
    historyPages?.pages
      .flatMap((p) => p.generations)
      .filter((g) => g.status === "completed" && g.result_url) ?? [];
  const completedGenerations = apiGenerations;

  const contentTopRef = useRef<HTMLDivElement>(null);

  return (
    <div className="relative bg-background">
      <div ref={contentTopRef} />
      {/* 프리뷰 + 히스토리 영역 (하단 입력창 높이만큼 패딩) */}
      <div className="mx-auto flex w-full max-w-7xl flex-col px-4 md:px-6" style={{ minHeight: `calc(100vh - 64px - ${promptInputHeight}px)` }}>
        <div className="flex flex-1 flex-col pt-5 sm:pt-6">
          <ImagePreview
            imageUrl={imageUrl ?? undefined}
            isGenerating={isGenerating || createMutation.isPending}
            progress={progress}
            generatingRatio={usePromptStore.getState().params.aspectRatio as string}
            generatingCount={Number(usePromptStore.getState().params.numImages) || 1}
            generations={completedGenerations}
            onSelectGeneration={handleSelectGeneration}
            onCancel={handleCancel}
            onEdit={onSwitchToEdit}
            onDelete={() => {
              // TODO: API 삭제 연동
            }}
          />
        </div>
      </div>

      {/* PromptInput — 하단 플로팅 (createPortal로 body에 렌더링) */}
      {typeof document !== "undefined" && createPortal(
        <div ref={promptInputWrapRef} className="fixed inset-x-0 bottom-0 z-10 overscroll-none pt-6 pb-5 sm:pb-6" style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }} onTouchMove={(e) => e.stopPropagation()}>
          <div className="mx-auto max-w-7xl px-3 md:px-6">
            <PromptInput
              mode="image"
              disabled={isGenerating || createMutation.isPending}
              onSubmit={handleSubmit}
            />
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
