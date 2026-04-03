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
          <div className="overflow-hidden rounded-2xl border-2 border-neutral-200 bg-background shadow-lg dark:border-neutral-800">
            {/* Attached image thumbnails — 입력 영역 위에 표시 */}
            {attachedImages.length > 0 && (
              <div className="flex gap-2 overflow-x-auto px-3.5 pt-3.5 pb-1 pr-5 sm:px-5 sm:pt-4 sm:pb-1">
                {attachedImages.map((file, index) => (
                  <div key={index} className="group relative shrink-0">
                    <Image
                      src={URL.createObjectURL(file)}
                      alt={file.name}
                      width={56}
                      height={56}
                      unoptimized
                      className="size-14 rounded-lg border border-neutral-200 object-cover dark:border-neutral-800"
                    />
                    <button
                      onClick={() => removeImage(index)}
                      className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full bg-neutral-900 text-white opacity-0 transition-opacity group-hover:opacity-100 dark:bg-neutral-100 dark:text-neutral-900"
                      aria-label={t("removeImage")}
                    >
                      <X className="size-3" strokeWidth={2.5} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="sm:flex">
            {/* Input + options */}
            <div className="min-w-0 flex-1">
            {/* Prompt input */}
            <div className={`px-3.5 py-3.5 sm:px-5 sm:pb-3 ${attachedImages.length > 0 ? "sm:pt-[10px]" : "sm:pt-[20px]"}`}>
              <div className="flex items-start gap-0">
                <div className="relative" ref={dropdownRef}>
                  <button
                    className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-[8px] border-[1.5px] border-neutral-200 text-muted-foreground transition-colors hover:bg-neutral-100 hover:text-foreground dark:border-neutral-700/40 dark:hover:bg-white/[0.05]"
                    onClick={() => {
                      if (mode === "video") {
                        setShowDropdown((v) => !v);
                      } else {
                        fileInputRef.current?.click();
                      }
                    }}
                    aria-label={t("attachImage")}
                  >
                    <Plus className="size-5" />
                  </button>

                  {/* 비디오 모드 드롭다운 */}
                  {showDropdown && mode === "video" && (
                    <div className="absolute top-full left-0 z-50 mt-2 w-56 overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800 bg-popover shadow-xl">
                      <button
                        className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm text-foreground transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800"
                        onClick={() => {
                          fileInputRef.current?.click();
                          setShowDropdown(false);
                        }}
                      >
                        <Upload className="size-4 text-muted-foreground" />
                        {t("uploadFile")}
                      </button>
                      <button
                        className="flex w-full items-center gap-2.5 border-t border-neutral-200 dark:border-neutral-800 px-3 py-2.5 text-left text-sm text-foreground transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800"
                        onClick={() => {
                          setShowDropdown(false);
                          setShowGalleryModal(true);
                        }}
                      >
                        <ImageIcon className="size-4 text-muted-foreground" />
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
                  autoFocus={typeof window !== "undefined" && window.innerWidth >= 640}
                  className="max-h-[173px] min-h-0 flex-1 border-none bg-transparent pt-[9px] pb-2 text-[16px] leading-relaxed text-foreground shadow-none placeholder:text-[16px] placeholder:text-muted-foreground/50 focus-visible:ring-0 dark:bg-transparent"
                  rows={2}
                />
              </div>

            </div>

            {/* Options bar */}
            <div className="overflow-x-auto scrollbar-none px-3.5 pb-3.5 sm:px-5 sm:pb-[20px]">
              <OptionsBar mode={mode} />
            </div>
            </div>{/* end left */}

            {/* Generate button — 모바일: 하단 full width / PC: 오른쪽 세로 */}
            <div className="px-3.5 pb-3.5 sm:hidden">
              <button
                className="w-full cursor-pointer rounded-xl bg-primary py-3.5 text-base font-semibold text-primary-foreground transition-opacity hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:brightness-100"
                onClick={handleSubmit}
                disabled={!prompt.trim() || disabled}
              >
                {t("submit")}
                {mode === "image" && <> ✦ {numImages ?? 1}</>}
              </button>
            </div>
            <button
              className="hidden h-[80px] shrink-0 cursor-pointer self-end mb-[20px] mr-[20px] rounded-xl bg-primary px-8 text-base font-semibold text-primary-foreground transition-opacity hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:brightness-100 sm:flex sm:items-center sm:justify-center"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-2xl rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-popover p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">
                {t("selectFromGallery")}
              </h2>
              <button
                onClick={() => setShowGalleryModal(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="size-5" />
              </button>
            </div>
            {generatedImages.length > 0 ? (
              <div className="grid max-h-[60vh] grid-cols-3 gap-2.5 overflow-y-auto sm:grid-cols-4 md:grid-cols-5">
                {generatedImages.map((gen) => (
                  <button
                    key={gen.id}
                    onClick={() => {
                      handleSelectGeneratedImage(gen.result_url!);
                      setShowGalleryModal(false);
                    }}
                    className="group relative aspect-square overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-800 transition-colors hover:border-primary"
                  >
                    <Image
                      src={gen.result_url!}
                      alt={gen.prompt}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-1.5 pt-3 opacity-0 transition-opacity group-hover:opacity-100">
                      <p className="truncate text-[11px] text-white/80">
                        {gen.prompt}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
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
