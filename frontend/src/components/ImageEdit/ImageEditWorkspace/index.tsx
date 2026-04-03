"use client";

import { useCallback, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Scissors, Palette, Sparkles } from "lucide-react";

import { useRouter } from "@/i18n/routing";
import { useImageEditorStore } from "@/stores/imageEditor";
import { usePromptStore } from "@/stores/promptStore";
import type { EditorCanvasHandle } from "@/components/ImageCreate/ImageEditor/EditorCanvas/types";
import type { CropRect, FilterValues } from "@/components/ImageCreate/ImageEditor/types";
import { DEFAULT_FILTER_VALUES } from "@/components/ImageCreate/ImageEditor/const";
import {
  exportCanvas,
  applyFilterToCanvas,
} from "@/components/ImageCreate/ImageEditor/utils";
import { cn } from "@/lib/utils";

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

export function ImageEditWorkspace({ initialImageUrl }: ImageEditWorkspaceProps) {
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

  const filterValues = useImageEditorStore((s) => s.filterValues);
  const activeTool = useImageEditorStore((s) => s.activeTool);
  const reset = useImageEditorStore((s) => s.reset);

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
      // 편집 탭 전환 시 activeTool 리셋 (crop 등 해제)
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
    <div className="mx-auto flex max-w-7xl flex-col px-4 pb-[240px] pt-5 sm:pt-6 md:px-6">
      {/* 메인 콘텐츠: 프리뷰 + 탭 패널 */}
      <div className="flex min-h-0 flex-col gap-4 sm:flex-row sm:gap-6">
        {/* 좌측 프리뷰 */}
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
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        {/* 우측 탭 패널 */}
        <div className="flex w-full flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-background sm:w-[360px] sm:shrink-0 dark:border-neutral-800">
          {/* 탭 헤더 */}
          <div className="flex border-b border-neutral-200 dark:border-neutral-800">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={cn(
                    "flex flex-1 cursor-pointer items-center justify-center gap-2 px-3 py-3 text-[13px] font-[500] transition-colors",
                    activeTab === tab.id
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon className="size-4" strokeWidth={activeTab === tab.id ? 2 : 1.5} />
                  {t(tab.labelKey)}
                </button>
              );
            })}
          </div>

          {/* 탭 콘텐츠 */}
          <div className="flex-1">
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
      </div>

      {/* 하단 소스 선택 */}
      <div ref={historyRef} className="mt-6">
        <ImageSourceSelector onSourceSelected={handleSourceSelected} />
      </div>
    </div>
  );
}
