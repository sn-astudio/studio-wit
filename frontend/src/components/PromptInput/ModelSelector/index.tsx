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
      <SelectTrigger
        className="h-10 shrink-0 gap-2 whitespace-nowrap rounded-lg border-none bg-neutral-100 px-3 ring-0 hover:bg-neutral-200/60 active:bg-neutral-200 aria-expanded:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700/70 dark:active:bg-neutral-700 dark:aria-expanded:bg-neutral-700"
        render={<button type="button" />}
      >
        <Icon className="size-4.5" />
        <span className="max-w-[120px] truncate text-[14px] font-[500]">
          {t(currentModel.nameKey)}
        </span>
      </SelectTrigger>
      <SelectContent title={t("modelLabel")} className="min-w-[220px] gap-0.5 rounded-xl border-border/50 bg-popover p-2.5 [&_[role=listbox]]:flex [&_[role=listbox]]:flex-col [&_[role=listbox]]:gap-1 ">
        {models.map((model) => {
          const ModelIcon = model.icon;
          return (
            <SelectItem key={model.id} value={model.id} className="h-10 rounded-lg px-3 text-[14px] font-[500] data-[highlighted]:bg-neutral-100 data-[selected]:bg-neutral-100 dark:data-[selected]:bg-neutral-800 data-[selected]:text-foreground  dark:data-[highlighted]:bg-neutral-800">
              <span className="flex items-center gap-3">
                <ModelIcon className="size-5 shrink-0" />
                {t(model.nameKey)}
              </span>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
