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

  // Mock mode states
  const [mockMode, setMockMode] = useState(true);
  const [mockGenerating, setMockGenerating] = useState(false);
  const [mockProgress, setMockProgress] = useState<number | null>(null);
  const [mockGenerations, setMockGenerations] = useState<Generation[]>([]);

  const createMutation = useCreateGeneration();
  const uploadImageMutation = useUploadImage();

  // Load mock generations from localStorage (seed defaults if empty)
  useEffect(() => {
    try {
      const saved = localStorage.getItem("mock-video-generations");
      if (saved) {
        setMockGenerations(JSON.parse(saved));
      } else {
        const defaults: Generation[] = [
          { id: "mock-seed-1", prompt: "A dreamy forest scene", model_id: "Veo 3", type: "video", status: "completed", result_url: "https://assets.mixkit.co/videos/34487/34487-720.mp4", thumbnail_url: null, aspect_ratio: "16:9", created_at: new Date(Date.now() - 3600000).toISOString(), completed_at: new Date(Date.now() - 3600000).toISOString(), progress: null, error: null },
          { id: "mock-seed-2", prompt: "Ocean waves at sunset", model_id: "Veo 3", type: "video", status: "completed", result_url: "https://assets.mixkit.co/videos/4883/4883-720.mp4", thumbnail_url: null, aspect_ratio: "16:9", created_at: new Date(Date.now() - 7200000).toISOString(), completed_at: new Date(Date.now() - 7200000).toISOString(), progress: null, error: null },
          { id: "mock-seed-3", prompt: "City lights at night", model_id: "Runway Gen-4", type: "video", status: "completed", result_url: "https://assets.mixkit.co/videos/32647/32647-720.mp4", thumbnail_url: null, aspect_ratio: "9:16", created_at: new Date(Date.now() - 10800000).toISOString(), completed_at: new Date(Date.now() - 10800000).toISOString(), progress: null, error: null },
          { id: "mock-seed-4", prompt: "Golden hour landscape", model_id: "Runway Gen-4", type: "video", status: "completed", result_url: "https://assets.mixkit.co/videos/4421/4421-720.mp4", thumbnail_url: null, aspect_ratio: "1:1", created_at: new Date(Date.now() - 14400000).toISOString(), completed_at: new Date(Date.now() - 14400000).toISOString(), progress: null, error: null },
          { id: "mock-seed-5", prompt: "Abstract particles flowing", model_id: "Veo 3", type: "video", status: "completed", result_url: "https://assets.mixkit.co/videos/3123/3123-720.mp4", thumbnail_url: null, aspect_ratio: "16:9", created_at: new Date(Date.now() - 18000000).toISOString(), completed_at: new Date(Date.now() - 18000000).toISOString(), progress: null, error: null },
        ];
        setMockGenerations(defaults);
        localStorage.setItem("mock-video-generations", JSON.stringify(defaults));
      }
    } catch { /* ignore */ }
  }, []);

  // 히스토리에서 진행중인 생성 감지 (새로고침 시 폴링 재개용)
  const { data: historyPages } = useGenerationHistory(
    token ? { type: "video", limit: 12 } : undefined,
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
  const videoUrl =
    currentGen?.status === "completed"
      ? currentGen.result_url
      : selectedVideoUrl;
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
      // Mock mode handling
      if (mockMode) {
        if (mockGenerating) return;
        setMockGenerating(true);
        setMockProgress(0);
        setSelectedVideoUrl(null);
        usePromptStore.getState().setPrompt("");
        let p = 0;
        const interval = setInterval(() => {
          p += Math.floor(Math.random() * 15) + 5;
          if (p >= 100) {
            p = 100;
            clearInterval(interval);
            setTimeout(() => {
              const ratio = state.params.aspectRatio ? String(state.params.aspectRatio) : "16:9";
              const seed = Date.now();
              const mockUrls: Record<string, string> = {
                "16:9": "https://assets.mixkit.co/videos/34487/34487-720.mp4",
                "9:16": "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4",
                "1:1": "https://assets.mixkit.co/videos/34563/34563-720.mp4",
              };
              const newGen: Generation = {
                id: `mock-${seed}`,
                prompt: state.prompt,
                model_id: state.selectedModel,
                type: "video",
                status: "completed",
                result_url: mockUrls[ratio] ?? mockUrls["16:9"],
                thumbnail_url: null,
                aspect_ratio: ratio,
                created_at: new Date().toISOString(),
                completed_at: new Date().toISOString(),
                progress: null,
                error: null,
              };
              setMockGenerating(false);
              setMockProgress(null);
              setSelectedVideoUrl(newGen.result_url ?? null);
              setMockGenerations((prev) => {
                const next = [newGen, ...prev];
                localStorage.setItem("mock-video-generations", JSON.stringify(next));
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
    [token, createMutation, uploadImageMutation, isGenerating, t, mockMode, mockGenerating],
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
  const completedGenerations = [...mockGenerations, ...apiGenerations];

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
          <VideoPreview
            videoUrl={videoUrl ?? undefined}
            isGenerating={isGenerating || createMutation.isPending}
            progress={progress}
            generatingRatio={usePromptStore.getState().params.aspectRatio as string}
            generations={completedGenerations}
            onSelectGeneration={handleSelectGeneration}
            onCancel={handleCancel}
            onDelete={(gen) => {
              if (gen.id.startsWith("mock-")) {
                setMockGenerations((prev) => {
                  const next = prev.filter((g) => g.id !== gen.id);
                  localStorage.setItem("mock-video-generations", JSON.stringify(next));
                  return next;
                });
                if (selectedVideoUrl === gen.result_url) {
                  setSelectedVideoUrl(null);
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
