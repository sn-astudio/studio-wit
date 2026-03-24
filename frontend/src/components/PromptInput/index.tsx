"use client";

import * as React from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { ImageIcon, Plus, Upload, X } from "lucide-react";

import { Textarea } from "@/components/ui/Textarea";
import { TooltipProvider } from "@/components/ui/Tooltip";
import { usePromptStore } from "@/stores/promptStore";
import { useGenerationHistory } from "@/hooks/queries/useGeneration";
import { useAuthStore } from "@/stores/auth";

import { OptionsBar } from "./OptionsBar";
import type { PromptInputProps } from "./types";

export function PromptInput({ mode, disabled, onSubmit }: PromptInputProps) {
  const t = useTranslations("PromptInput");
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  const prompt = usePromptStore((s) => s.prompt);
  const setPrompt = usePromptStore((s) => s.setPrompt);
  const attachedImages = usePromptStore((s) => s.attachedImages);
  const addImage = usePromptStore((s) => s.addImage);
  const removeImage = usePromptStore((s) => s.removeImage);
  const setMode = usePromptStore((s) => s.setMode);
  const numImages = usePromptStore((s) => s.params.numImages);

  const [showDropdown, setShowDropdown] = React.useState(false);
  const [showGalleryModal, setShowGalleryModal] = React.useState(false);
  const token = useAuthStore((s) => s.token);

  const { data: imageHistoryData } = useGenerationHistory(
    mode === "video" && token
      ? { type: "image", status: "completed", limit: 20 }
      : undefined,
  );

  const generatedImages = React.useMemo(
    () =>
      imageHistoryData?.pages
        .flatMap((p) => p.generations)
        .filter((g) => g.result_url) ?? [],
    [imageHistoryData],
  );

  // 드롭다운 외부 클릭 닫기
  React.useEffect(() => {
    if (!showDropdown) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showDropdown]);

  React.useEffect(() => {
    setMode(mode);
  }, [mode, setMode]);

  const handleSelectGeneratedImage = React.useCallback(
    async (url: string) => {
      try {
        const res = await fetch(url);
        const blob = await res.blob();
        const ext = blob.type.split("/")[1] || "png";
        const file = new File([blob], `generated.${ext}`, { type: blob.type });
        addImage(file);
      } catch {
        // ignore
      }
      setShowDropdown(false);
    },
    [addImage],
  );

  const handleSubmit = React.useCallback(() => {
    if (!prompt.trim()) return;
    const state = usePromptStore.getState();
    onSubmit?.({
      prompt: state.prompt,
      attachedImages: state.attachedImages,
      selectedModel: state.selectedModel,
      params: state.params,
      isPublic: state.isPublic,
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
          <div className="rounded-2xl bg-zinc-100 shadow-lg sm:flex dark:bg-zinc-900">
            {/* Left: input + options (PC) */}
            <div className="min-w-0 flex-1">
            {/* Prompt input */}
            <div className="p-2.5 pb-0 sm:p-3 sm:pb-0">
              <div className="flex items-center gap-2">
                <div className="relative" ref={dropdownRef}>
                  <button
                    className="flex size-8 shrink-0 items-center justify-center rounded-full border border-zinc-300 text-zinc-500 transition-colors hover:bg-zinc-200 hover:text-zinc-700 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                    onClick={() => {
                      if (mode === "video") {
                        setShowDropdown((v) => !v);
                      } else {
                        fileInputRef.current?.click();
                      }
                    }}
                    aria-label={t("attachImage")}
                  >
                    <Plus className="size-4" />
                  </button>

                  {/* 비디오 모드 드롭다운 */}
                  {showDropdown && mode === "video" && (
                    <div className="absolute top-full left-0 z-50 mt-2 w-56 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
                      <button
                        className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm text-zinc-700 transition-colors hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                        onClick={() => {
                          fileInputRef.current?.click();
                          setShowDropdown(false);
                        }}
                      >
                        <Upload className="size-4 text-zinc-600 dark:text-zinc-500" />
                        {t("uploadFile")}
                      </button>
                      <button
                        className="flex w-full items-center gap-2.5 border-t border-zinc-200 px-3 py-2.5 text-left text-sm text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800"
                        onClick={() => {
                          setShowDropdown(false);
                          setShowGalleryModal(true);
                        }}
                      >
                        <ImageIcon className="size-4 text-zinc-600 dark:text-zinc-500" />
                        {t("selectFromGallery")}
                      </button>
                    </div>
                  )}
                </div>

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
                  className="max-h-[120px] min-h-[40px] flex-1 border-none bg-transparent py-1.5 text-zinc-800 shadow-none placeholder:text-zinc-400 focus-visible:ring-0 dark:bg-transparent dark:text-zinc-100 dark:placeholder:text-zinc-500"
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
                        className="size-14 rounded-md border border-zinc-300 object-cover dark:border-zinc-700"
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
            </div>

            {/* Options bar */}
            <div className="overflow-x-auto px-2.5 pb-2.5 sm:px-3 sm:pb-3">
              <OptionsBar mode={mode} />
            </div>
            </div>{/* end left */}

            {/* Generate button — 모바일: 하단 full width / PC: 오른쪽 세로 */}
            <div className="px-2.5 pb-2.5 sm:hidden">
              <button
                className="w-full cursor-pointer rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
                onClick={handleSubmit}
                disabled={!prompt.trim() || disabled}
              >
                {t("submit")}
                {mode === "image" && <> ✦ {numImages ?? 1}</>}
              </button>
            </div>
            <button
              className="m-2 hidden shrink-0 cursor-pointer rounded-xl bg-primary px-6 text-base font-semibold text-primary-foreground transition-opacity hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40 sm:block"
              onClick={handleSubmit}
              disabled={!prompt.trim() || disabled}
            >
              {t("submit")}
              {mode === "image" && <> ✦ {numImages ?? 1}</>}
            </button>
          </div>
        </div>
      </div>
      {/* 이미지 갤러리 모달 */}
      {showGalleryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/60">
          <div className="w-full max-w-2xl rounded-xl border border-zinc-200 bg-white p-5 shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-zinc-900 dark:text-white">
                {t("selectFromGallery")}
              </h2>
              <button
                onClick={() => setShowGalleryModal(false)}
                className="text-zinc-600 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
              >
                <X className="size-5" />
              </button>
            </div>
            {generatedImages.length > 0 ? (
              <div className="grid max-h-[60vh] grid-cols-4 gap-2 overflow-y-auto sm:grid-cols-5">
                {generatedImages.map((gen) => (
                  <button
                    key={gen.id}
                    onClick={() => {
                      handleSelectGeneratedImage(gen.result_url!);
                      setShowGalleryModal(false);
                    }}
                    className="group relative aspect-square overflow-hidden rounded-lg border border-zinc-200 transition-colors hover:border-primary dark:border-zinc-800"
                  >
                    <Image
                      src={gen.result_url!}
                      alt={gen.prompt}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-1.5 pt-3 opacity-0 transition-opacity group-hover:opacity-100">
                      <p className="truncate text-[9px] text-zinc-300">
                        {gen.prompt}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-zinc-600">
                <ImageIcon className="mb-2 size-8" />
                <p className="text-sm">{t("noGeneratedImages")}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </TooltipProvider>
  );
}
