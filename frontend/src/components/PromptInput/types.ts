import type { LucideIcon } from "lucide-react";
import type { ComponentType, SVGProps } from "react";

export type PromptMode = "image" | "video";

export type ParamType =
  | "aspectRatio"
  | "numImages"
  | "quality"
  | "negativePrompt"
  | "guidanceScale"
  | "steps"
  | "seed"
  | "style"
  | "duration"
  | "resolution"
  | "cfgScale";

export type IconComponent = LucideIcon | ComponentType<SVGProps<SVGSVGElement>>;

export interface ModelDefinition {
  id: string;
  nameKey: string;
  icon: IconComponent;
  supportedParams: ParamType[];
}

export interface SelectOption {
  value: string;
  labelKey: string;
}

export interface ParamConfig {
  type: "select" | "slider" | "text";
  icon: LucideIcon;
  labelKey: string;
  options?: SelectOption[];
  min?: number;
  max?: number;
  step?: number;
  defaultValue: string | number;
}

export interface PromptInputState {
  prompt: string;
  attachedImages: File[];
  selectedModel: string;
  params: Record<string, string | number>;
  isPublic: boolean;
}

export interface PromptInputProps {
  mode: PromptMode;
  disabled?: boolean;
  onSubmit?: (state: PromptInputState) => void;
}

