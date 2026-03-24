import { useTranslations } from "next-intl";

import { getOptionsForParam } from "@/components/PromptInput/const";

import type { DurationSelectorProps } from "./types";

export function DurationSelector({ modelId, value, onChange }: DurationSelectorProps) {
  const t = useTranslations("PromptInput");
  const options = getOptionsForParam(modelId, "duration");

  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
            value === option.value
              ? "bg-primary text-primary-foreground shadow-sm"
              : "bg-zinc-200 text-zinc-600 hover:bg-zinc-300 hover:text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700 dark:hover:text-zinc-300"
          }`}
        >
          {t(option.labelKey)}
        </button>
      ))}
    </div>
  );
}
