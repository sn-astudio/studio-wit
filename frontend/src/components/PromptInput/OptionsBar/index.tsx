"use client";

import { useTranslations } from "next-intl";
import { Image, Minus, Plus } from "lucide-react";

import { Separator } from "@/components/ui/Separator";
import { usePromptStore } from "@/stores/promptStore";

import { getModelsForMode, getOptionsForParam } from "../const";
import { ModelSelector } from "../ModelSelector";
import { OptionButton } from "../OptionButton";
import type { OptionsBarProps } from "./types";

function NumImagesCounter() {
  const t = useTranslations("PromptInput");
  const numImages = usePromptStore((s) => s.params.numImages);
  const selectedModel = usePromptStore((s) => s.selectedModel);
  const setParam = usePromptStore((s) => s.setParam);

  const options = getOptionsForParam(selectedModel, "numImages");
  const maxVal = Math.max(...options.map((o) => Number(o.value)));
  const current = Number(numImages ?? 1);

  return (
    <div className="flex items-center gap-0.5 rounded-lg bg-zinc-800/60 px-1">
      <button
        className="flex size-6 items-center justify-center rounded text-zinc-400 transition-colors hover:text-zinc-200 disabled:opacity-30"
        onClick={() => setParam("numImages", String(Math.max(1, current - 1)))}
        disabled={current <= 1}
        aria-label={t("params.numImages")}
      >
        <Minus className="size-3.5" />
      </button>
      <span className="min-w-[2rem] text-center text-xs text-zinc-300">
        {current}/{maxVal}
      </span>
      <button
        className="flex size-6 items-center justify-center rounded text-zinc-400 transition-colors hover:text-zinc-200 disabled:opacity-30"
        onClick={() =>
          setParam("numImages", String(Math.min(maxVal, current + 1)))
        }
        disabled={current >= maxVal}
        aria-label={t("params.numImages")}
      >
        <Plus className="size-3.5" />
      </button>
    </div>
  );
}

export function OptionsBar({ mode }: OptionsBarProps) {
  const t = useTranslations("PromptInput");
  const selectedModel = usePromptStore((s) => s.selectedModel);
  const attachedImages = usePromptStore((s) => s.attachedImages);
  const models = getModelsForMode(mode);

  if (models.length === 0) return null;

  const currentModel = models.find((m) => m.id === selectedModel);
  const supportedParams = currentModel?.supportedParams ?? [];

  const isImg2Vid =
    attachedImages.length > 0 && (currentModel?.supportsImageInput ?? false);

  // Filter out numImages from regular option buttons — rendered as counter
  // Veo img2vid에서는 duration도 숨김 (Veo API가 img2vid에서 duration 미지원)
  const filteredParams = supportedParams.filter((p) => {
    if (p === "numImages") return false;
    if (p === "duration" && isImg2Vid && selectedModel.startsWith("veo-"))
      return false;
    return true;
  });
  const hasNumImages = supportedParams.includes("numImages");

  return (
    <div
      className="mt-2 flex items-center gap-1 overflow-x-auto"
      role="toolbar"
      aria-label="Generation options"
    >
      <ModelSelector models={models} />

      {isImg2Vid && (
        <>
          <Separator orientation="vertical" className="mx-0.5 h-5" />
          <span className="inline-flex items-center gap-1 rounded-md bg-violet-500/20 px-2 py-0.5 text-xs font-medium text-violet-300">
            <Image className="size-3" />
            {t("img2vidMode")}
          </span>
        </>
      )}

      {filteredParams.length > 0 && (
        <>
          <Separator orientation="vertical" className="mx-0.5 h-5" />
          {filteredParams.map((paramType) => (
            <OptionButton key={paramType} paramType={paramType} />
          ))}
        </>
      )}

      {hasNumImages && (
        <>
          <Separator orientation="vertical" className="mx-0.5 h-5" />
          <NumImagesCounter />
        </>
      )}

      {/* TODO: @ mention, Extra free gens, Draw — hidden for now */}
    </div>
  );
}
