"use client";

import { useTranslations } from "next-intl";
import {
  RectangleHorizontal,
  Clock,
  Monitor,
  Gauge,
  Ban,
  ChevronDown,
  Settings2,
} from "lucide-react";

import { Button } from "@/components/ui/Button";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
} from "@/components/ui/Select";
import { usePromptStore } from "@/stores/promptStore";
import {
  VIDEO_MODELS,
  PARAM_CONFIGS,
  getOptionsForParam,
} from "@/components/PromptInput/const";

export function SettingsPanel() {
  const t = useTranslations("PromptInput");
  const tv = useTranslations("VideoCreate");
  const selectedModel = usePromptStore((s) => s.selectedModel);
  const setSelectedModel = usePromptStore((s) => s.setSelectedModel);
  const params = usePromptStore((s) => s.params);
  const setParam = usePromptStore((s) => s.setParam);

  const currentModel = VIDEO_MODELS.find((m) => m.id === selectedModel);
  const supportedParams = currentModel?.supportedParams ?? [];

  return (
    <div className="flex w-72 shrink-0 flex-col overflow-hidden border-l border-zinc-800 bg-zinc-950/50">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-zinc-800 px-4 py-3">
        <Settings2 className="size-4 text-zinc-400" />
        <span className="text-sm font-semibold text-zinc-200">
          {tv("settings")}
        </span>
      </div>

      <div className="flex-1 space-y-1 overflow-y-auto p-4">
        {/* Model selector */}
        <SettingGroup label={tv("modelLabel")}>
          <Select
            value={selectedModel}
            onValueChange={(value) => setSelectedModel(value as string)}
          >
            <SelectTrigger className="h-9 w-full rounded-lg border-zinc-700 bg-zinc-900 text-sm hover:bg-zinc-800">
              {currentModel && (
                <span className="flex items-center gap-2">
                  <currentModel.icon className="size-4 shrink-0" />
                  {t(currentModel.nameKey)}
                </span>
              )}
            </SelectTrigger>
            <SelectContent>
              {VIDEO_MODELS.map((model) => {
                const Icon = model.icon;
                return (
                  <SelectItem key={model.id} value={model.id}>
                    <span className="flex items-center gap-2">
                      <Icon className="size-4 shrink-0" />
                      {t(model.nameKey)}
                    </span>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </SettingGroup>

        {/* Aspect Ratio */}
        {supportedParams.includes("aspectRatio") && (
          <SettingGroup
            label={t("params.aspectRatio")}
            icon={<RectangleHorizontal className="size-3.5" />}
          >
            <AspectRatioGrid
              modelId={selectedModel}
              value={params.aspectRatio as string}
              onChange={(v) => setParam("aspectRatio", v)}
            />
          </SettingGroup>
        )}

        {/* Duration */}
        {supportedParams.includes("duration") && (
          <SettingGroup
            label={t("params.duration")}
            icon={<Clock className="size-3.5" />}
          >
            <DurationSelector
              modelId={selectedModel}
              value={params.duration as string}
              onChange={(v) => setParam("duration", v)}
            />
          </SettingGroup>
        )}

        {/* Resolution */}
        {supportedParams.includes("resolution") && (
          <SettingGroup
            label={t("params.resolution")}
            icon={<Monitor className="size-3.5" />}
          >
            <ResolutionSelector
              modelId={selectedModel}
              value={params.resolution as string}
              onChange={(v) => setParam("resolution", v)}
            />
          </SettingGroup>
        )}

        {/* CFG Scale */}
        {supportedParams.includes("cfgScale") && (
          <SettingGroup
            label={t("params.cfgScale")}
            icon={<Gauge className="size-3.5" />}
          >
            <CfgScaleSlider
              value={Number(params.cfgScale ?? 0.5)}
              onChange={(v) => setParam("cfgScale", v)}
            />
          </SettingGroup>
        )}

        {/* Negative Prompt */}
        {supportedParams.includes("negativePrompt") && (
          <SettingGroup
            label={t("params.negativePrompt")}
            icon={<Ban className="size-3.5" />}
          >
            <textarea
              value={(params.negativePrompt as string) ?? ""}
              onChange={(e) => setParam("negativePrompt", e.target.value)}
              placeholder={t("params.negativePrompt")}
              className="w-full resize-none rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs text-zinc-200 placeholder:text-zinc-600 focus:border-primary/50 focus:outline-none"
              rows={2}
            />
          </SettingGroup>
        )}
      </div>
    </div>
  );
}

/* --- Sub-components --- */

function SettingGroup({
  label,
  icon,
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2 rounded-xl bg-zinc-900/50 p-3">
      <div className="flex items-center gap-1.5">
        {icon && <span className="text-zinc-500">{icon}</span>}
        <span className="text-xs font-medium text-zinc-400">{label}</span>
      </div>
      {children}
    </div>
  );
}

function AspectRatioGrid({
  modelId,
  value,
  onChange,
}: {
  modelId: string;
  value: string;
  onChange: (v: string) => void;
}) {
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

function DurationSelector({
  modelId,
  value,
  onChange,
}: {
  modelId: string;
  value: string;
  onChange: (v: string) => void;
}) {
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

function ResolutionSelector({
  modelId,
  value,
  onChange,
}: {
  modelId: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const t = useTranslations("PromptInput");
  const options = getOptionsForParam(modelId, "resolution");

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

function CfgScaleSlider({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
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
