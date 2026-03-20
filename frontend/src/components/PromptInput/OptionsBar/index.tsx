"use client";

import { useTranslations } from "next-intl";
import { Minus, Plus } from "lucide-react";

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
  const selectedModel = usePromptStore((s) => s.selectedModel);
  const models = getModelsForMode(mode);

  if (models.length === 0) return null;

  const currentModel = models.find((m) => m.id === selectedModel);
  const supportedParams = currentModel?.supportedParams ?? [];
  // Filter out numImages from regular option buttons — rendered as counter
  const filteredParams = supportedParams.filter((p) => p !== "numImages");
  const hasNumImages = supportedParams.includes("numImages");

  return (
    <div
      className="mt-2 flex items-center gap-1 overflow-x-auto"
      role="toolbar"
      aria-label="Generation options"
    >
      <ModelSelector models={models} />

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
