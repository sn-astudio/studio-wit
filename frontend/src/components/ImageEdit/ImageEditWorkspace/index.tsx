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
    <div className="flex h-[calc(100vh-64px)] flex-col overflow-hidden">
      {/* 메인 콘텐츠: 프리뷰 + 탭 패널 */}
      <div className="flex min-h-0 flex-1 flex-col gap-0 sm:flex-row">
        {/* 좌측 프리뷰 */}
        <div className="min-h-[30vh] flex-1 p-3 sm:min-h-0 sm:p-4">
          <ImageEditPreview
            imageUrl={source?.url ?? null}
            canvasRef={canvasRef}
            filterValues={filterValues}
            isCropping={activeTool === "crop"}
            cropRect={cropRect}
            onCropChange={setCropRect}
            onExport={handleExport}
            onGenerateVideo={handleGenerateVideo}
          />
        </div>

        {/* 우측 탭 패널 */}
        <div className="flex w-full flex-1 flex-col border-t border-zinc-800 sm:border-l sm:border-t-0">
          {/* 탭 헤더 */}
          <div className="flex border-b border-zinc-800">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={cn(
                    "flex flex-1 cursor-pointer items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-colors",
                    activeTab === tab.id
                      ? "border-b-2 border-primary text-primary"
                      : "text-zinc-500 hover:text-zinc-300",
                  )}
                >
                  <Icon className="size-3.5" />
                  {t(tab.labelKey)}
                </button>
              );
            })}
          </div>

          {/* 탭 콘텐츠 */}
          <div className="min-h-0 flex-1 overflow-y-auto">
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
      <ImageSourceSelector onSourceSelected={handleSourceSelected} />
    </div>
  );
}
