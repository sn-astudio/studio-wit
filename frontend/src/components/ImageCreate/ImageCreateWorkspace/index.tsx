"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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

  // ── Mock mode (API 비용 없이 UI 테스트) ──
  const [mockMode, setMockMode] = useState(true);
  const [mockGenerating, setMockGenerating] = useState(false);
  const [mockProgress, setMockProgress] = useState<number | null>(null);
  const [mockGenerations, setMockGenerations] = useState<Generation[]>([]);

  // localStorage에서 mock 생성 이력 복원
  useEffect(() => {
    try {
      const saved = localStorage.getItem("mock-generations");
      if (saved) setMockGenerations(JSON.parse(saved));
    } catch {
      // ignore
    }
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
    mockGenerating || currentGen?.status === "pending" || currentGen?.status === "processing";
  const imageUrl =
    currentGen?.status === "completed"
      ? currentGen.result_url
      : selectedImageUrl;
  const progress = mockProgress ?? currentGen?.progress ?? null;

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
      // ── Mock mode: API 호출 없이 UI 플로우 시뮬레이션 ──
      if (mockMode) {
        if (mockGenerating) return;
        setMockGenerating(true);
        setMockProgress(0);
        setSelectedImageUrl(null);
        usePromptStore.getState().setPrompt("");

        let p = 0;
        const interval = setInterval(() => {
          p += Math.floor(Math.random() * 15) + 5;
          if (p >= 100) {
            p = 100;
            clearInterval(interval);
            setTimeout(() => {
              const mockUrl = `https://picsum.photos/seed/${Date.now()}/1024/1024`;
              setMockGenerating(false);
              setMockProgress(null);
              setSelectedImageUrl(mockUrl);
              setMockGenerations((prev) => {
                const next = [
                  {
                    id: `mock-${Date.now()}`,
                    prompt: state.prompt,
                    model_id: state.selectedModel,
                    status: "completed",
                    result_url: mockUrl,
                    created_at: new Date().toISOString(),
                  } as Generation,
                  ...prev,
                ];
                localStorage.setItem("mock-generations", JSON.stringify(next));
                return next;
              });
              toast.success(t("generateSuccess"));
            }, 500);
          }
          setMockProgress(p);
        }, 400);
        return;
      }

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
    [token, createMutation, isGenerating, t, mockGenerating, mockMode],
  );

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

  // 완료된 생성 이력만 추출 (mock + 실제)
  const apiGenerations =
    historyPages?.pages
      .flatMap((p) => p.generations)
      .filter((g) => g.status === "completed" && g.result_url) ?? [];
  const completedGenerations = [...mockGenerations, ...apiGenerations];

  return (
    <div className="relative flex h-[calc(100vh-64px-52px)] flex-col overflow-hidden bg-background">
      {/* Mock mode 토글 */}
      <button
        onClick={() => setMockMode((v) => !v)}
        className={`absolute top-3 right-3 z-20 flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium shadow-md transition-colors ${
          mockMode
            ? "bg-amber-500 text-white"
            : "bg-neutral-200 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300"
        }`}
      >
        <span className={`inline-block size-2 rounded-full ${mockMode ? "bg-white" : "bg-neutral-400"}`} />
        {mockMode ? "Mock ON" : "Mock OFF"}
      </button>

      {/* 프리뷰 + 히스토리 영역 (하단 입력창 높이만큼 패딩) */}
      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col overflow-auto px-4 md:px-6">
        <div className="flex-1 py-5 sm:py-6">
          <ImagePreview
            imageUrl={imageUrl ?? undefined}
            isGenerating={isGenerating || createMutation.isPending}
            progress={progress}
            generations={completedGenerations}
            onSelectGeneration={handleSelectGeneration}
            onEdit={onSwitchToEdit}
          />
        </div>
      </div>

      {/* PromptInput — 하단 플로팅 */}
      <div className="absolute inset-x-0 bottom-0 z-10 pt-6 pb-5 sm:pb-6">
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <PromptInput
            mode="image"
            disabled={isGenerating || createMutation.isPending}
            onSubmit={handleSubmit}
          />
        </div>
      </div>
    </div>
  );
}
