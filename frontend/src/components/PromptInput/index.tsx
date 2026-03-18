"use client";

import * as React from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Plus, X } from "lucide-react";

import { Textarea } from "@/components/ui/Textarea";
import { TooltipProvider } from "@/components/ui/Tooltip";
import { usePromptStore } from "@/stores/promptStore";

import { OptionsBar } from "./OptionsBar";
import type { PromptInputProps } from "./types";

export function PromptInput({ mode, onSubmit }: PromptInputProps) {
  const t = useTranslations("PromptInput");
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const prompt = usePromptStore((s) => s.prompt);
  const setPrompt = usePromptStore((s) => s.setPrompt);
  const attachedImages = usePromptStore((s) => s.attachedImages);
  const addImage = usePromptStore((s) => s.addImage);
  const removeImage = usePromptStore((s) => s.removeImage);
  const setMode = usePromptStore((s) => s.setMode);
  const numImages = usePromptStore((s) => s.params.numImages);

  React.useEffect(() => {
    setMode(mode);
  }, [mode, setMode]);

  const handleSubmit = React.useCallback(() => {
    if (!prompt.trim()) return;
    const state = usePromptStore.getState();
    onSubmit?.({
      prompt: state.prompt,
      attachedImages: state.attachedImages,
      selectedModel: state.selectedModel,
      params: state.params,
    });
  }, [prompt, onSubmit]);

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit],
  );

  const handleFileChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files) {
        Array.from(files).forEach((file) => addImage(file));
      }
      e.target.value = "";
    },
    [addImage],
  );

  const placeholderKey = mode === "video" ? "placeholderVideo" : "placeholder";

  return (
    <TooltipProvider delay={300}>
      <div className="w-full">
        <div className="mx-auto max-w-4xl">
          <div className="flex overflow-hidden rounded-2xl bg-zinc-900 shadow-lg">
            {/* Left: input + options */}
            <div className="min-w-0 flex-1 p-3">
              {/* Row 1: Prompt input */}
              <div className="flex items-center gap-2">
                <button
                  className="flex size-8 shrink-0 items-center justify-center rounded-full border border-zinc-700 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
                  onClick={() => fileInputRef.current?.click()}
                  aria-label={t("attachImage")}
                >
                  <Plus className="size-4" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleFileChange}
                />
                <Textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={t(placeholderKey)}
                  className="max-h-[120px] min-h-[40px] flex-1 border-none bg-transparent py-1.5 text-zinc-100 shadow-none placeholder:text-zinc-500 focus-visible:ring-0 dark:bg-transparent"
                  rows={1}
                />
              </div>

              {/* Attached image thumbnails */}
              {attachedImages.length > 0 && (
                <div className="mt-2 flex gap-2 overflow-x-auto pl-10">
                  {attachedImages.map((file, index) => (
                    <div key={index} className="group relative shrink-0">
                      <Image
                        src={URL.createObjectURL(file)}
                        alt={file.name}
                        width={56}
                        height={56}
                        unoptimized
                        className="size-14 rounded-md border border-zinc-700 object-cover"
                      />
                      <button
                        onClick={() => removeImage(index)}
                        className="absolute -top-1.5 -right-1.5 flex size-4 items-center justify-center rounded-full bg-destructive text-destructive-foreground opacity-0 transition-opacity group-hover:opacity-100"
                        aria-label={t("removeImage")}
                      >
                        <X className="size-2.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Row 2: Options bar */}
              <OptionsBar mode={mode} />
            </div>

            {/* Right: Generate button */}
            <button
              className="m-2 shrink-0 cursor-pointer rounded-xl bg-primary px-6 text-base font-semibold text-primary-foreground transition-opacity hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
              onClick={handleSubmit}
              disabled={!prompt.trim()}
            >
              {t("submit")}
              {mode === "image" && <> ✦ {numImages ?? 1}</>}
            </button>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
