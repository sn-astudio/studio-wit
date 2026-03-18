/**
 * 생성 작업 상태 관리 (Zustand)
 * - 생성 요청 → polling → 완료/실패
 * - 이력 목록 관리
 */

import { create } from "zustand";

import type {
  AIModel,
  GenerateRequest,
  Generation,
  ModelType,
} from "@/types/api";
import { generationApi, modelsApi } from "@/services/api";

interface GenerationState {
  /** 사용 가능한 AI 모델 목록 */
  models: AIModel[];
  /** 현재 진행 중인 생성 작업 */
  current: Generation | null;
  /** 내 생성 이력 */
  history: Generation[];
  historyCursor: string | null;
  historyHasMore: boolean;
  /** 로딩 상태 */
  isGenerating: boolean;
  isLoadingModels: boolean;
  isLoadingHistory: boolean;
  /** Polling 타이머 ID */
  _pollTimer: ReturnType<typeof setInterval> | null;

  /** 모델 목록 로드 */
  fetchModels: (type?: ModelType) => Promise<void>;
  /** 생성 요청 + 자동 polling 시작 */
  generate: (request: GenerateRequest) => Promise<void>;
  /** Polling 중지 */
  stopPolling: () => void;
  /** 이력 목록 로드 (페이지네이션) */
  fetchHistory: (reset?: boolean) => Promise<void>;
}

const POLL_INTERVAL = 2000;

export const useGenerationStore = create<GenerationState>((set, get) => ({
  models: [],
  current: null,
  history: [],
  historyCursor: null,
  historyHasMore: false,
  isGenerating: false,
  isLoadingModels: false,
  isLoadingHistory: false,
  _pollTimer: null,

  fetchModels: async (type) => {
    set({ isLoadingModels: true });
    try {
      const res = await modelsApi.list(type);
      set({ models: res.models, isLoadingModels: false });
    } catch {
      set({ isLoadingModels: false });
    }
  },

  generate: async (request) => {
    const { stopPolling } = get();
    stopPolling();

    set({ isGenerating: true, current: null });
    try {
      const res = await generationApi.create(request);
      set({ current: res.generation });

      // Polling 시작
      const timer = setInterval(async () => {
        const { current } = get();
        if (!current) {
          get().stopPolling();
          return;
        }

        try {
          const pollRes = await generationApi.get(current.id);
          const gen = pollRes.generation;
          set({ current: gen });

          if (gen.status === "completed" || gen.status === "failed") {
            get().stopPolling();
            set({ isGenerating: false });
          }
        } catch {
          get().stopPolling();
          set({ isGenerating: false });
        }
      }, POLL_INTERVAL);

      set({ _pollTimer: timer });
    } catch {
      set({ isGenerating: false });
    }
  },

  stopPolling: () => {
    const { _pollTimer } = get();
    if (_pollTimer) {
      clearInterval(_pollTimer);
      set({ _pollTimer: null });
    }
  },

  fetchHistory: async (reset = false) => {
    const { historyCursor, history } = get();
    set({ isLoadingHistory: true });

    try {
      const res = await generationApi.list({
        cursor: reset ? undefined : (historyCursor ?? undefined),
        limit: 20,
      });

      set({
        history: reset ? res.generations : [...history, ...res.generations],
        historyCursor: res.next_cursor,
        historyHasMore: res.has_more,
        isLoadingHistory: false,
      });
    } catch {
      set({ isLoadingHistory: false });
    }
  },
}));
