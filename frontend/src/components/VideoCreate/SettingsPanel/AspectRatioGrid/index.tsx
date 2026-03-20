import { useTranslations } from "next-intl";

import { getOptionsForParam } from "@/components/PromptInput/const";

import type { AspectRatioGridProps } from "./types";

export function AspectRatioGrid({ modelId, value, onChange }: AspectRatioGridProps) {
  const t = useTranslations("PromptInput");
  const options = getOptionsForParam(modelId, "aspectRatio");

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
          {option.value}
        </button>
      ))}
    </div>
  );
}
