import { create } from "zustand";

import {
  IMAGE_MODELS,
  VIDEO_MODELS,
  getDefaultParams,
} from "@/components/PromptInput/const";
import type { PromptMode } from "@/components/PromptInput/types";
import type { Generation } from "@/types/api";

interface PromptStore {
  mode: PromptMode;
  prompt: string;
  attachedImages: File[];
  selectedModel: string;
  params: Record<string, string | number>;
  isPublic: boolean;

  setMode: (mode: PromptMode) => void;
  setPrompt: (prompt: string) => void;
  setSelectedModel: (modelId: string) => void;
  setParam: (key: string, value: string | number) => void;
  setIsPublic: (isPublic: boolean) => void;
  addImage: (file: File) => void;
  removeImage: (index: number) => void;
  reset: () => void;
  restoreFromGeneration: (gen: Generation) => void;
}

export const usePromptStore = create<PromptStore>((set, get) => ({
  mode: "image",
  prompt: "",
  attachedImages: [],
  selectedModel: IMAGE_MODELS[0]?.id ?? "",
  params: getDefaultParams(IMAGE_MODELS[0]?.id ?? "", IMAGE_MODELS),
  isPublic: false,

  setMode: (mode) => {
    const models = mode === "image" ? IMAGE_MODELS : VIDEO_MODELS;
    const defaultModel = models[0]?.id ?? "";
    set({
      mode,
      selectedModel: defaultModel,
      params: getDefaultParams(defaultModel, models),
    });
  },

  setPrompt: (prompt) => set({ prompt }),

  setSelectedModel: (modelId) => {
    const { mode } = get();
    const models = mode === "image" ? IMAGE_MODELS : VIDEO_MODELS;
    set({
      selectedModel: modelId,
      params: getDefaultParams(modelId, models),
    });
  },

  setParam: (key, value) =>
    set((state) => ({
      params: { ...state.params, [key]: value },
    })),

  setIsPublic: (isPublic) => set({ isPublic }),

  addImage: (file) =>
    set((state) => ({
      attachedImages: [...state.attachedImages, file],
    })),

  removeImage: (index) =>
    set((state) => ({
      attachedImages: state.attachedImages.filter((_, i) => i !== index),
    })),

  reset: () => {
    const { mode } = get();
    const models = mode === "image" ? IMAGE_MODELS : VIDEO_MODELS;
    const defaultModel = models[0]?.id ?? "";
    set({
      prompt: "",
      attachedImages: [],
      selectedModel: defaultModel,
      params: getDefaultParams(defaultModel, models),
      isPublic: false,
    });
  },

  restoreFromGeneration: (gen) => {
    const models = gen.type === "image" ? IMAGE_MODELS : VIDEO_MODELS;
    // 모델이 목록에 있는지 확인, 없으면 첫 번째 모델로 폴백
    const modelExists = models.some((m) => m.id === gen.model_id);
    const modelId = modelExists ? gen.model_id : models[0]?.id ?? "";
    const defaultParams = getDefaultParams(modelId, models);

    // 생성 당시의 파라미터로 덮어쓰기
    const restoredParams: Record<string, string | number> = {
      ...defaultParams,
    };
    if (gen.aspect_ratio) {
      restoredParams.aspectRatio = gen.aspect_ratio;
    }

    set({
      prompt: gen.prompt,
      selectedModel: modelId,
      params: restoredParams,
      attachedImages: [],
    });
  },
}));
