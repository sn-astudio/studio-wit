import { PARAM_CONFIGS } from "@/components/PromptInput/const";

import type { CfgScaleSliderProps } from "./types";

export function CfgScaleSlider({ value, onChange }: CfgScaleSliderProps) {
  const config = PARAM_CONFIGS.cfgScale;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-zinc-500">
          {config.min}
        </span>
        <span className="text-xs font-medium text-zinc-300">{value}</span>
        <span className="text-xs text-zinc-500">
          {config.max}
        </span>
      </div>
      <input
        type="range"
        min={config.min}
        max={config.max}
        step={config.step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-zinc-800 accent-primary"
      />
    </div>
  );
}
