"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { PromptInput } from "@/components/PromptInput";
import type { PromptInputState } from "@/components/PromptInput/types";
import { useAuthStore } from "@/stores/auth";
import { usePromptStore } from "@/stores/promptStore";
import type { Generation } from "@/types/api";
import { useQueryClient } from "@tanstack/react-query";
import {
  useCreateGeneration,
  useGeneration,
  useGenerationHistory,
} from "@/hooks/queries/useGeneration";
import { useUploadImage } from "@/hooks/queries/useImageUpload";
import { queryKeys } from "@/hooks/queries/keys";
import { doesModelSupportImageInput } from "@/components/PromptInput/const";

import { VideoPreview } from "../VideoPreview";
import { useNotifyOnComplete } from "@/hooks/useNotifyOnComplete";

import { extractNegativePrompt, toGenerateParams } from "./utils";

export function VideoCreateWorkspace() {
  const t = useTranslations("VideoCreate");
  const token = useAuthStore((s) => s.token);

  const queryClient = useQueryClient();
  const notify = useNotifyOnComplete();
  const [currentGenId, setCurrentGenId] = useState<string | null>(null);
  const [selectedVideoUrl, setSelectedVideoUrl] = useState<string | null>(null);
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
  const uploadImageMutation = useUploadImage();

  // 히스토리에서 진행중인 생성 감지 (새로고침 시 폴링 재개용)
  const { data: historyPages } = useGenerationHistory(
    token ? { type: "video", limit: 12 } : undefined,
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
  const videoUrl =
    currentGen?.status === "completed"
      ? currentGen.result_url
      : selectedVideoUrl;
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
        notify(t("generateSuccess"), currentGen.prompt ?? undefined);
        setSelectedVideoUrl(currentGen.result_url ?? null);
        setCurrentGenId(null);
        queryClient.invalidateQueries({ queryKey: queryKeys.generation.all });
      } else if (currentGen.status === "failed") {
        handledIdsRef.current.add(currentGen.id);
        toast.error(currentGen.error?.message ?? t("generateFailed"));
        notify(t("generateFailed"), currentGen.error?.message ?? undefined);
        setCurrentGenId(null);
        queryClient.invalidateQueries({ queryKey: queryKeys.generation.all });
      }
    }
  }, [currentGen, t, queryClient, notify]);

  const contentTopRef = useRef<HTMLDivElement>(null);

  const handleSubmit = useCallback(
    async (state: PromptInputState) => {
      if (!token) {
        toast.error(t("loginRequired"));
        return;
      }
      if (createMutation.isPending || uploadImageMutation.isPending || isGenerating) return;

      const params = toGenerateParams(state.params);
      const negative_prompt = extractNegativePrompt(state.params);

      // 비지원 모델에 이미지 첨부 시 차단
      if (state.attachedImages.length > 0 && !doesModelSupportImageInput(state.selectedModel)) {
        toast.error(t("imageNotSupported"));
        return;
      }

      // 첨부 이미지가 있으면 업로드 → input_image_url 설정
      if (state.attachedImages.length > 0) {
        try {
          const { url } = await uploadImageMutation.mutateAsync(state.attachedImages[0]);
          params.input_image_url = url;
        } catch (err) {
          toast.error(err instanceof Error ? err.message : t("generateFailed"));
          return;
        }
      }

      createMutation.mutate(
        {
          model_id: state.selectedModel,
          prompt: state.prompt,
          negative_prompt,
          params,
          is_public: state.isPublic,
        },
        {
          onSuccess: (res) => {
            setSelectedVideoUrl(null);
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
    [token, createMutation, uploadImageMutation, isGenerating, t],
  );

  const handleCancel = useCallback(() => {
    setCurrentGenId(null);
    toast(t("generationCancelled"));
  }, [t]);

  const restoreFromGeneration = usePromptStore((s) => s.restoreFromGeneration);

  const handleSelectGeneration = useCallback(
    (gen: Generation) => {
      setCurrentGenId(null);
      setSelectedVideoUrl(gen.result_url ?? null);
      restoreFromGeneration(gen);
      // 모바일: 스크롤 맨 위로
      window.scrollTo({ top: 0, behavior: "instant" });
    },
    [restoreFromGeneration],
  );

  // 완료된 생성 이력만 추출
  const apiGenerations =
    historyPages?.pages
      .flatMap((p) => p.generations)
      .filter((g) => g.status === "completed" && g.result_url) ?? [];
  const completedGenerations = apiGenerations;

  return (
    <div className="relative bg-background">
      <div ref={contentTopRef} />
      {/* 프리뷰 + 히스토리 영역 (하단 입력창 높이만큼 패딩) */}
      <div className="mx-auto flex w-full max-w-7xl flex-col px-4 md:px-6" style={{ minHeight: `calc(100vh - 64px - ${promptInputHeight}px)` }}>
        <div className="flex flex-1 flex-col pt-5 sm:pt-6">
          <VideoPreview
            videoUrl={videoUrl ?? undefined}
            isGenerating={isGenerating || createMutation.isPending}
            progress={progress}
            generatingRatio={usePromptStore.getState().params.aspectRatio as string}
            generations={completedGenerations}
            onSelectGeneration={handleSelectGeneration}
            onCancel={handleCancel}
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
              mode="video"
              disabled={isGenerating || createMutation.isPending || uploadImageMutation.isPending}
              onSubmit={handleSubmit}
            />
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
