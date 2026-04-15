"use client";

import { useTranslations } from "next-intl";
import { Globe, Image, Lock, Minus, Plus } from "lucide-react";

import { usePromptStore } from "@/stores/promptStore";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/Tooltip";

import { getModelsForMode, getOptionsForParam } from "../const";
import { ModelSelector } from "../ModelSelector";
import { OptionButton } from "../OptionButton";
import type { OptionsBarProps } from "./types";

function VisibilityToggle() {
  const t = useTranslations("PromptInput");
  const isPublic = usePromptStore((s) => s.isPublic);
  const setIsPublic = usePromptStore((s) => s.setIsPublic);

  return (
    <button
      type="button"
      className="flex h-10 shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-neutral-100 px-3 transition-colors hover:bg-neutral-200/60 active:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700/70 dark:active:bg-neutral-700"
      onClick={() => setIsPublic(!isPublic)}
      title={isPublic ? t("publicTooltip") : t("privateTooltip")}
    >
      {isPublic ? (
        <Globe className="size-5 opacity-35" strokeWidth={2} />
      ) : (
        <Lock className="size-5 opacity-35" strokeWidth={2} />
      )}
      <span className="text-[14px] font-[500]">
        {isPublic ? t("public") : t("private")}
      </span>
    </button>
  );
}

function NumImagesCounter() {
  const t = useTranslations("PromptInput");
  const numImages = usePromptStore((s) => s.params.numImages);
  const selectedModel = usePromptStore((s) => s.selectedModel);
  const setParam = usePromptStore((s) => s.setParam);

  const options = getOptionsForParam(selectedModel, "numImages");
  const maxVal = Math.max(...options.map((o) => Number(o.value)));
  const current = Number(numImages ?? 1);

  return (
    <Tooltip>
    <TooltipTrigger
      render={<div className="flex h-10 shrink-0 cursor-default items-center gap-0 whitespace-nowrap rounded-lg bg-neutral-100 px-2 dark:bg-neutral-800" />}
    >
      <button
        className="flex size-7 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-neutral-200/60 hover:text-foreground disabled:pointer-events-none disabled:opacity-20 dark:hover:bg-neutral-700/60"
        onClick={() => setParam("numImages", String(Math.max(1, current - 1)))}
        disabled={current <= 1}
        aria-label={t("params.numImages")}
      >
        <Minus className="size-4" strokeWidth={2.5} />
      </button>
      <span className="min-w-[2rem] text-center text-[14px] font-[500] text-muted-foreground">
        <span className="text-foreground">{current}</span><span className="opacity-50">/{maxVal}</span>
      </span>
      <button
        className="flex size-7 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-neutral-200/60 hover:text-foreground disabled:pointer-events-none disabled:opacity-20 dark:hover:bg-neutral-700/60"
        onClick={() =>
          setParam("numImages", String(Math.min(maxVal, current + 1)))
        }
        disabled={current >= maxVal}
        aria-label={t("params.numImages")}
      >
        <Plus className="size-4" strokeWidth={2.5} />
      </button>
    </TooltipTrigger>
    <TooltipContent>{t("params.numImages")}</TooltipContent>
    </Tooltip>
  );
}

export function OptionsBar({ mode }: OptionsBarProps) {
  const t = useTranslations("PromptInput");
  const selectedModel = usePromptStore((s) => s.selectedModel);
  const attachedImages = usePromptStore((s) => s.attachedImages);
  const inputImageUrl = usePromptStore((s) => s.inputImageUrl);
  const models = getModelsForMode(mode);

  if (models.length === 0) return null;

  const currentModel = models.find((m) => m.id === selectedModel);
  const supportedParams = currentModel?.supportedParams ?? [];

  const isImg2Vid =
    (attachedImages.length > 0 || !!inputImageUrl) &&
    (currentModel?.supportsImageInput ?? false);

  // Filter out numImages from regular option buttons — rendered as counter
  // Veo img2vid에서는 duration도 숨김 (Veo API가 img2vid에서 duration 미지원)
  const filteredParams = supportedParams.filter((p) => {
    if (p === "numImages") return false;
    if (p === "duration" && isImg2Vid && selectedModel.startsWith("veo-"))
      return false;
    return true;
  });
  const numImagesOptions = getOptionsForParam(selectedModel, "numImages");
  const hasNumImages = supportedParams.includes("numImages") && numImagesOptions.length > 1;

  return (
    <div
      className="flex w-max items-center gap-2"
      role="toolbar"
      aria-label="Generation options"
    >
      <ModelSelector models={models} />

      {isImg2Vid && (
        <span className="inline-flex items-center gap-1 rounded-md bg-violet-500/20 px-2 py-0.5 text-xs font-medium text-violet-300">
          <Image className="size-3" />
          {t("img2vidMode")}
        </span>
      )}

      {filteredParams.map((paramType) => (
        <OptionButton key={paramType} paramType={paramType} />
      ))}

      {hasNumImages && <NumImagesCounter />}

      {mode === "video" && <VisibilityToggle />}
    </div>
  );
}
