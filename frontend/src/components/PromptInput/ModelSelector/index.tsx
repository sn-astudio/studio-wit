"use client";

import { useTranslations } from "next-intl";

import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
} from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/Tooltip";
import { usePromptStore } from "@/stores/promptStore";

import type { ModelSelectorProps } from "./types";

export function ModelSelector({ models }: ModelSelectorProps) {
  const t = useTranslations("PromptInput");
  const selectedModel = usePromptStore((s) => s.selectedModel);
  const setSelectedModel = usePromptStore((s) => s.setSelectedModel);

  const currentModel = models.find((m) => m.id === selectedModel) ?? models[0];
  if (!currentModel) return null;

  const Icon = currentModel.icon;

  return (
    <Select
      value={selectedModel}
      onValueChange={(value) => setSelectedModel(value as string)}
    >
      <Tooltip>
        <TooltipTrigger
          render={
            <SelectTrigger
              className="h-7 gap-1.5 rounded-lg border-none bg-zinc-800/60 px-2.5 hover:bg-zinc-700"
              render={<Button variant="ghost" size="sm" />}
            />
          }
        >
          <Icon className="size-4" />
          <span className="max-w-[100px] truncate text-xs">
            {t(currentModel.nameKey)}
          </span>
        </TooltipTrigger>
        <TooltipContent>{t("modelLabel")}</TooltipContent>
      </Tooltip>
      <SelectContent>
        {models.map((model) => {
          const ModelIcon = model.icon;
          return (
            <SelectItem key={model.id} value={model.id}>
              <span className="flex items-center gap-2">
                <ModelIcon className="size-4 shrink-0" />
                {t(model.nameKey)}
              </span>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
