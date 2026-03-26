"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
import { queryKeys } from "@/hooks/queries/keys";

import { VideoPreview } from "../VideoPreview";
import { GenerationHistory } from "../GenerationHistory";
import { useNotifyOnComplete } from "@/hooks/useNotifyOnComplete";

import { extractNegativePrompt, toGenerateParams } from "./utils";

export function VideoCreateWorkspace() {
  const t = useTranslations("VideoCreate");
  const token = useAuthStore((s) => s.token);

  const queryClient = useQueryClient();
  const notify = useNotifyOnComplete();
  const [currentGenId, setCurrentGenId] = useState<string | null>(null);
  const [selectedVideoUrl, setSelectedVideoUrl] = useState<string | null>(null);
  const [historyExpanded, setHistoryExpanded] = useState(false);

  const createMutation = useCreateGeneration();

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

  const handleSubmit = useCallback(
    (state: PromptInputState) => {
      if (!token) {
        toast.error(t("loginRequired"));
        return;
      }
      if (createMutation.isPending || isGenerating) return;

      const params = toGenerateParams(state.params);
      const negative_prompt = extractNegativePrompt(state.params);

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
    [token, createMutation, isGenerating, t],
  );

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

  const handleToggleHistory = useCallback(() => {
    setHistoryExpanded((prev) => !prev);
  }, []);

  return (
    <div className="min-h-[calc(100vh-64px)]">
      {/* Video preview — 전체 보기 모드에서 숨김 */}
      {!historyExpanded && (
        <div className="aspect-video max-h-[40vh] p-3 sm:aspect-auto sm:h-[45vh] sm:max-h-none sm:p-4">
          <VideoPreview
            videoUrl={videoUrl ?? undefined}
            isGenerating={isGenerating || createMutation.isPending}
            progress={progress}
          />
        </div>
      )}

      {/* PromptInput — 전체 보기 모드에서 숨김 */}
      {!historyExpanded && (
        <div className="px-3 pb-2 sm:px-4 sm:pb-3">
          <PromptInput mode="video" disabled={isGenerating || createMutation.isPending} onSubmit={handleSubmit} />
        </div>
      )}

      {/* Generation history */}
      <GenerationHistory
        onSelect={handleSelectGeneration}
        expanded={historyExpanded}
        onToggleExpand={handleToggleHistory}
      />
    </div>
  );
}
