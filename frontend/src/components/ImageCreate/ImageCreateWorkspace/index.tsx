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

  // Mock mode states
  const [mockMode, setMockMode] = useState(true);
  const [mockGenerating, setMockGenerating] = useState(false);
  const [mockProgress, setMockProgress] = useState<number | null>(null);
  const [mockGenerations, setMockGenerations] = useState<Generation[]>([]);

  const createMutation = useCreateGeneration();

  // Load mock generations from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("mock-generations");
      if (saved) setMockGenerations(JSON.parse(saved));
    } catch { /* ignore */ }
  }, []);

  // 히스토리에서 진행중인 생성 감지 (새로고침 시 폴링 재개용)
  const { data: historyPages } = useGenerationHistory(
    token ? { type: "image", limit: 12 } : undefined,
  );

  // 완료/실패 처리된 ID를 추적하여 중복 폴링 방지
  const handledIdsRef = useRef<Set<string>>(new Set());
  const mockIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
      // Mock mode handling
      if (mockMode) {
        if (mockGenerating) return;
        setMockGenerating(true);
        setMockProgress(0);
        setSelectedImageUrl(null);
        usePromptStore.getState().setPrompt("");
        setTimeout(() => contentTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
        let p = 0;
        const interval = setInterval(() => {
          p += Math.floor(Math.random() * 15) + 5;
          if (p >= 100) {
            p = 100;
            clearInterval(interval);
            setTimeout(() => {
              const ratio = state.params.aspectRatio ? String(state.params.aspectRatio) : "1:1";
              const [rw, rh] = ratio.split(":").map(Number);
              const baseSize = 1024;
              const imgW = rw >= rh ? baseSize : Math.round(baseSize * (rw / rh));
              const imgH = rh >= rw ? baseSize : Math.round(baseSize * (rh / rw));
              const numImages = Number(state.params.numImages) || 1;
              const newGens: Generation[] = [];
              for (let i = 0; i < numImages; i++) {
                const seed = Date.now() + i;
                newGens.push({
                  id: `mock-${seed}`,
                  prompt: state.prompt,
                  model_id: state.selectedModel,
                  type: "image",
                  status: "completed",
                  result_url: `https://picsum.photos/seed/${seed}/${imgW}/${imgH}`,
                  thumbnail_url: null,
                  aspect_ratio: ratio,
                  created_at: new Date().toISOString(),
                  completed_at: new Date().toISOString(),
                  progress: null,
                  error: null,
                });
              }
              setMockGenerating(false);
              setMockProgress(null);
              setSelectedImageUrl(newGens[0].result_url ?? null);
              setMockGenerations((prev) => {
                const next = [...newGens, ...prev];
                localStorage.setItem("mock-generations", JSON.stringify(next));
                return next;
              });
              toast.success(t("generateSuccess"));
            }, 500);
          }
          setMockProgress(p);
        }, 400);
        mockIntervalRef.current = interval;
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
            setTimeout(() => contentTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
          },
          onError: (err) => {
            toast.error(err.message || t("generateFailed"));
          },
        },
      );
    },
    [token, createMutation, isGenerating, t, mockMode, mockGenerating],
  );

  const handleCancel = useCallback(() => {
    if (mockIntervalRef.current) {
      clearInterval(mockIntervalRef.current);
      mockIntervalRef.current = null;
    }
    setMockGenerating(false);
    setMockProgress(null);
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
  const completedGenerations = [...mockGenerations, ...apiGenerations];

  const contentTopRef = useRef<HTMLDivElement>(null);

  return (
    <div className="relative bg-background">
      {/* Mock mode toggle */}
      <div className="absolute top-3 right-3 z-20 flex items-center gap-2">
        <button
          onClick={() => setMockMode((v) => !v)}
          className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium shadow-md transition-colors ${
            mockMode
              ? "bg-amber-500 text-white"
              : "bg-neutral-200 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300"
          }`}
        >
          <span className={`inline-block size-2 rounded-full ${mockMode ? "bg-white" : "bg-neutral-400"}`} />
          {mockMode ? "Mock ON" : "Mock OFF"}
        </button>
      </div>

      <div ref={contentTopRef} />
      {/* 프리뷰 + 히스토리 영역 (하단 입력창 높이만큼 패딩) */}
      <div className="mx-auto w-full max-w-7xl px-4 md:px-6">
        <div className="pt-5 pb-[240px] sm:pt-6">
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
            onDelete={(gen) => {
              if (gen.id.startsWith("mock-")) {
                setMockGenerations((prev) => {
                  const next = prev.filter((g) => g.id !== gen.id);
                  localStorage.setItem("mock-generations", JSON.stringify(next));
                  return next;
                });
                if (selectedImageUrl === gen.result_url) {
                  setSelectedImageUrl(null);
                }
              }
              // TODO: API 삭제 연동
            }}
          />
        </div>
      </div>

      {/* PromptInput — 하단 플로팅 (createPortal로 body에 렌더링) */}
      {typeof document !== "undefined" && createPortal(
        <div className="fixed inset-x-0 bottom-0 z-10 overscroll-none pt-6 pb-5 sm:pb-6" style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }} onTouchMove={(e) => e.stopPropagation()}>
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
