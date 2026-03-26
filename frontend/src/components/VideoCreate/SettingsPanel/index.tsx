"use client";

import { useTranslations } from "next-intl";
import {
  RectangleHorizontal,
  Clock,
  Monitor,
  Gauge,
  Ban,
  Settings2,
} from "lucide-react";

import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
} from "@/components/ui/Select";
import { usePromptStore } from "@/stores/promptStore";
import {
  VIDEO_MODELS,
} from "@/components/PromptInput/const";

import { SettingGroup } from "./SettingGroup";
import { AspectRatioGrid } from "./AspectRatioGrid";
import { DurationSelector } from "./DurationSelector";
import { ResolutionSelector } from "./ResolutionSelector";
import { CfgScaleSlider } from "./CfgScaleSlider";

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
    <div className="flex w-72 shrink-0 flex-col overflow-hidden border-l border-zinc-300 bg-zinc-50/50 dark:border-zinc-800 dark:bg-zinc-950/50">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-zinc-300 px-4 py-3 dark:border-zinc-800">
        <Settings2 className="size-4 text-zinc-600 dark:text-zinc-400" />
        <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
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
            <SelectTrigger className="h-9 w-full rounded-lg border-zinc-300 bg-white text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800">
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
              className="w-full resize-none rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs text-zinc-800 placeholder:text-zinc-400 focus:border-primary/50 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:placeholder:text-zinc-600"
              rows={2}
            />
          </SettingGroup>
        )}
      </div>
    </div>
  );
}
