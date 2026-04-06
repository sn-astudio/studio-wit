"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Scissors, SlidersHorizontal, Sparkle } from "lucide-react";

import { useRouter } from "@/i18n/routing";
import { useImageEditorStore } from "@/stores/imageEditor";
import { usePromptStore } from "@/stores/promptStore";
import type { EditorCanvasHandle } from "@/components/ImageCreate/ImageEditor/EditorCanvas/types";
import type { CropRect } from "@/components/ImageCreate/ImageEditor/types";
import type { CropRatio } from "@/components/ImageCreate/ImageEditor/CropOverlay/types";
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
  { id: "filter", labelKey: "tabFilter", icon: SlidersHorizontal },
  { id: "ai", labelKey: "tabAI", icon: Sparkle },
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
  const [cropRatio, setCropRatio] = useState<CropRatio>("free");

  const filterValues = useImageEditorStore((s) => s.filterValues);
  const activeTool = useImageEditorStore((s) => s.activeTool);
  const reset = useImageEditorStore((s) => s.reset);

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
      setCropRatio("free");
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
    setCropRatio("free");
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
        setCropRatio("free");
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
      <div className="mx-auto flex max-w-7xl flex-col px-4 pb-10 pt-5 sm:pt-6 md:px-6">
        <div className="flex min-h-0 flex-col gap-4 sm:flex-row sm:gap-6">
          {/* 좌측: 프리뷰 */}
          <div className="min-h-[30vh] flex-1 sm:min-h-0">
            <ImageEditPreview
              imageUrl={source?.url ?? null}
              canvasRef={canvasRef}
              filterValues={filterValues}
              isCropping={activeTool === "crop"}
              isFreeCrop={cropRatio === "free"}
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
              {/* 탭 세그먼트 */}
              <div className="px-5 pt-5">
                <div
                  ref={trackRef}
                  className="relative flex flex-1 rounded-lg bg-neutral-100 p-1.5 dark:bg-neutral-800/60"
                >
                  <div
                    className="absolute top-1.5 bottom-1.5 rounded-md bg-white shadow-sm transition-all duration-200 ease-out dark:bg-neutral-700"
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
                        className={`relative z-10 flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-md py-2 text-[13px] font-[500] transition-colors duration-200 ${
                          isActive
                            ? "text-foreground"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <Icon className="size-3.5" strokeWidth={isActive ? 2 : 1.5} />
                        {t(tab.labelKey)}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 패널 콘텐츠 */}
              <div className="flex flex-1 flex-col p-5">
                {activeTab === "edit" && (
                  <EditPanel
                    canvasRef={canvasRef}
                    cropRect={cropRect}
                    setCropRect={setCropRect}
                    cropRatio={cropRatio}
                    setCropRatio={setCropRatio}
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

    </div>
  );
}
