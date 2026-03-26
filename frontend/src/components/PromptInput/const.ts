import {
  Sparkles,
  RectangleHorizontal,
  Grid2x2,
  Ban,
  Gauge,
  Layers,
  Dices,
  Palette,
  Clock,
  Monitor,
} from "lucide-react";

import {
  GoogleIcon,
  OpenAIIcon,
  FluxIcon,
  KlingIcon,
} from "@/components/icons/BrandIcons";

import type {
  ModelDefinition,
  ParamConfig,
  ParamType,
  SelectOption,
} from "./types";

export const IMAGE_MODELS: ModelDefinition[] = [
  {
    id: "nano-banana-pro",
    nameKey: "models.nano-banana-pro",
    icon: GoogleIcon,
    supportedParams: ["aspectRatio", "numImages"],
  },
  {
    id: "imagen-4",
    nameKey: "models.imagen-4",
    icon: GoogleIcon,
    supportedParams: ["aspectRatio", "numImages"],
  },
  {
    id: "gpt-image-1",
    nameKey: "models.gpt-image-1",
    icon: OpenAIIcon,
    supportedParams: ["aspectRatio", "numImages", "quality"],
  },
  {
    id: "flux-2-pro",
    nameKey: "models.flux-2-pro",
    icon: FluxIcon,
    supportedParams: [
      "aspectRatio",
      "numImages",
      "negativePrompt",
      "guidanceScale",
      "steps",
      "seed",
    ],
  },
];

export const VIDEO_MODELS: ModelDefinition[] = [
  {
    id: "veo-3",
    nameKey: "models.veo-3",
    icon: GoogleIcon,
    supportedParams: ["aspectRatio", "duration"],
  },
  {
    id: "veo-3.1",
    nameKey: "models.veo-3_1",
    icon: GoogleIcon,
    supportedParams: ["aspectRatio", "duration", "resolution"],
  },
  {
    id: "veo-3.1-fast",
    nameKey: "models.veo-3_1-fast",
    icon: GoogleIcon,
    supportedParams: ["aspectRatio", "duration", "resolution"],
  },
  {
    id: "sora-2",
    nameKey: "models.sora-2",
    icon: OpenAIIcon,
    supportedParams: ["aspectRatio", "duration"],
  },
  {
    id: "sora-2-pro",
    nameKey: "models.sora-2-pro",
    icon: OpenAIIcon,
    supportedParams: ["aspectRatio", "duration"],
  },
  {
    id: "kling",
    nameKey: "models.kling",
    icon: KlingIcon,
    supportedParams: ["aspectRatio", "duration", "negativePrompt", "cfgScale"],
  },
];

export const PARAM_CONFIGS: Record<ParamType, ParamConfig> = {
  aspectRatio: {
    type: "select",
    icon: RectangleHorizontal,
    labelKey: "params.aspectRatio",
    options: [
      { value: "1:1", labelKey: "aspectRatios.1:1" },
      { value: "16:9", labelKey: "aspectRatios.16:9" },
      { value: "9:16", labelKey: "aspectRatios.9:16" },
      { value: "4:3", labelKey: "aspectRatios.4:3" },
      { value: "3:4", labelKey: "aspectRatios.3:4" },
      { value: "3:2", labelKey: "aspectRatios.3:2" },
      { value: "2:3", labelKey: "aspectRatios.2:3" },
      { value: "4:5", labelKey: "aspectRatios.4:5" },
      { value: "5:4", labelKey: "aspectRatios.5:4" },
      { value: "1:4", labelKey: "aspectRatios.1:4" },
      { value: "4:1", labelKey: "aspectRatios.4:1" },
      { value: "1:8", labelKey: "aspectRatios.1:8" },
      { value: "8:1", labelKey: "aspectRatios.8:1" },
      { value: "21:9", labelKey: "aspectRatios.21:9" },
    ],
    defaultValue: "1:1",
  },
  numImages: {
    type: "select",
    icon: Grid2x2,
    labelKey: "params.numImages",
    options: [
      { value: "1", labelKey: "numImages.1" },
      { value: "2", labelKey: "numImages.2" },
      { value: "3", labelKey: "numImages.3" },
      { value: "4", labelKey: "numImages.4" },
    ],
    defaultValue: "1",
  },
  quality: {
    type: "select",
    icon: Sparkles,
    labelKey: "params.quality",
    options: [
      { value: "standard", labelKey: "qualities.standard" },
      { value: "hd", labelKey: "qualities.hd" },
    ],
    defaultValue: "standard",
  },
  style: {
    type: "select",
    icon: Palette,
    labelKey: "params.style",
    options: [
      { value: "natural", labelKey: "styles.natural" },
      { value: "vivid", labelKey: "styles.vivid" },
      { value: "anime", labelKey: "styles.anime" },
      { value: "photographic", labelKey: "styles.photographic" },
    ],
    defaultValue: "natural",
  },
  negativePrompt: {
    type: "text",
    icon: Ban,
    labelKey: "params.negativePrompt",
    defaultValue: "",
  },
  guidanceScale: {
    type: "slider",
    icon: Gauge,
    labelKey: "params.guidanceScale",
    min: 1,
    max: 20,
    step: 0.5,
    defaultValue: 7.5,
  },
  steps: {
    type: "slider",
    icon: Layers,
    labelKey: "params.steps",
    min: 1,
    max: 50,
    step: 1,
    defaultValue: 20,
  },
  seed: {
    type: "text",
    icon: Dices,
    labelKey: "params.seed",
    defaultValue: "",
  },
  duration: {
    type: "select",
    icon: Clock,
    labelKey: "params.duration",
    options: [
      { value: "3", labelKey: "durations.3" },
      { value: "4", labelKey: "durations.4" },
      { value: "5", labelKey: "durations.5" },
      { value: "6", labelKey: "durations.6" },
      { value: "7", labelKey: "durations.7" },
      { value: "8", labelKey: "durations.8" },
      { value: "10", labelKey: "durations.10" },
      { value: "15", labelKey: "durations.15" },
      { value: "16", labelKey: "durations.16" },
      { value: "20", labelKey: "durations.20" },
    ],
    defaultValue: "8",
  },
  resolution: {
    type: "select",
    icon: Monitor,
    labelKey: "params.resolution",
    options: [
      { value: "720p", labelKey: "resolutions.720p" },
      { value: "1080p", labelKey: "resolutions.1080p" },
      { value: "4k", labelKey: "resolutions.4k" },
    ],
    defaultValue: "720p",
  },
  cfgScale: {
    type: "slider",
    icon: Gauge,
    labelKey: "params.cfgScale",
    min: 0,
    max: 1,
    step: 0.05,
    defaultValue: 0.5,
  },
};

// Model-specific option overrides for select-type params
// If a model is not listed here for a param, it uses the full options from PARAM_CONFIGS
export const MODEL_PARAM_OPTIONS: Record<
  string,
  Partial<Record<ParamType, SelectOption[]>>
> = {
  "nano-banana-pro": {
    aspectRatio: [
      { value: "1:1", labelKey: "aspectRatios.1:1" },
      { value: "16:9", labelKey: "aspectRatios.16:9" },
      { value: "9:16", labelKey: "aspectRatios.9:16" },
      { value: "4:3", labelKey: "aspectRatios.4:3" },
      { value: "3:4", labelKey: "aspectRatios.3:4" },
      { value: "3:2", labelKey: "aspectRatios.3:2" },
      { value: "2:3", labelKey: "aspectRatios.2:3" },
      { value: "4:5", labelKey: "aspectRatios.4:5" },
      { value: "5:4", labelKey: "aspectRatios.5:4" },
      { value: "21:9", labelKey: "aspectRatios.21:9" },
    ],
    numImages: [
      { value: "1", labelKey: "numImages.1" },
      { value: "2", labelKey: "numImages.2" },
      { value: "3", labelKey: "numImages.3" },
      { value: "4", labelKey: "numImages.4" },
    ],
  },
  "imagen-4": {
    aspectRatio: [
      { value: "1:1", labelKey: "aspectRatios.1:1" },
      { value: "16:9", labelKey: "aspectRatios.16:9" },
      { value: "9:16", labelKey: "aspectRatios.9:16" },
      { value: "4:3", labelKey: "aspectRatios.4:3" },
      { value: "3:4", labelKey: "aspectRatios.3:4" },
      { value: "3:2", labelKey: "aspectRatios.3:2" },
      { value: "2:3", labelKey: "aspectRatios.2:3" },
      { value: "4:5", labelKey: "aspectRatios.4:5" },
      { value: "5:4", labelKey: "aspectRatios.5:4" },
      { value: "21:9", labelKey: "aspectRatios.21:9" },
    ],
    numImages: [
      { value: "1", labelKey: "numImages.1" },
      { value: "2", labelKey: "numImages.2" },
      { value: "3", labelKey: "numImages.3" },
      { value: "4", labelKey: "numImages.4" },
    ],
  },
  "gpt-image-1": {
    aspectRatio: [
      { value: "1:1", labelKey: "aspectRatios.1:1" },
      { value: "16:9", labelKey: "aspectRatios.16:9" },
      { value: "9:16", labelKey: "aspectRatios.9:16" },
    ],
    numImages: [{ value: "1", labelKey: "numImages.1" }],
  },
  "flux-2-pro": {
    aspectRatio: [
      { value: "1:1", labelKey: "aspectRatios.1:1" },
      { value: "16:9", labelKey: "aspectRatios.16:9" },
      { value: "9:16", labelKey: "aspectRatios.9:16" },
      { value: "4:3", labelKey: "aspectRatios.4:3" },
      { value: "3:4", labelKey: "aspectRatios.3:4" },
      { value: "3:2", labelKey: "aspectRatios.3:2" },
      { value: "2:3", labelKey: "aspectRatios.2:3" },
    ],
    numImages: [
      { value: "1", labelKey: "numImages.1" },
      { value: "2", labelKey: "numImages.2" },
      { value: "3", labelKey: "numImages.3" },
      { value: "4", labelKey: "numImages.4" },
    ],
  },
  "veo-3": {
    aspectRatio: [
      { value: "16:9", labelKey: "aspectRatios.16:9" },
      { value: "9:16", labelKey: "aspectRatios.9:16" },
    ],
    duration: [
      { value: "4", labelKey: "durations.4" },
      { value: "6", labelKey: "durations.6" },
      { value: "8", labelKey: "durations.8" },
    ],
  },
  "veo-3.1": {
    aspectRatio: [
      { value: "16:9", labelKey: "aspectRatios.16:9" },
      { value: "9:16", labelKey: "aspectRatios.9:16" },
    ],
    duration: [
      { value: "4", labelKey: "durations.4" },
      { value: "6", labelKey: "durations.6" },
      { value: "8", labelKey: "durations.8" },
    ],
  },
  "veo-3.1-fast": {
    aspectRatio: [
      { value: "16:9", labelKey: "aspectRatios.16:9" },
      { value: "9:16", labelKey: "aspectRatios.9:16" },
    ],
    duration: [
      { value: "4", labelKey: "durations.4" },
      { value: "6", labelKey: "durations.6" },
      { value: "8", labelKey: "durations.8" },
    ],
  },
  "sora-2": {
    aspectRatio: [
      { value: "16:9", labelKey: "aspectRatios.16:9" },
      { value: "9:16", labelKey: "aspectRatios.9:16" },
    ],
    duration: [
      { value: "4", labelKey: "durations.4" },
      { value: "8", labelKey: "durations.8" },
      { value: "16", labelKey: "durations.16" },
      { value: "20", labelKey: "durations.20" },
    ],
  },
  "sora-2-pro": {
    aspectRatio: [
      { value: "16:9", labelKey: "aspectRatios.16:9" },
      { value: "9:16", labelKey: "aspectRatios.9:16" },
    ],
    duration: [
      { value: "4", labelKey: "durations.4" },
      { value: "8", labelKey: "durations.8" },
      { value: "16", labelKey: "durations.16" },
      { value: "20", labelKey: "durations.20" },
    ],
  },
  "kling": {
    aspectRatio: [
      { value: "16:9", labelKey: "aspectRatios.16:9" },
      { value: "9:16", labelKey: "aspectRatios.9:16" },
      { value: "1:1", labelKey: "aspectRatios.1:1" },
    ],
    duration: [
      { value: "5", labelKey: "durations.5" },
      { value: "10", labelKey: "durations.10" },
    ],
  },
};

export function getModelsForMode(mode: "image" | "video"): ModelDefinition[] {
  return mode === "image" ? IMAGE_MODELS : VIDEO_MODELS;
}

export function getOptionsForParam(
  modelId: string,
  paramType: ParamType,
): SelectOption[] {
  const modelOverrides = MODEL_PARAM_OPTIONS[modelId];
  if (modelOverrides?.[paramType]) {
    return modelOverrides[paramType];
  }
  return PARAM_CONFIGS[paramType].options ?? [];
}

export function getDefaultParams(
  modelId: string,
  models: ModelDefinition[],
): Record<string, string | number> {
  const model = models.find((m) => m.id === modelId);
  if (!model) return {};

  const params: Record<string, string | number> = {};
  for (const paramType of model.supportedParams) {
    const config = PARAM_CONFIGS[paramType];
    if (config.type === "select") {
      const options = getOptionsForParam(modelId, paramType);
      const defaultValid = options.some(
        (o) => o.value === String(config.defaultValue),
      );
      params[paramType] = defaultValid
        ? config.defaultValue
        : (options[0]?.value ?? config.defaultValue);
    } else {
      params[paramType] = config.defaultValue;
    }
  }
  return params;
}
