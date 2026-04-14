"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Clapperboard, Download, Scissors, SlidersHorizontal, Sparkle, Wand2 } from "lucide-react";

import { useRouter } from "@/i18n/routing";
import { useImageEditorStore } from "@/stores/imageEditor";
import { usePromptStore } from "@/stores/promptStore";
import type { EditorCanvasHandle } from "@/components/ImageCreate/ImageEditor/EditorCanvas/types";
import type { CropRect } from "@/components/ImageCreate/ImageEditor/types";
import type { CropRatio } from "@/components/ImageCreate/ImageEditor/CropOverlay/types";
import {
  exportCanvas,
  applyFilterToCanvas,
  hasFilterChanges,
} from "@/components/ImageCreate/ImageEditor/utils";


import { ImageEditPreview } from "../ImageEditPreview";
import { HistorySelectModal } from "../HistorySelectModal";
import { EditPanel } from "../EditPanel";
import { ImageFilterPanel } from "../ImageFilterPanel";
import { AIEditPanel } from "../AIEditPanel";
import type { EditTab, ImageSource, ImageEditWorkspaceProps } from "./types";

const TABS: { id: EditTab; labelKey: string; icon: typeof Scissors }[] = [
  { id: "edit", labelKey: "tabEdit", icon: Wand2 },
  { id: "filter", labelKey: "tabFilter", icon: SlidersHorizontal },
  { id: "ai", labelKey: "tabAI", icon: Sparkle },
];

const SHEET_MID = 50; // vh
const SHEET_MAX = 85; // vh

function MobileBottomSheet({
  open,
  onClose,
  activeTab,
  onTabChange,
  tabs,
  t,
  children,
}: {
  open: boolean;
  onClose: () => void;
  activeTab: EditTab;
  onTabChange: (tab: EditTab) => void;
  tabs: typeof TABS;
  t: ReturnType<typeof useTranslations<"ImageEdit">>;
  children: React.ReactNode;
}) {
  const [sheetH, setSheetH] = useState(SHEET_MID);
  const dragRef = useRef<{ startY: number; startH: number } | null>(null);

  // open 시 높이 리셋
  useEffect(() => {
    if (open) setSheetH(SHEET_MID);
  }, [open]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    dragRef.current = { startY: e.touches[0].clientY, startH: sheetH };
  }, [sheetH]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!dragRef.current) return;
    const dy = dragRef.current.startY - e.touches[0].clientY;
    const dvh = (dy / window.innerHeight) * 100;
    const next = Math.max(5, Math.min(SHEET_MAX, dragRef.current.startH + dvh));
    setSheetH(next);
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (!dragRef.current) return;
    dragRef.current = null;
    // 아래로 많이 내리면 닫기
    if (sheetH < 20) {
      onClose();
      return;
    }
    // snap
    const positions = [SHEET_MID, SHEET_MAX];
    let closest = positions[0];
    let minDist = Math.abs(sheetH - positions[0]);
    for (const p of positions) {
      const dist = Math.abs(sheetH - p);
      if (dist < minDist) { minDist = dist; closest = p; }
    }
    setSheetH(closest);
  }, [sheetH, onClose]);

  if (!open) return null;

  return (
    <>
      {/* 백드롭 */}
      <div
        className="fixed inset-0 z-30 bg-black/40 sm:hidden"
        onClick={onClose}
      />
      {/* 시트 */}
      <div
        className="fixed inset-x-0 bottom-0 z-40 flex flex-col rounded-t-2xl bg-white shadow-[0_-4px_24px_rgba(0,0,0,0.15)] transition-[height] duration-200 ease-out sm:hidden dark:bg-neutral-950/85"
        style={{ height: `${sheetH}vh` }}
      >
        {/* 드래그 핸들 */}
        <div
          className="flex shrink-0 cursor-grab items-center justify-center py-3 active:cursor-grabbing"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="h-1 w-8 rounded-full bg-neutral-300 dark:bg-neutral-600" />
        </div>

        {/* 탭 세그먼트 */}
        <div className="shrink-0 bg-white px-4 pb-3 dark:bg-neutral-950/85">
          <div className="relative flex flex-1 rounded-lg bg-neutral-100 p-1.5 dark:bg-neutral-800/60">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={`relative z-10 flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-md py-2 text-[13px] font-[500] transition-colors duration-200 ${
                    isActive
                      ? "bg-white text-foreground shadow-sm dark:bg-neutral-700"
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
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain scrollbar-none px-4 pb-[env(safe-area-inset-bottom)]" style={{ display: "grid", gridTemplateRows: "1fr" }}>
          {children}
        </div>
      </div>
    </>
  );
}

export function ImageEditWorkspace({
  initialImageUrl,
}: ImageEditWorkspaceProps) {
  const t = useTranslations("ImageEdit");
  const router = useRouter();

  const [source, setSource] = useState<ImageSource | null>(
    initialImageUrl ? { url: initialImageUrl } : null,
  );
  const [activeTab, setActiveTab] = useState<EditTab>("edit");
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const canvasRef = useRef<EditorCanvasHandle>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [filterToolActive, setFilterToolActive] = useState(false);
  const [cropRect, setCropRect] = useState<CropRect | null>(null);
  const [cropRatio, setCropRatio] = useState<CropRatio>("free");
  const [freeRotateDegrees, setFreeRotateDegrees] = useState(0);
  const [drawEraserMode, setDrawEraserMode] = useState(false);
  const [resizePreviewScale, setResizePreviewScale] = useState<
    { scaleX: number; scaleY: number } | undefined
  >();

  const filterValues = useImageEditorStore((s) => s.filterValues);
  const activeTool = useImageEditorStore((s) => s.activeTool);
  const drawingSettings = useImageEditorStore((s) => s.drawingSettings);
  const textSettings = useImageEditorStore((s) => s.textSettings);
  const setTextSettings = useImageEditorStore((s) => s.setTextSettings);
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

  const handleResizeChange = useCallback(
    (w: number, h: number) => {
      const canvas = canvasRef.current?.getMainCanvas();
      if (!canvas) return;
      setResizePreviewScale({
        scaleX: w / canvas.width,
        scaleY: h / canvas.height,
      });
    },
    [],
  );

  const handleTextPlace = useCallback(
    (x: number, y: number) => {
      setTextSettings({ ...textSettings, placedX: x, placedY: y });
    },
    [textSettings, setTextSettings],
  );

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

    const needsBake = hasFilterChanges(filterValues);

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

    const needsBake = hasFilterChanges(filterValues);

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

  const handleOpenHistoryModal = useCallback(() => {
    setHistoryModalOpen(true);
  }, []);

  const handleTabChange = useCallback(
    (tab: EditTab) => {
      // 미적용 오버레이(그리기/지우개/텍스트) 클리어
      canvasRef.current?.clearOverlay();

      // crop 초기화
      if (activeTool === "crop") {
        setCropRect(null);
        setCropRatio("free");
      }
      // 자유 회전 초기화
      if (activeTool === "freeRotate") {
        setFreeRotateDegrees(0);
      }
      // 리사이즈 초기화
      if (activeTool === "resize") {
        setResizePreviewScale(undefined);
      }
      // 모자이크: 미적용 시 undo
      if (activeTool === "mosaic") {
        canvasRef.current?.undo();
      }

      if (tab === "filter") {
        useImageEditorStore.getState().setActiveTool("filter");
      } else if (tab !== "edit") {
        useImageEditorStore.getState().setActiveTool(null);
      } else {
        useImageEditorStore.getState().setActiveTool(null);
      }
      setActiveTab(tab);
    },
    [activeTool],
  );

  return (
    <div className="relative">
      {/* 메인 콘텐츠 */}
      <div className="mx-auto flex max-w-7xl flex-col px-4 pt-5 pb-5 sm:h-[calc(100dvh-64px)] sm:pt-6 sm:pb-6 md:px-6">
        <div className="flex min-h-0 flex-1 flex-col gap-4 sm:flex-row sm:gap-6">
          {/* 좌측: 프리뷰 */}
          <div className="flex flex-1 flex-col min-h-0">
            <ImageEditPreview
              imageUrl={source?.url ?? null}
              canvasRef={canvasRef}
              filterValues={filterValues}
              activeTool={activeTool}
              cropRect={cropRect}
              onCropChange={setCropRect}
              drawingSettings={drawingSettings}
              textSettings={textSettings}
              onTextPlace={handleTextPlace}
              freeRotateDegrees={freeRotateDegrees}
              resizePreviewScale={resizePreviewScale}
              drawEraserMode={drawEraserMode}
              onExport={handleExport}
              onGenerateVideo={handleGenerateVideo}
              onUpload={handleFileUpload}
              onScrollToHistory={handleOpenHistoryModal}
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

            {/* 모바일 편집 도구 버튼 */}
            {source && (
              <button
                onClick={() => toast(t("mobileEditSoon"))}
                className="mt-3 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-foreground py-3 text-[14px] font-[600] text-background transition-colors hover:opacity-90 sm:hidden"
              >
                <Wand2 className="size-4" />
                {t("tabEdit")}
              </button>
            )}
          </div>

          {/* 우측 패널 — 데스크톱 고정 */}
          {source && (
            <div className="hidden sm:block sm:w-[360px] sm:shrink-0">
              <div className="fixed top-[88px] bottom-6 right-[max(16px,calc((100vw-1280px)/2+24px))] flex w-[360px] flex-col overflow-hidden rounded-2xl border-2 border-neutral-200 bg-white shadow-lg dark:border-neutral-800/80 dark:bg-neutral-950/85 dark:backdrop-blur-xl">
                {/* 탭 세그먼트 — 상단 고정 */}
                <div className="shrink-0 bg-white px-5 pt-5 pb-4 dark:bg-neutral-950/85">
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

                {/* 패널 콘텐츠 — 스크롤 영역 */}
                <div className="min-h-0 flex-1 overflow-y-auto scrollbar-none px-5 pb-0" style={{ display: "grid", gridTemplateRows: "1fr" }}>
                  {activeTab === "edit" && (
                    <EditPanel
                      canvasRef={canvasRef}
                      cropRect={cropRect}
                      setCropRect={setCropRect}
                      cropRatio={cropRatio}
                      setCropRatio={setCropRatio}
                      onFreeRotateChange={setFreeRotateDegrees}
                      onResizeChange={handleResizeChange}
                      drawEraserMode={drawEraserMode}
                      onDrawEraserModeChange={setDrawEraserMode}
                    />
                  )}
                  {activeTab === "filter" && (
                    <ImageFilterPanel canvasRef={canvasRef} onToolActiveChange={setFilterToolActive} />
                  )}
                  {activeTab === "ai" && (
                    <AIEditPanel
                      sourceUrl={source?.url ?? null}
                      onUseAsSource={handleUseAsSource}
                    />
                  )}
                </div>

                {/* 하단 내보내기 CTA — 소도구 미선택 시에만 표시 */}
                {((activeTab === "edit" && !activeTool) || (activeTab === "filter" && !filterToolActive)) && (
                  <div className="shrink-0 px-5 pt-4 pb-4 flex gap-2">
                    <button
                      onClick={handleExport}
                      className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border border-neutral-200 bg-transparent py-2.5 text-[13px] font-[600] text-foreground transition-all hover:bg-neutral-100 active:opacity-80 dark:border-neutral-700 dark:hover:bg-neutral-800"
                    >
                      <Download className="size-4" />
                      {t("downloadImage")}
                    </button>
                    <button
                      onClick={handleGenerateVideo}
                      className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-[13px] font-[600] text-white transition-all hover:opacity-90 active:opacity-80"
                    >
                      <Clapperboard className="size-4" />
                      {t("generateVideo")}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 모바일 바텀시트 */}
        {source && typeof document !== "undefined" && createPortal(
          <MobileBottomSheet
            open={mobileSheetOpen}
            onClose={() => setMobileSheetOpen(false)}
            activeTab={activeTab}
            onTabChange={handleTabChange}
            tabs={TABS}
            t={t}
          >
            {activeTab === "edit" && (
              <EditPanel
                canvasRef={canvasRef}
                cropRect={cropRect}
                setCropRect={setCropRect}
                cropRatio={cropRatio}
                setCropRatio={setCropRatio}
                onFreeRotateChange={setFreeRotateDegrees}
                onResizeChange={handleResizeChange}
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
          </MobileBottomSheet>,
          document.body,
        )}

      </div>

      <HistorySelectModal
        isOpen={historyModalOpen}
        onClose={() => setHistoryModalOpen(false)}
        onSelect={(s) => handleSourceSelected(s)}
      />
    </div>
  );
}
