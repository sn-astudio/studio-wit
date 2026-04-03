"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Slider as SliderPrimitive } from "@base-ui/react/slider";
import { ChevronUp, ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/Button";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
} from "@/components/ui/Select";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/Popover";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/Tooltip";
import { Input } from "@/components/ui/Input";
import { usePromptStore } from "@/stores/promptStore";

import { PARAM_CONFIGS, getOptionsForParam } from "../const";
import type { OptionButtonProps } from "./types";

function AspectRatioShape({ ratio, className = "" }: { ratio: string; className?: string }) {
  const [w, h] = ratio.split(":").map(Number);
  if (!w || !h) return null;
  const maxSize = 16;
  const scale = maxSize / Math.max(w, h);
  const width = Math.round(w * scale);
  const height = Math.round(h * scale);
  return (
    <span
      className={`inline-block shrink-0 rounded-[2px] border-2 border-current opacity-35 ${className}`}
      style={{ width, height }}
    />
  );
}

export function OptionButton({ paramType }: OptionButtonProps) {
  const config = PARAM_CONFIGS[paramType];
  const t = useTranslations("PromptInput");
  const paramValue = usePromptStore((s) => s.params[paramType]);
  const selectedModel = usePromptStore((s) => s.selectedModel);
  const setParam = usePromptStore((s) => s.setParam);

  const Icon = config.icon;

  if (config.type === "select") {
    const options = getOptionsForParam(selectedModel, paramType);
    const selectedOption = options.find((o) => o.value === paramValue);
    const displayValue = selectedOption
      ? t(selectedOption.labelKey)
      : String(paramValue ?? "");

    return (
      <Select
        value={paramValue as string}
        onValueChange={(value) => setParam(paramType, value as string)}
      >
        <SelectTrigger
          className="h-10 w-auto gap-2 rounded-lg border-none bg-neutral-100 px-3 ring-0 hover:bg-neutral-200/60 active:bg-neutral-200 aria-expanded:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700/70 dark:active:bg-neutral-700 dark:aria-expanded:bg-neutral-700"
          render={<button type="button" />}
        >
          {paramType === "aspectRatio" ? (
            <AspectRatioShape ratio={String(paramValue ?? "1:1")} />
          ) : paramType === "quality" ? (
            <span className="inline-flex h-5 min-w-[28px] items-center justify-center rounded border-[1.5px] border-current px-1 text-[11px] font-bold tracking-wide opacity-35">
              {paramValue === "hd" ? "HD" : "SD"}
            </span>
          ) : (
            <Icon className="size-5 opacity-35" strokeWidth={2} />
          )}
          <span className="text-[14px] font-[500]">{displayValue}</span>
        </SelectTrigger>
        <SelectContent title={t(config.labelKey)} className="min-w-[200px] rounded-xl border-border/50 bg-popover p-2.5 [&_[role=listbox]]:flex [&_[role=listbox]]:flex-col [&_[role=listbox]]:gap-1 ">
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value} className="h-10 rounded-lg px-3 text-[14px] font-[500] data-[highlighted]:bg-neutral-100 data-[selected]:bg-neutral-100 dark:data-[selected]:bg-neutral-800 data-[selected]:text-foreground  dark:data-[highlighted]:bg-neutral-800">
              <span className="flex items-center gap-2.5">
                {paramType === "aspectRatio" && (
                  <span className="flex size-5 items-center justify-center">
                    <AspectRatioShape ratio={option.value} />
                  </span>
                )}
                {paramType === "quality" && (
                  <span className="inline-flex h-5 min-w-[28px] items-center justify-center rounded border-[1.5px] border-current px-1 text-[11px] font-bold tracking-wide opacity-35">
                    {option.value === "hd" ? "HD" : "SD"}
                  </span>
                )}
                {t(option.labelKey)}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  if (config.type === "slider") {
    return (
      <Popover>
        <PopoverTrigger
          render={
            <button
              type="button"
              className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg border-none bg-neutral-100 px-3 text-sm transition-colors hover:bg-neutral-200/60 active:bg-neutral-200 aria-expanded:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700/70 dark:active:bg-neutral-700 dark:aria-expanded:bg-neutral-700"
            />
          }
        >
          <Icon className="size-5 opacity-35" strokeWidth={2} />
          <span className="tabular-nums text-[14px] font-[500]">{paramValue}</span>
        </PopoverTrigger>
        <PopoverContent className="w-72 rounded-xl border-border/50 bg-popover p-2.5 shadow-lg">
          <div className="px-3 pt-1 pb-0.5 text-[13px] font-semibold tracking-wide text-foreground">
            {t(config.labelKey)}
          </div>
          <div className="px-3 pt-1 pb-2 text-[13px] leading-relaxed text-muted-foreground">
            {t(`params.${paramType}Desc`)}
          </div>
          <div className="space-y-3 px-3 py-3">
            <div className="flex items-center justify-end">
              <span className="tabular-nums text-[14px] font-[500] text-foreground">{paramValue}</span>
            </div>
            <SliderPrimitive.Root
              value={Number(paramValue)}
              onValueChange={(value) => setParam(paramType, value as number)}
              min={config.min}
              max={config.max}
              step={config.step}
            >
              <SliderPrimitive.Control className="relative flex h-5 w-full cursor-pointer items-center">
                <SliderPrimitive.Track className="h-1.5 w-full rounded-full bg-neutral-200 dark:bg-neutral-700">
                  <SliderPrimitive.Indicator className="rounded-full bg-foreground" />
                </SliderPrimitive.Track>
                <SliderPrimitive.Thumb className="block size-4 rounded-full border-2 border-foreground bg-background shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-300 dark:focus-visible:ring-neutral-600" />
              </SliderPrimitive.Control>
            </SliderPrimitive.Root>
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  // text type (negativePrompt, seed)
  const hasValue = paramValue !== undefined && paramValue !== "";

  return (
    <Popover>
      <PopoverTrigger
        render={
          <button
            type="button"
            className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg border-none bg-neutral-100 px-3 text-sm transition-colors hover:bg-neutral-200/60 active:bg-neutral-200 aria-expanded:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700/70 dark:active:bg-neutral-700 dark:aria-expanded:bg-neutral-700"
          />
        }
      >
        <Icon className="size-5 opacity-35" strokeWidth={2} />
        <span className="text-[14px] font-[500]">{t(config.labelKey)}</span>
        {hasValue && <span className="size-1.5 rounded-full bg-primary" />}
      </PopoverTrigger>
      <PopoverContent className={`rounded-xl border-border/50 bg-popover p-2.5 shadow-lg ${paramType === "seed" ? "w-56" : "w-[480px]"}`}>
        <div className="px-3 pt-1 pb-0.5 text-[13px] font-semibold tracking-wide text-foreground">
          {t(config.labelKey)}
        </div>
        <div className="px-3 pt-1 pb-2 text-[13px] leading-relaxed text-muted-foreground">
          {t(`params.${paramType}Desc`)}
        </div>
        <div className="px-3 py-3">
          {paramType === "seed" ? (
            <div className="flex h-10 items-center overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-700">
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={paramValue ?? ""}
                onChange={(e) => {
                  const v = e.target.value.replace(/[^0-9]/g, "");
                  setParam(paramType, v);
                }}
                placeholder={t(config.labelKey)}
                className="h-full min-w-0 flex-1 bg-transparent px-3 text-[14px] leading-relaxed text-foreground outline-none placeholder:text-muted-foreground/50"
              />
              <div className="flex h-full flex-col border-l border-neutral-200 dark:border-neutral-700">
                <button
                  type="button"
                  onClick={() => setParam(paramType, String(Number(paramValue ?? 0) + 1))}
                  className="flex flex-1 cursor-pointer items-center justify-center px-2 text-muted-foreground transition-colors hover:bg-neutral-100 hover:text-foreground dark:hover:bg-neutral-800"
                >
                  <ChevronUp className="size-3.5" strokeWidth={2} />
                </button>
                <div className="h-px bg-neutral-200 dark:bg-neutral-700" />
                <button
                  type="button"
                  onClick={() => setParam(paramType, String(Math.max(0, Number(paramValue ?? 0) - 1)))}
                  className="flex flex-1 cursor-pointer items-center justify-center px-2 text-muted-foreground transition-colors hover:bg-neutral-100 hover:text-foreground dark:hover:bg-neutral-800"
                >
                  <ChevronDown className="size-3.5" strokeWidth={2} />
                </button>
              </div>
            </div>
          ) : (
            <>
              <textarea
                value={String(paramValue ?? "")}
                onChange={(e) => setParam(paramType, e.target.value)}
                placeholder={t(config.labelKey)}
                rows={5}
                className="w-full resize-none rounded-lg border border-neutral-200 bg-transparent px-3 py-2.5 text-[14px] leading-relaxed text-foreground outline-none placeholder:text-muted-foreground/50 focus-visible:border-neutral-300 dark:border-neutral-700 dark:bg-transparent dark:focus-visible:border-neutral-600"
              />
              {hasValue && (
                <button
                  type="button"
                  onClick={() => setParam(paramType, "")}
                  className="mt-2 cursor-pointer text-[13px] text-red-400/70 transition-colors hover:text-red-500 dark:text-red-400/60 dark:hover:text-red-400"
                >
                  {t("params.reset")}
                </button>
              )}
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
