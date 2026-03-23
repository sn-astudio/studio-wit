"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Slider as SliderPrimitive } from "@base-ui/react/slider";

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
        <Tooltip>
          <TooltipTrigger
            render={
              <SelectTrigger
                className="h-7 w-auto gap-1 rounded-lg border-none bg-zinc-800/60 px-2 hover:bg-zinc-700"
                render={<Button variant="ghost" size="sm" />}
              />
            }
          >
            <Icon className="size-3.5" />
            <span className="text-xs text-zinc-300">{displayValue}</span>
          </TooltipTrigger>
          <TooltipContent>{t(config.labelKey)}</TooltipContent>
        </Tooltip>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {t(option.labelKey)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  if (config.type === "slider") {
    return (
      <Popover>
        <Tooltip>
          <TooltipTrigger
            render={
              <PopoverTrigger
                render={
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1 rounded-lg bg-zinc-800/60 px-2 hover:bg-zinc-700"
                  />
                }
              />
            }
          >
            <Icon className="size-3.5" />
            <span className="text-xs text-zinc-300">{paramValue}</span>
          </TooltipTrigger>
          <TooltipContent>{t(config.labelKey)}</TooltipContent>
        </Tooltip>
        <PopoverContent className="w-56 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium">{t(config.labelKey)}</span>
            <span className="text-xs text-zinc-300">{paramValue}</span>
          </div>
          <SliderPrimitive.Root
            value={Number(paramValue)}
            onValueChange={(value) => setParam(paramType, value as number)}
            min={config.min}
            max={config.max}
            step={config.step}
          >
            <SliderPrimitive.Control className="relative flex h-5 w-full cursor-pointer items-center">
              <SliderPrimitive.Track className="h-1.5 w-full rounded-full bg-muted">
                <SliderPrimitive.Indicator className="rounded-full bg-primary" />
              </SliderPrimitive.Track>
              <SliderPrimitive.Thumb className="block size-4 rounded-full border-2 border-primary bg-background shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
            </SliderPrimitive.Control>
          </SliderPrimitive.Root>
        </PopoverContent>
      </Popover>
    );
  }

  // text type (negativePrompt, seed)
  const hasValue = paramValue !== undefined && paramValue !== "";

  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger
          render={
            <PopoverTrigger
              render={
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1 px-1.5"
                />
              }
            />
          }
        >
          <Icon className="size-3.5" />
          {hasValue && <span className="size-1.5 rounded-full bg-primary" />}
        </TooltipTrigger>
        <TooltipContent>{t(config.labelKey)}</TooltipContent>
      </Tooltip>
      <PopoverContent className="w-64 space-y-2">
        <label className="text-xs font-medium">{t(config.labelKey)}</label>
        <Input
          type={paramType === "seed" ? "number" : "text"}
          value={paramValue ?? ""}
          onChange={(e) => setParam(paramType, e.target.value)}
          placeholder={t(config.labelKey)}
          className="h-7 text-xs"
        />
      </PopoverContent>
    </Popover>
  );
}
