import type { GenerationStatus, ModelType } from "@/types/api";

export const queryKeys = {
  models: {
    all: ["models"] as const,
    list: (type?: ModelType) => [...queryKeys.models.all, { type }] as const,
  },

  gallery: {
    all: ["gallery"] as const,
    list: (params?: {
      type?: ModelType;
      model_id?: string;
      sort?: "recent" | "popular";
    }) => [...queryKeys.gallery.all, "list", params ?? {}] as const,
  },

  generation: {
    all: ["generation"] as const,
    detail: (id: string) =>
      [...queryKeys.generation.all, "detail", id] as const,
    history: (params?: { type?: ModelType; status?: GenerationStatus }) =>
      [...queryKeys.generation.all, "history", params ?? {}] as const,
  },
};
