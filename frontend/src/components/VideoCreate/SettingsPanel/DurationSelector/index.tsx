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
              : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-300"
          }`}
        >
          {t(option.labelKey)}
        </button>
      ))}
    </div>
  );
}
