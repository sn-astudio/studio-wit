"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Scissors, Palette, Sparkles, Undo2, Redo2 } from "lucide-react";

import { useRouter } from "@/i18n/routing";
import { useImageEditorStore } from "@/stores/imageEditor";
import { usePromptStore } from "@/stores/promptStore";
import type { EditorCanvasHandle } from "@/components/ImageCreate/ImageEditor/EditorCanvas/types";
import type { CropRect } from "@/components/ImageCreate/ImageEditor/types";
import { DEFAULT_FILTER_VALUES } from "@/components/ImageCreate/ImageEditor/const";
import {
  exportCanvas,
  applyFilterToCanvas,
} from "@/components/ImageCreate/ImageEditor/utils";
import { cn } from "@/lib/utils";
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/Tooltip";

import { ImageEditPreview } from "../ImageEditPreview";
import { ImageSourceSelector } from "../ImageSourceSelector";
import { EditPanel } from "../EditPanel";
import { ImageFilterPanel } from "../ImageFilterPanel";
import { AIEditPanel } from "../AIEditPanel";
import type { EditTab, ImageSource, ImageEditWorkspaceProps } from "./types";

const TABS: { id: EditTab; labelKey: string; icon: typeof Scissors }[] = [
  { id: "edit", labelKey: "tabEdit", icon: Scissors },
  { id: "filter", labelKey: "tabFilter", icon: Palette },
  { id: "ai", labelKey: "tabAI", icon: Sparkles },
];

export function ImageEditWorkspace({
  initialImageUrl,
}: ImageEditWorkspaceProps) {
  const t = useTranslations("ImageEdit");
  const router = useRouter();

  const [source, setSource] = useState<ImageSource | null>(
    initialImageUrl ? { url: initialImageUrl } : null,
  );
  const [activeTab, setActiveTab] = useState<EditTab>("edit");
  const canvasRef = useRef<EditorCanvasHandle>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const historyRef = useRef<HTMLDivElement>(null);
  const [cropRect, setCropRect] = useState<CropRect | null>(null);

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const filterValues = useImageEditorStore((s) => s.filterValues);
  const activeTool = useImageEditorStore((s) => s.activeTool);
  const reset = useImageEditorStore((s) => s.reset);
  const historyIndex = useImageEditorStore((s) => s.historyIndex);
  const historyLength = useImageEditorStore((s) => s.historyLength);
  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < historyLength - 1;

  // 상단 탭 슬라이딩 인디케이터
  const trackRef = useRef<HTMLDivElement>(null);
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const btn = track.querySelector(
      `[data-tab="${activeTab}"]`,
    ) as HTMLElement;
    if (!btn) return;
    setIndicator({ left: btn.offsetLeft, width: btn.offsetWidth });
  }, [activeTab, source]);

  const handleSourceSelected = useCallback(
    (newSource: ImageSource) => {
      reset();
      setCropRect(null);
      setSource(newSource);
      setActiveTab("edit");
    },
    [reset],
  );

  const handleExport = useCallback(() => {
    const canvas = canvasRef.current?.getMainCanvas();
    if (!canvas) return;

    const needsBake =
      filterValues.brightness !== DEFAULT_FILTER_VALUES.brightness ||
      filterValues.contrast !== DEFAULT_FILTER_VALUES.contrast ||
      filterValues.saturate !== DEFAULT_FILTER_VALUES.saturate;

    let exportSource = canvas;
    if (needsBake) {
      exportSource = applyFilterToCanvas(canvas, filterValues);
    }

    const dataUrl = exportCanvas(exportSource);
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `edited-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success(t("exportSuccess"));
  }, [filterValues, t]);

  const handleGenerateVideo = useCallback(() => {
    const canvas = canvasRef.current?.getMainCanvas();
    if (!canvas) return;

    const needsBake =
      filterValues.brightness !== DEFAULT_FILTER_VALUES.brightness ||
      filterValues.contrast !== DEFAULT_FILTER_VALUES.contrast ||
      filterValues.saturate !== DEFAULT_FILTER_VALUES.saturate;

    let exportSource = canvas;
    if (needsBake) {
      exportSource = applyFilterToCanvas(canvas, filterValues);
    }

    exportSource.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `edited-${Date.now()}.png`, {
        type: "image/png",
      });

      const store = usePromptStore.getState();
      store.setMode("video");
      store.addImage(file);

      router.push("/video");
    }, "image/png");
  }, [filterValues, router]);

  const handleUseAsSource = useCallback(
    (url: string) => {
      reset();
      setCropRect(null);
      setSource({ url });
      setActiveTab("edit");
    },
    [reset],
  );

  const handleRemoveImage = useCallback(() => {
    reset();
    setCropRect(null);
    setSource(null);
    setActiveTab("edit");
  }, [reset]);

  const handleFileUpload = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const url = URL.createObjectURL(file);
      handleSourceSelected({ url });
      e.target.value = "";
    },
    [handleSourceSelected],
  );

  const handleScrollToHistory = useCallback(() => {
    historyRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const handleTabChange = useCallback(
    (tab: EditTab) => {
      if (tab !== "edit" && activeTool === "crop") {
        setCropRect(null);
        useImageEditorStore.getState().setActiveTool(null);
      }
      if (tab === "filter") {
        useImageEditorStore.getState().setActiveTool("filter");
      } else if (tab !== "edit") {
        useImageEditorStore.getState().setActiveTool(null);
      }
      setActiveTab(tab);
    },
    [activeTool],
  );

  return (
    <div>
      {/* 메인 콘텐츠 */}
      <div className="mx-auto flex max-w-7xl flex-col px-4 pb-[120px] pt-5 sm:pt-6 md:px-6">
        <div className="flex min-h-0 flex-col gap-4 sm:flex-row sm:gap-6">
          {/* 좌측: 프리뷰 */}
          <div className="min-h-[30vh] flex-1 sm:min-h-0">
            <ImageEditPreview
              imageUrl={source?.url ?? null}
              canvasRef={canvasRef}
              filterValues={filterValues}
              isCropping={activeTool === "crop"}
              cropRect={cropRect}
              onCropChange={setCropRect}
              onExport={handleExport}
              onGenerateVideo={handleGenerateVideo}
              onUpload={handleFileUpload}
              onScrollToHistory={handleScrollToHistory}
              onRemoveImage={handleRemoveImage}
              onFileDrop={(file) => {
                const url = URL.createObjectURL(file);
                handleSourceSelected({ url });
              }}
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {/* 우측 패널 */}
          {source && (
            <div className="flex w-full flex-col rounded-2xl border border-neutral-200 bg-white sm:w-[360px] sm:shrink-0 dark:border-neutral-800 dark:bg-[#161616]">
              {/* 패널 헤더 */}
              <div className="border-b border-neutral-100 px-5 pt-5 pb-4 dark:border-neutral-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    {(() => {
                      const tab = TABS.find((t) => t.id === activeTab);
                      if (!tab) return null;
                      const Icon = tab.icon;
                      return <Icon className="size-5 text-muted-foreground" strokeWidth={1.5} />;
                    })()}
                    <h3 className="text-[16px] font-[600] text-foreground">
                      {t(TABS.find((t) => t.id === activeTab)?.labelKey ?? "")}
                    </h3>
                  </div>
                  {activeTab === "edit" && (
                    <TooltipProvider delay={0}>
                      <div className="flex items-center gap-1">
                        <Tooltip>
                          <TooltipTrigger
                            render={
                              <button
                                onClick={() => canvasRef.current?.undo()}
                                disabled={!canUndo}
                                className="flex size-8 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-neutral-100 hover:text-foreground disabled:pointer-events-none disabled:opacity-30 dark:hover:bg-neutral-800"
                              >
                                <Undo2 className="size-4" />
                              </button>
                            }
                          />
                          <TooltipContent>{t("undo")}</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger
                            render={
                              <button
                                onClick={() => canvasRef.current?.redo()}
                                disabled={!canRedo}
                                className="flex size-8 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-neutral-100 hover:text-foreground disabled:pointer-events-none disabled:opacity-30 dark:hover:bg-neutral-800"
                              >
                                <Redo2 className="size-4" />
                              </button>
                            }
                          />
                          <TooltipContent>{t("redo")}</TooltipContent>
                        </Tooltip>
                      </div>
                    </TooltipProvider>
                  )}
                </div>
              </div>

              {/* 패널 콘텐츠 */}
              <div className="flex flex-1 flex-col p-5">
                {activeTab === "edit" && (
                  <EditPanel
                    canvasRef={canvasRef}
                    cropRect={cropRect}
                    setCropRect={setCropRect}
                  />
                )}
                {activeTab === "filter" && (
                  <ImageFilterPanel canvasRef={canvasRef} />
                )}
                {activeTab === "ai" && (
                  <AIEditPanel
                    sourceUrl={source?.url ?? null}
                    onUseAsSource={handleUseAsSource}
                  />
                )}
              </div>
            </div>
          )}
        </div>

        {/* 하단 소스 선택 */}
        <div ref={historyRef} className="mt-12">
          <ImageSourceSelector
            onSourceSelected={handleSourceSelected}
            selectedUrl={source?.url}
          />
        </div>
      </div>

      {/* 하단 플로팅 탭 */}
      {source &&
        mounted &&
        createPortal(
          <div
            className="fixed inset-x-0 bottom-6 z-40 flex justify-center"
            style={{ paddingBottom: "max(0px, env(safe-area-inset-bottom))" }}
          >
            <div
              ref={trackRef}
              className="relative inline-flex rounded-full border-2 border-neutral-200 bg-neutral-200/90 p-1.5 shadow-lg backdrop-blur-xl dark:border-neutral-800/80 dark:bg-neutral-900/85"
            >
              <div
                className="absolute top-1.5 bottom-1.5 rounded-full bg-white/80 shadow-sm transition-all duration-200 ease-out dark:bg-neutral-700/50"
                style={{
                  left: indicator.left,
                  width: indicator.width,
                }}
              />
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    data-tab={tab.id}
                    onClick={() => handleTabChange(tab.id)}
                    className={`relative z-10 flex cursor-pointer items-center gap-2 rounded-full px-6 py-3 text-[14px] font-[500] transition-colors duration-200 ${
                      isActive
                        ? "text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Icon
                      className="size-4"
                      strokeWidth={isActive ? 2 : 1.5}
                    />
                    {t(tab.labelKey)}
                  </button>
                );
              })}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
