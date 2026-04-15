"use client";

import * as React from "react";
import { createPortal } from "react-dom";
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

function AttachedImageThumb({ file, onRemove, removeLabel }: { file: File; onRemove: () => void; removeLabel: string }) {
  const [loaded, setLoaded] = React.useState(false);
  return (
    <div className="group relative shrink-0">
      {!loaded && (
        <div className="flex size-14 items-center justify-center rounded-lg border border-neutral-200 bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-800">
          <div className="size-4 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-600 dark:border-neutral-600 dark:border-t-neutral-300" />
        </div>
      )}
      <Image
        src={URL.createObjectURL(file)}
        alt={file.name}
        width={56}
        height={56}
        unoptimized
        onLoad={() => setLoaded(true)}
        className={`size-14 rounded-lg border border-neutral-200 object-cover dark:border-neutral-800 ${loaded ? "" : "hidden"}`}
      />
      <button
        onClick={onRemove}
        className="absolute -top-1.5 -right-1.5 flex size-5 cursor-pointer items-center justify-center rounded-full bg-neutral-900 text-white opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 dark:bg-neutral-100 dark:text-neutral-900"
        aria-label={removeLabel}
      >
        <X className="size-3" strokeWidth={2.5} />
      </button>
    </div>
  );
}

export function PromptInput({ mode, disabled, onSubmit }: PromptInputProps) {
  const t = useTranslations("PromptInput");
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  const prompt = usePromptStore((s) => s.prompt);
  const setPrompt = usePromptStore((s) => s.setPrompt);
  const attachedImages = usePromptStore((s) => s.attachedImages);
  const inputImageUrl = usePromptStore((s) => s.inputImageUrl);
  const addImage = usePromptStore((s) => s.addImage);
  const removeImage = usePromptStore((s) => s.removeImage);
  const setInputImageUrl = usePromptStore((s) => s.setInputImageUrl);
  const setMode = usePromptStore((s) => s.setMode);
  const numImages = usePromptStore((s) => s.params.numImages);

  const [showDropdown, setShowDropdown] = React.useState(false);
  const [showGalleryModal, setShowGalleryModal] = React.useState(false);
  const token = useAuthStore((s) => s.token);

  // 갤러리 모달 열릴 때 배경 스크롤 잠금
  React.useEffect(() => {
    if (!showGalleryModal) return;
    const scrollY = window.scrollY;
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
    return () => {
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.left = "";
      document.body.style.right = "";
      window.scrollTo(0, scrollY);
    };
  }, [showGalleryModal]);

  const { data: imageHistoryData } = useGenerationHistory(
    mode === "video" && token
      ? { type: "image", status: "completed", limit: 20 }
      : undefined,
  );

  const generatedImages = React.useMemo(() => {
    return imageHistoryData?.pages
      .flatMap((p) => p.generations)
      .filter((g) => g.result_url) ?? [];
  }, [imageHistoryData]);

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
    (url: string) => {
      setInputImageUrl(url);
      setShowDropdown(false);
    },
    [setInputImageUrl],
  );

  const handleSubmit = React.useCallback(() => {
    if (!prompt.trim()) return;
    const state = usePromptStore.getState();
    onSubmit?.({
      prompt: state.prompt,
      attachedImages: state.attachedImages,
      inputImageUrl: state.inputImageUrl,
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
          <div className="rounded-2xl border-2 border-neutral-200 bg-white shadow-lg dark:border-neutral-800/80 dark:bg-neutral-950/85 dark:backdrop-blur-xl">
            {/* Attached image thumbnails — 입력 영역 위에 표시 */}
            {attachedImages.length > 0 && (
              <div className="flex gap-2 overflow-x-auto px-3.5 pt-3.5 pb-1 pr-5 sm:px-5 sm:pt-4 sm:pb-1">
                {attachedImages.map((file, index) => (
                  <AttachedImageThumb
                    key={index}
                    file={file}
                    onRemove={() => removeImage(index)}
                    removeLabel={t("removeImage")}
                  />
                ))}
              </div>
            )}
            {/* URL 기반 이미지 썸네일 (갤러리 선택) */}
            {inputImageUrl && (
              <div className="flex gap-2 overflow-x-auto px-3.5 pt-3.5 pb-1 pr-5 sm:px-5 sm:pt-4 sm:pb-1">
                <div className="group relative shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={inputImageUrl}
                    alt="Selected"
                    className="size-14 rounded-lg border border-neutral-200 object-cover dark:border-neutral-800"
                  />
                  <button
                    onClick={() => setInputImageUrl(null)}
                    className="absolute -top-1.5 -right-1.5 flex size-5 cursor-pointer items-center justify-center rounded-full bg-neutral-900 text-white opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 dark:bg-neutral-100 dark:text-neutral-900"
                    aria-label={t("removeImage")}
                  >
                    <X className="size-3" strokeWidth={2.5} />
                  </button>
                </div>
              </div>
            )}
            <div className="sm:flex">
            {/* Input + options */}
            <div className="min-w-0 flex-1">
            {/* Prompt input */}
            <div className={`px-3.5 py-3.5 sm:px-5 sm:pb-3 ${attachedImages.length > 0 || inputImageUrl ? "sm:pt-[10px]" : "sm:pt-[20px]"}`}>
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
                    <div className="absolute bottom-full left-0 z-50 mb-2 min-w-[220px] rounded-xl border border-border/50 bg-popover p-2.5 shadow-xl">
                      <div className="flex flex-col gap-1">
                        <button
                          className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[14px] font-[500] text-foreground transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800"
                          onClick={() => {
                            fileInputRef.current?.click();
                            setShowDropdown(false);
                          }}
                        >
                          <Upload className="size-4 opacity-50" />
                          {t("uploadFile")}
                        </button>
                        <button
                          className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[14px] font-[500] text-foreground transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800"
                          onClick={() => {
                            setShowDropdown(false);
                            setShowGalleryModal(true);
                          }}
                        >
                          <ImageIcon className="size-4 opacity-50" />
                          {t("selectFromGallery")}
                        </button>
                      </div>
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
            <div className="relative">
              <div className="overflow-x-auto scrollbar-none px-3.5 pb-3.5 sm:px-5 sm:pb-[20px]">
                <div className="flex w-max items-center gap-0">
                  <OptionsBar mode={mode} />
                  <div className="w-3.5 shrink-0 sm:w-0" />
                </div>
              </div>
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
                {mode === "image" ? <> ✦ {numImages ?? 1}</> : <> ✦ 1</>}
              </button>
            </div>
            <button
              className="hidden h-[80px] shrink-0 cursor-pointer self-end mb-[20px] mr-[20px] rounded-xl bg-primary px-8 text-base font-semibold text-primary-foreground transition-opacity hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:brightness-100 sm:flex sm:items-center sm:justify-center"
              onClick={handleSubmit}
              disabled={!prompt.trim() || disabled}
            >
              {t("submit")}
              {mode === "image" ? <> ✦ {numImages ?? 1}</> : <> ✦ 1</>}
            </button>
          </div>
          </div>
      </div>
      {/* 이미지 갤러리 모달 */}
      {showGalleryModal && typeof document !== "undefined" && createPortal(
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setShowGalleryModal(false)}
        >
          <div
            className="flex w-full max-w-[880px] max-h-[85vh] flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-2xl dark:border-neutral-800 dark:bg-[#161616]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 pt-4 pb-4 sm:px-5 sm:pt-5 sm:pb-5">
              <h2 className="text-[15px] font-[600] text-foreground sm:text-[16px]">
                {t("selectFromGallery")}
              </h2>
              <button
                onClick={() => setShowGalleryModal(false)}
                className="flex size-8 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-neutral-100 hover:text-foreground dark:hover:bg-neutral-800"
              >
                <X className="size-4.5" />
              </button>
            </div>
            {generatedImages.length > 0 ? (
              <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 sm:px-5 sm:pb-5">
              <div className="grid auto-rows-[32px] grid-cols-2 gap-2 sm:auto-rows-[36px] sm:grid-cols-3" style={{ gridAutoFlow: "dense" }}>
                {generatedImages.map((gen) => {
                  const ratio = gen.aspect_ratio?.replace(":", "/") ?? "1/1";
                  const [w, h] = ratio.split("/").map(Number);
                  const rowSpan = w && h ? Math.max(3, Math.round(7 * (h / w))) : 7;
                  return (
                  <button
                    key={gen.id}
                    onClick={() => {
                      handleSelectGeneratedImage(gen.result_url!);
                      setShowGalleryModal(false);
                    }}
                    className="group relative cursor-pointer overflow-hidden rounded-xl bg-neutral-100 dark:bg-neutral-800/60"
                    style={{ gridRow: `span ${rowSpan}` }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={gen.result_url!}
                      alt={gen.prompt}
                      className="size-full object-cover"
                    />
                    {/* 모바일: 항상 표시 / PC: 호버 시 */}
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-transparent opacity-100 sm:opacity-0 sm:transition-opacity sm:duration-200 sm:group-hover:opacity-100" />
                    <div className="pointer-events-none absolute inset-x-0 top-0 px-2 pt-2 pb-4 opacity-100 sm:px-2.5 sm:pt-2.5 sm:pb-6 sm:opacity-0 sm:transition-opacity sm:duration-200 sm:group-hover:opacity-100">
                      <p className="line-clamp-1 text-left text-[11px] font-[500] leading-snug text-white/90 sm:line-clamp-2 sm:text-[12px]">
                        {gen.prompt}
                      </p>
                    </div>
                  </button>
                  );
                })}
              </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center px-4 pb-4 py-12 sm:px-5 sm:pb-5 sm:py-16">
                <div className="flex size-12 items-center justify-center rounded-full bg-neutral-100 sm:size-14 dark:bg-neutral-800">
                  <ImageIcon className="size-5 text-neutral-400 sm:size-6 dark:text-neutral-500" />
                </div>
                <p className="mt-3 text-[13px] font-[500] text-muted-foreground/60 sm:mt-4 sm:text-[14px]">{t("noGeneratedImages")}</p>
              </div>
            )}
          </div>
        </div>,
        document.body,
      )}
    </TooltipProvider>
  );
}
