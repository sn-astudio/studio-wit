"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Download, Merge, Save, Scissors, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { ChevronDown, ChevronUp, Film, Trash2, Wand2 } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { useTrimVideo, useSaveEdit } from "@/hooks/queries/useVideoEdit";

import { VideoEditPreview } from "../VideoEditPreview";
import { VideoSourceSelector } from "../VideoSourceSelector";
import { VideoTimeline } from "../VideoTimeline";
import { TrimControls } from "../TrimControls";
import { AIEditPanel } from "../AIEditPanel";
import { MergePanel } from "../MergePanel";
import { EffectsPanel } from "../EffectsPanel";
import { VideoSourceSelectModal } from "../VideoSourceSelectModal";
import type { MergeClip } from "../MergePanel/types";
import { downloadVideo } from "../utils";
import type { VideoSource } from "./types";

type EditTab = "trim" | "ai" | "effects" | "merge";

export function VideoEditWorkspace() {
  const t = useTranslations("VideoEdit");
  const videoRef = useRef<HTMLVideoElement>(null);
  const searchParams = useSearchParams();

  // 탭
  const [activeTab, setActiveTab] = useState<EditTab>("trim");

  // 소스 상태
  const [source, setSource] = useState<VideoSource | null>(null);

  // URL 파라미터로 전달된 비디오 자동 로드
  const initializedRef = useRef(false);
  useEffect(() => {
    if (initializedRef.current) return;
    const urlParam = searchParams.get("url");
    if (urlParam) {
      initializedRef.current = true;
      setSource({
        url: urlParam,
        duration: 0,
        width: 0,
        height: 0,
        name: "Imported video",
      });
    }
  }, [searchParams]);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  // 트림 범위
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);

  // 결과
  const [resultUrl, setResultUrl] = useState<string | null>(null);

  // 효과 프리뷰 필터
  const [previewCssFilter, setPreviewCssFilter] = useState("");

  // 합치기
  const addMergeClipRef = useRef<((url: string, name?: string) => void) | null>(null);
  const removeMergeClipRef = useRef<((id: string) => void) | null>(null);
  const moveMergeClipRef = useRef<((idx: number, direction: -1 | 1) => void) | null>(null);
  const resetMergeClipsRef = useRef<(() => void) | null>(null);
  const [mergePreviewUrl, setMergePreviewUrl] = useState<string | null>(null);
  const [mergeClips, setMergeClips] = useState<MergeClip[]>([]);

  // 모달
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalVideoUrl, setModalVideoUrl] = useState<string | null>(null);
  const [modalVideoName, setModalVideoName] = useState<string>("");
  const [isSavingModal, setIsSavingModal] = useState(false);
  const [isDownloadingModal, setIsDownloadingModal] = useState(false);

  const saveEditMutation = useSaveEdit();

  const [mergeDragIdx, setMergeDragIdx] = useState<number | null>(null);

  const handleMergeDragOver = useCallback(
    (e: React.DragEvent, targetIdx: number) => {
      e.preventDefault();
      if (mergeDragIdx === null || mergeDragIdx === targetIdx) return;
      setMergeClips((prev) => {
        const next = [...prev];
        const [moved] = next.splice(mergeDragIdx, 1);
        next.splice(targetIdx, 0, moved);
        return next;
      });
      setMergeDragIdx(targetIdx);
    },
    [mergeDragIdx],
  );

  const trimMutation = useTrimVideo();

  const handleSourceSelected = useCallback((src: VideoSource) => {
    setSource(src);
    setResultUrl(null);
    setTrimStart(0);
    setTrimEnd(0);
    setCurrentTime(0);
  }, []);

  const handleDurationLoaded = useCallback(
    (dur: number) => {
      setDuration(dur);
      if (trimEnd === 0) {
        setTrimEnd(dur);
      }
    },
    [trimEnd],
  );

  const handleSeek = useCallback((time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
    setCurrentTime(time);
  }, []);

  const handleTrim = useCallback(async () => {
    if (!source) return;
    try {
      const result = await trimMutation.mutateAsync({
        source_url: source.url,
        start_time: trimStart,
        end_time: trimEnd,
      });
      setResultUrl(result.result_url);
      toast.success(t("trimSuccess"));
    } catch {
      toast.error(t("trimError"));
    }
  }, [source, trimStart, trimEnd, trimMutation, t]);

  const handleReset = useCallback(() => {
    setTrimStart(0);
    setTrimEnd(duration);
    setResultUrl(null);
  }, [duration]);

  // 모달 열기
  const openModal = useCallback((url: string, name?: string) => {
    setModalVideoUrl(url);
    setModalVideoName(name || "");
    setIsModalOpen(true);
  }, []);

  // 모달 닫기
  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setModalVideoUrl(null);
    setModalVideoName("");
    setIsSavingModal(false);
    setIsDownloadingModal(false);
  }, []);

  // 모달 후처리: 현재 결과 초기화 + 선택 동영상으로 전환
  const resetAndLoadSelectedVideo = useCallback(() => {
    if (!modalVideoUrl) return;
    if (activeTab === "merge") {
      // merge 탭: 클립 초기화 + 선택 동영상 클립으로 추가
      resetMergeClipsRef.current?.();
      setMergeClips([]);
      setResultUrl(null);
      setMergePreviewUrl(null);
      setTimeout(() => {
        addMergeClipRef.current?.(modalVideoUrl, modalVideoName || "Selected video");
      }, 50);
    } else {
      // 다른 탭: 소스를 선택한 동영상으로 교체
      setResultUrl(null);
      setSource({
        url: modalVideoUrl,
        duration: 0,
        width: 0,
        height: 0,
        name: modalVideoName || "Selected video",
      });
      setTrimStart(0);
      setTrimEnd(0);
      setCurrentTime(0);
    }
    closeModal();
  }, [modalVideoUrl, modalVideoName, activeTab, closeModal]);

  // 모달에서 저장 (작업 완료 동영상을 저장)
  const handleModalSave = useCallback(async () => {
    if (!resultUrl) return;
    setIsSavingModal(true);
    try {
      await saveEditMutation.mutateAsync({
        result_url: resultUrl,
        edit_type: activeTab,
        prompt: source?.name || "Saved video",
      });
      toast.success(t("saveSuccess"));
      resetAndLoadSelectedVideo();
    } catch {
      toast.error(t("saveError"));
    } finally {
      setIsSavingModal(false);
    }
  }, [resultUrl, activeTab, source?.name, saveEditMutation, t, resetAndLoadSelectedVideo]);

  // 모달에서 다운로드 (작업 완료 동영상을 다운로드)
  const handleModalDownload = useCallback(() => {
    if (!resultUrl) return;
    setIsDownloadingModal(true);
    try {
      downloadVideo(resultUrl, `${activeTab}_${Date.now()}.mp4`);
      toast.success(t("downloadSuccess"));
      resetAndLoadSelectedVideo();
    } catch {
      toast.error(t("downloadError"));
    } finally {
      setIsDownloadingModal(false);
    }
  }, [resultUrl, activeTab, t, resetAndLoadSelectedVideo]);

  // 모달에서 취소
  const handleModalCancel = useCallback(() => {
    resetAndLoadSelectedVideo();
  }, [resetAndLoadSelectedVideo]);

  const displayUrl = resultUrl ?? source?.url ?? null;

  // 작업 중이거나 완료 결과가 있을 때 페이지 이탈 방지
  const hasUnsavedWork = !!resultUrl || trimMutation.isPending || saveEditMutation.isPending;
  useEffect(() => {
    if (!hasUnsavedWork) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasUnsavedWork]);

  return (
    <div className="flex h-[calc(100vh-64px)] flex-col gap-3 overflow-y-auto p-4">
      {/* 메인: 프리뷰(왼쪽) + 편집옵션(오른쪽) */}
      <div className="flex gap-4">
        {/* 왼쪽: 프리뷰 + 타임라인 */}
        <div className="flex w-1/2 shrink-0 flex-col gap-3">
          {activeTab === "merge" ? (
            /* 합치기: 결과 또는 클립 목록 */
            <div className="min-h-[280px] w-full overflow-hidden rounded-2xl border border-zinc-800 bg-black">
              {resultUrl ? (
                /* 합치기 완료 결과 */
                <div className="flex h-full items-center justify-center">
                  <video
                    src={resultUrl}
                    className="max-h-full max-w-full object-contain"
                    controls
                    muted
                  />
                </div>
              ) : (
                /* 클립 목록 */
                <div className="flex h-full w-full flex-col border-dashed border-zinc-700 bg-zinc-900/40">
                  {mergeClips.length === 0 ? (
                    <div className="flex flex-1 flex-col items-center justify-center gap-2 text-zinc-600">
                      <Film className="mb-3 size-12" />
                      <p className="text-sm text-zinc-500">{t("mergePreviewEmpty")}</p>
                    </div>
                  ) : (
                    <div className="flex w-full flex-col overflow-y-auto p-2 gap-1.5">
                      {mergeClips.map((clip, idx) => (
                        <div
                          key={clip.id}
                          draggable
                          onDragStart={() => setMergeDragIdx(idx)}
                          onDragOver={(e) => handleMergeDragOver(e, idx)}
                          onDragEnd={() => setMergeDragIdx(null)}
                          className={`flex shrink-0 cursor-grab items-center gap-2 rounded-lg bg-zinc-900/60 px-2 py-1.5 transition-colors hover:bg-zinc-800/60 ${
                            mergeDragIdx === idx ? "ring-1 ring-primary" : ""
                          }`}
                        >
                          <div className="flex shrink-0 flex-col">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                moveMergeClipRef.current?.(idx, -1);
                              }}
                              disabled={idx === 0}
                              className="text-zinc-600 hover:text-zinc-300 disabled:opacity-20"
                            >
                              <ChevronUp className="size-3" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                moveMergeClipRef.current?.(idx, 1);
                              }}
                              disabled={idx === mergeClips.length - 1}
                              className="text-zinc-600 hover:text-zinc-300 disabled:opacity-20"
                            >
                              <ChevronDown className="size-3" />
                            </button>
                          </div>
                          <span className="text-xs font-mono text-zinc-500 w-4 text-center">
                            {idx + 1}
                          </span>
                          <video
                            src={clip.url}
                            className="h-10 w-16 shrink-0 rounded object-cover"
                            muted
                            preload="metadata"
                          />
                          <span className="min-w-0 flex-1 truncate text-xs text-zinc-300">
                            {clip.name ?? `Clip ${idx + 1}`}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeMergeClipRef.current?.(clip.id);
                            }}
                            className="shrink-0 text-zinc-600 hover:text-red-400"
                          >
                            <Trash2 className="size-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <>
              <VideoEditPreview
                videoUrl={displayUrl}
                currentTime={currentTime}
                onTimeUpdate={setCurrentTime}
                onDurationLoaded={handleDurationLoaded}
                videoRef={videoRef}
                cssFilter={activeTab === "effects" ? previewCssFilter : undefined}
              />

              {/* 타임라인 (트림 탭, 소스 있고 결과 없을 때만) */}
              {activeTab === "trim" && source && duration > 0 && !resultUrl && (
                <VideoTimeline
                  duration={duration}
                  currentTime={currentTime}
                  trimStart={trimStart}
                  trimEnd={trimEnd}
                  onTrimStartChange={setTrimStart}
                  onTrimEndChange={setTrimEnd}
                  onSeek={handleSeek}
                />
              )}
            </>
          )}
        </div>

        {/* 오른쪽: 편집 옵션 (합치기 탭에서는 전체 폭) */}
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          {/* 탭 전환 */}
          <div className="flex gap-1 rounded-lg bg-zinc-900/60 p-1">
            <button
              onClick={() => setActiveTab("trim")}
              className={`flex items-center gap-1.5 rounded-md px-4 py-2 text-sm transition-colors ${
                activeTab === "trim"
                  ? "bg-zinc-800 text-foreground"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <Scissors className="size-3.5" />
              {t("tabTrim")}
            </button>
            <button
              onClick={() => setActiveTab("ai")}
              className={`flex items-center gap-1.5 rounded-md px-4 py-2 text-sm transition-colors ${
                activeTab === "ai"
                  ? "bg-zinc-800 text-foreground"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <Sparkles className="size-3.5" />
              {t("tabAI")}
            </button>
            <button
              onClick={() => setActiveTab("effects")}
              className={`flex items-center gap-1.5 rounded-md px-4 py-2 text-sm transition-colors ${
                activeTab === "effects"
                  ? "bg-zinc-800 text-foreground"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <Wand2 className="size-3.5" />
              {t("tabEffects")}
            </button>
            <button
              onClick={() => setActiveTab("merge")}
              className={`flex items-center gap-1.5 rounded-md px-4 py-2 text-sm transition-colors ${
                activeTab === "merge"
                  ? "bg-zinc-800 text-foreground"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <Merge className="size-3.5" />
              {t("tabMerge")}
            </button>
          </div>

          {/* 트리밍 탭 */}
          {source && activeTab === "trim" && duration > 0 && (
            <div className="space-y-2">
              <TrimControls
                trimStart={trimStart}
                trimEnd={trimEnd}
                duration={duration}
                isTrimming={trimMutation.isPending}
                onTrim={handleTrim}
                onReset={handleReset}
              />

              {resultUrl && (
                <div className="space-y-2 rounded-xl bg-primary/10 px-4 py-3">
                  <span className="text-sm font-semibold text-primary">
                    {t("trimComplete")}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1 gap-1.5"
                      onClick={() => {
                        downloadVideo(resultUrl, `trimmed_${Date.now()}.mp4`);
                        toast.success(t("downloadSuccess"));
                      }}
                    >
                      <Download className="size-3.5" />
                      {t("download")}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 gap-1.5"
                      disabled={saveEditMutation.isPending}
                      onClick={async () => {
                        try {
                          await saveEditMutation.mutateAsync({
                            result_url: resultUrl,
                            edit_type: "trim",
                            prompt: source?.name || "Trimmed video",
                          });
                          toast.success(t("saveSuccess"));
                        } catch {
                          toast.error(t("saveError"));
                        }
                      }}
                    >
                      <Save className="size-3.5" />
                      {t("saveMerged")}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* AI 편집 탭 */}
          {source && activeTab === "ai" && (
            <AIEditPanel
              sourceUrl={source.url}
              currentTime={currentTime}
            />
          )}

          {/* 효과 탭 */}
          {source && activeTab === "effects" && (
            <>
              <EffectsPanel
                sourceUrl={source.url}
                onEffectApplied={setResultUrl}
                onPreviewFilter={setPreviewCssFilter}
              />

              {resultUrl && (
                <div className="space-y-2 rounded-xl bg-primary/10 px-4 py-3">
                  <span className="text-sm font-semibold text-primary">
                    {t("effectApplied")}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1 gap-1.5"
                      onClick={() => {
                        downloadVideo(resultUrl, `effect_${Date.now()}.mp4`);
                        toast.success(t("downloadSuccess"));
                      }}
                    >
                      <Download className="size-3.5" />
                      {t("download")}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 gap-1.5"
                      disabled={saveEditMutation.isPending}
                      onClick={async () => {
                        try {
                          await saveEditMutation.mutateAsync({
                            result_url: resultUrl,
                            edit_type: "effects",
                            prompt: source?.name || "Effect applied",
                          });
                          toast.success(t("saveSuccess"));
                        } catch {
                          toast.error(t("saveError"));
                        }
                      }}
                    >
                      <Save className="size-3.5" />
                      {t("saveMerged")}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* 합치기 탭 */}
          {activeTab === "merge" && (
            <MergePanel
              onMergeComplete={(url) => {
                setResultUrl(url);
                setMergePreviewUrl(url);
              }}
              onAddClipRef={(fn) => {
                addMergeClipRef.current = fn;
              }}
              onRemoveClipRef={(fn) => {
                removeMergeClipRef.current = fn;
              }}
              onMoveClipRef={(fn) => {
                moveMergeClipRef.current = fn;
              }}
              onResetClipsRef={(fn) => {
                resetMergeClipsRef.current = fn;
              }}
              onClipsChange={(c) => setMergeClips(c)}
            />
          )}
        </div>
      </div>

      {/* 소스 선택 */}
      <VideoSourceSelector
        onSourceSelected={handleSourceSelected}
        isLoading={false}
        mergeMode={activeTab === "merge"}
        onAddToMerge={(url, name) => addMergeClipRef.current?.(url, name)}
        onSelectVideo={resultUrl ? openModal : undefined}
      />

      {/* 모달 */}
      <VideoSourceSelectModal
        isOpen={isModalOpen}
        videoUrl={resultUrl}
        videoName={source?.name || "편집 결과"}
        onSave={handleModalSave}
        onDownload={handleModalDownload}
        onCancel={handleModalCancel}
        isSaving={isSavingModal}
        isDownloading={isDownloadingModal}
      />
    </div>
  );
}
