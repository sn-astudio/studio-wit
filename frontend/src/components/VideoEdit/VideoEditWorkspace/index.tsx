"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Download, Globe, Lock, Loader2, Merge, MessageCircle, Save, ScanSearch, Scissors, Sparkles, Volume2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { ChevronDown, ChevronUp, Columns2, Crop, Film, ImageIcon, Pause, Play, Redo2, RotateCcw, Trash2, Undo2, Wand2 } from "lucide-react";

import { Button } from "@/components/ui/Button";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
} from "@/components/ui/Select";
import { useTrimVideo, useSaveEdit } from "@/hooks/queries/useVideoEdit";
import { useGeneration } from "@/hooks/queries/useGeneration";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/hooks/queries/keys";

import { VideoEditPreview } from "../VideoEditPreview";
import { VideoSourceSelector } from "../VideoSourceSelector";
import { VideoTimeline } from "../VideoTimeline";
import { TrimControls } from "../TrimControls";
import { AIEditPanel } from "../AIEditPanel";
import { MergePanel } from "../MergePanel";
import { EffectsPanel } from "../EffectsPanel";
import { SubtitlesPanel } from "../SubtitlesPanel";
import { AudioPanel } from "../AudioPanel";
import { GifPanel } from "../GifPanel";
import { SceneSplitPanel } from "../SceneSplitPanel";
import { ThumbnailPanel } from "../ThumbnailPanel";
import { CropPanel } from "../CropPanel";
import { VideoSourceSelectModal } from "../VideoSourceSelectModal";
import type { MergeClip } from "../MergePanel/types";
import { downloadVideo } from "../utils";
import { useVideoEditStore } from "@/stores/videoEditStore";
import { useNotifyOnComplete } from "@/hooks/useNotifyOnComplete";
import type { VideoSource } from "./types";

type EditTab = "trim" | "ai" | "effects" | "merge" | "subtitles" | "audio" | "gif" | "thumbnail" | "crop";

export function VideoEditWorkspace() {
  const t = useTranslations("VideoEdit");
  const notify = useNotifyOnComplete();
  const queryClient = useQueryClient();
  const videoRef = useRef<HTMLVideoElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const searchParams = useSearchParams();

  // 탭 (URL ?tab= 파라미터로 초기값 설정)
  const [activeTab, setActiveTab] = useState<EditTab>(() => {
    const tab = searchParams.get("tab");
    if (tab === "ai" || tab === "trim" || tab === "effects" || tab === "merge" || tab === "subtitles") return tab;
    return "trim";
  });

  // 탭 전환 확인 모달
  const [pendingTab, setPendingTab] = useState<EditTab | null>(null);
  const [isTabConfirmOpen, setIsTabConfirmOpen] = useState(false);

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

  // 결과 + Undo/Redo
  const [resultUrl, setResultUrlRaw] = useState<string | null>(null);
  const historyRef = useRef<{ url: string | null; snapshot: import("@/stores/videoEditStore").EffectsSnapshot }[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const restoreEffects = useVideoEditStore((s) => s.restoreEffects);
  const resetEffects = useVideoEditStore((s) => s.resetEffects);

  const canUndo = historyIdx >= 0;
  const canRedo = historyIdx < historyRef.current.length - 1;

  // 편집 결과 저장 (히스토리에 push)
  const setResultUrl = useCallback((url: string | null) => {
    if (url === null) {
      // 리셋 호출은 히스토리에 넣지 않음
      setResultUrlRaw(null);
      return;
    }
    const snapshot = { ...useVideoEditStore.getState().effects };
    const newHistory = historyRef.current.slice(0, historyIdx + 1);
    newHistory.push({ url, snapshot });
    historyRef.current = newHistory;
    setHistoryIdx(newHistory.length - 1);
    setResultUrlRaw(url);
  }, [historyIdx]);

  const clearPreviews = useCallback(() => {
    setPreviewCssFilter("");
    setPreviewTextOverlay(null);
    setPreviewWatermark(null);
    setPreviewSubtitles([]);
    setPreviewSpeed(1);
  }, []);

  const handleUndo = useCallback(() => {
    if (historyIdx < 0) return;
    const newIdx = historyIdx - 1;
    setHistoryIdx(newIdx);
    if (newIdx >= 0) {
      const entry = historyRef.current[newIdx];
      setResultUrlRaw(entry.url);
      restoreEffects(entry.snapshot);
    } else {
      setResultUrlRaw(null);
      resetEffects();
    }
    clearPreviews();
  }, [historyIdx, restoreEffects, resetEffects, clearPreviews]);

  const handleRedo = useCallback(() => {
    if (historyIdx >= historyRef.current.length - 1) return;
    const newIdx = historyIdx + 1;
    const entry = historyRef.current[newIdx];
    setHistoryIdx(newIdx);
    setResultUrlRaw(entry.url);
    restoreEffects(entry.snapshot);
    clearPreviews();
  }, [historyIdx, restoreEffects, clearPreviews]);

  const handleReset = useCallback(() => {
    setResultUrlRaw(null);
    historyRef.current = [];
    setHistoryIdx(-1);
    resetEffects();
    clearPreviews();
  }, [resetEffects, clearPreviews]);

  // Ctrl+Z / Ctrl+Shift+Z 키보드 단축키
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleUndo, handleRedo]);

  // 비교 모드
  const [compareMode, setCompareMode] = useState(false);
  const [syncPlaying, setSyncPlaying] = useState(false);
  const originalVideoRef = useRef<HTMLVideoElement | null>(null);
  // 소스 변경 시 비교 모드 + 히스토리 + 이펙트 리셋
  useEffect(() => {
    setCompareMode(false);
    setSyncPlaying(false);
    historyRef.current = [];
    setHistoryIdx(-1);
    resetEffects();
  }, [source?.url, resetEffects]);

  const handleSyncPlayPause = useCallback(() => {
    const orig = originalVideoRef.current;
    const edit = videoRef.current;
    if (!orig || !edit) return;

    if (syncPlaying) {
      orig.pause();
      edit.pause();
      setSyncPlaying(false);
    } else {
      // 둘 다 처음부터 동시 재생
      orig.currentTime = 0;
      edit.currentTime = 0;
      orig.play();
      edit.play();
      setSyncPlaying(true);
    }
  }, [syncPlaying, videoRef]);

  // 영상 끝나면 동시 재생 상태 리셋
  useEffect(() => {
    const orig = originalVideoRef.current;
    const edit = videoRef.current;
    if (!compareMode || !orig || !edit) return;
    const handler = () => setSyncPlaying(false);
    orig.addEventListener("ended", handler);
    edit.addEventListener("ended", handler);
    return () => {
      orig.removeEventListener("ended", handler);
      edit.removeEventListener("ended", handler);
    };
  }, [compareMode, videoRef]);

  // 효과 프리뷰
  const [previewCssFilter, setPreviewCssFilter] = useState("");
  const [previewTextOverlay, setPreviewTextOverlay] = useState<import("../VideoEditPreview/types").TextOverlayPreview | null>(null);
  const [previewWatermark, setPreviewWatermark] = useState<import("../VideoEditPreview/types").WatermarkPreview | null>(null);
  const [previewSubtitles, setPreviewSubtitles] = useState<import("../VideoEditPreview/types").SubtitlePreviewItem[]>([]);
  const [previewSpeed, setPreviewSpeed] = useState(1);

  // 합치기
  const addMergeClipRef = useRef<((url: string, name?: string) => void) | null>(null);
  const removeMergeClipRef = useRef<((id: string) => void) | null>(null);
  const moveMergeClipRef = useRef<((idx: number, direction: -1 | 1) => void) | null>(null);
  const resetMergeClipsRef = useRef<(() => void) | null>(null);
  const setMergeClipsInternalRef = useRef<React.Dispatch<React.SetStateAction<MergeClip[]>> | null>(null);
  const [mergePreviewUrl, setMergePreviewUrl] = useState<string | null>(null);
  const [mergeClips, setMergeClips] = useState<MergeClip[]>([]);

  // 모달
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalVideoUrl, setModalVideoUrl] = useState<string | null>(null);
  const [modalVideoName, setModalVideoName] = useState<string>("");
  const [isSavingModal, setIsSavingModal] = useState(false);
  const [isDownloadingModal, setIsDownloadingModal] = useState(false);
  const [isPublicSave, setIsPublicSave] = useState(false);

  // 자식 패널 dirty 상태
  const [isPanelDirty, setIsPanelDirty] = useState(false);

  // AI 생성 상태 (탭 전환 + 새로고침해도 유지)
  const AI_GEN_KEY = "videoEdit_aiGenerationId";
  const [aiGenerationId, setAiGenerationId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return sessionStorage.getItem(AI_GEN_KEY);
  });
  const [aiElapsed, setAiElapsed] = useState(0);
  const aiTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // sessionStorage 동기화
  useEffect(() => {
    if (aiGenerationId) {
      sessionStorage.setItem(AI_GEN_KEY, aiGenerationId);
    } else {
      sessionStorage.removeItem(AI_GEN_KEY);
    }
  }, [aiGenerationId]);

  const { data: aiGenData } = useGeneration(aiGenerationId, !!aiGenerationId);
  const aiGeneration = aiGenData?.generation ?? null;
  const aiIsGenerating =
    aiGeneration?.status === "pending" || aiGeneration?.status === "processing";
  const aiIsCompleted = aiGeneration?.status === "completed";
  const aiIsFailed = aiGeneration?.status === "failed";

  // 완료/실패 시 sessionStorage 정리
  useEffect(() => {
    if (aiIsCompleted || aiIsFailed) {
      sessionStorage.removeItem(AI_GEN_KEY);
    }
  }, [aiIsCompleted, aiIsFailed]);

  // AI 경과 시간 타이머
  useEffect(() => {
    if (aiIsGenerating) {
      aiTimerRef.current = setInterval(() => setAiElapsed((e) => e + 1), 1000);
    } else if (aiTimerRef.current) {
      clearInterval(aiTimerRef.current);
      aiTimerRef.current = null;
    }
    return () => {
      if (aiTimerRef.current) clearInterval(aiTimerRef.current);
    };
  }, [aiIsGenerating]);

  // AI 완료/실패 시 알림
  const prevAiStatusRef = useRef<string | null>(null);
  useEffect(() => {
    if (!aiGeneration) return;
    const prev = prevAiStatusRef.current;
    prevAiStatusRef.current = aiGeneration.status;
    if (prev && prev !== aiGeneration.status) {
      if (aiGeneration.status === "completed") {
        notify(t("aiGenerateComplete"), aiGeneration.prompt ?? undefined);
        queryClient.invalidateQueries({ queryKey: queryKeys.generation.all });
      } else if (aiGeneration.status === "failed") {
        notify(t("aiGenerateError"), aiGeneration.error?.message ?? undefined);
      }
    }
  }, [aiGeneration, notify, t, queryClient]);

  const handleAiGenerationIdChange = useCallback((id: string | null) => {
    setAiGenerationId(id);
    setAiElapsed(0);
    prevAiStatusRef.current = null;
  }, []);

  const saveEditMutation = useSaveEdit();

  const [mergeDragIdx, setMergeDragIdx] = useState<number | null>(null);
  const [mergeDragOverIdx, setMergeDragOverIdx] = useState<number | null>(null);
  const mergeDragIdxRef = useRef<number | null>(null);
  const mergeClipListRef = useRef<HTMLDivElement>(null);

  const handleMergePointerDown = useCallback(
    (e: React.PointerEvent, idx: number) => {
      // 버튼 클릭은 무시
      if ((e.target as HTMLElement).closest("button")) return;
      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      setMergeDragIdx(idx);
      setMergeDragOverIdx(idx);
      mergeDragIdxRef.current = idx;
    },
    [],
  );

  const handleMergePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (mergeDragIdxRef.current === null || !mergeClipListRef.current) return;
      const items = mergeClipListRef.current.children;
      const y = e.clientY;
      for (let i = 0; i < items.length; i++) {
        const rect = items[i].getBoundingClientRect();
        if (y >= rect.top && y <= rect.bottom) {
          setMergeDragOverIdx(i);
          return;
        }
      }
    },
    [],
  );

  const handleMergePointerUp = useCallback(() => {
    const fromIdx = mergeDragIdxRef.current;
    const overIdx = mergeDragOverIdx;
    setMergeDragIdx(null);
    setMergeDragOverIdx(null);
    mergeDragIdxRef.current = null;

    if (fromIdx === null || overIdx === null || fromIdx === overIdx) return;

    // MergePanel 내부 setClips만 호출 → onClipsChange로 parent에 자동 전파
    setMergeClipsInternalRef.current?.((prev: MergeClip[]) => {
      const next = [...prev];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(overIdx, 0, moved);
      return next;
    });
  }, [mergeDragOverIdx]);

  // 탭 전환 로직 (모든 state 선언 이후)
  const resetAllState = useCallback(() => {
    setResultUrl(null);
    setTrimStart(0);
    setTrimEnd(duration);
    setCurrentTime(0);
    setPreviewCssFilter("");
    setPreviewTextOverlay(null);
    setPreviewWatermark(null);
    setPreviewSpeed(1);
    setMergePreviewUrl(null);
    setMergeClips([]);
    setMergeDragIdx(null);
    setMergeDragOverIdx(null);
    mergeDragIdxRef.current = null;
    setIsModalOpen(false);
    setModalVideoUrl(null);
    setModalVideoName("");
    setIsSavingModal(false);
    setIsDownloadingModal(false);
    setIsPanelDirty(false);
    resetMergeClipsRef.current?.();
  }, [duration]);

  const switchTab = useCallback(
    (tab: EditTab) => {
      if (tab === activeTab) return;
      const trimChanged =
        trimStart > 0 || (trimEnd > 0 && Math.abs(trimEnd - duration) > 0.1);
      const hasChanges =
        !!resultUrl ||
        trimChanged ||
        mergeClips.length > 0 ||
        !!mergePreviewUrl ||
        !!previewCssFilter ||
        !!previewTextOverlay ||
        !!previewWatermark ||
        previewSpeed !== 1 ||
        isPanelDirty;

      if (hasChanges) {
        setPendingTab(tab);
        setIsTabConfirmOpen(true);
        return;
      }
      resetAllState();
      setActiveTab(tab);
    },
    [activeTab, resultUrl, trimStart, trimEnd, duration, mergeClips, mergePreviewUrl, previewCssFilter, isPanelDirty, resetAllState],
  );

  const confirmTabSwitch = useCallback(() => {
    if (!pendingTab) return;
    resetAllState();
    setActiveTab(pendingTab);
    setPendingTab(null);
    setIsTabConfirmOpen(false);
  }, [pendingTab, resetAllState]);

  const cancelTabSwitch = useCallback(() => {
    setPendingTab(null);
    setIsTabConfirmOpen(false);
  }, []);

  const trimMutation = useTrimVideo();

  const handleSourceSelected = useCallback(
    (src: VideoSource) => {
      setSource(src);
      setResultUrl(null);
      setTrimStart(0);
      setTrimEnd(0);
      setCurrentTime(0);
      // 합치기/효과 탭 제외 스크롤 최상단
      if (activeTab !== "merge" && activeTab !== "effects") {
        scrollRef.current?.scrollTo({ top: 0 });
      }
    },
    [activeTab],
  );

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
      notify(t("trimSuccess"));
    } catch {
      toast.error(t("trimError"));
    }
  }, [source, trimStart, trimEnd, trimMutation, t]);

  const handleTrimReset = useCallback(() => {
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
  const handleModalSave = useCallback(async (isPublic: boolean) => {
    if (!resultUrl) return;
    setIsSavingModal(true);
    try {
      await saveEditMutation.mutateAsync({
        result_url: resultUrl,
        edit_type: activeTab,
        prompt: source?.name || "Saved video",
        is_public: isPublic,
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
    <div className="flex h-[calc(100dvh-64px)] flex-col sm:p-4">
      {/* 탭 전환 + Undo/Redo */}
      <div className="flex shrink-0 items-center gap-1.5 bg-background px-2.5 pt-2 pb-1.5 sm:px-0 sm:pt-0 sm:pb-2">
        <div className="flex gap-0.5">
          <button
            onClick={handleUndo}
            disabled={!canUndo}
            className="flex size-9 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-zinc-200 disabled:opacity-30 dark:text-zinc-400 dark:hover:bg-zinc-800"
            title={`${t("undo")} (Ctrl+Z)`}
          >
            <Undo2 className="size-4" />
          </button>
          <button
            onClick={handleRedo}
            disabled={!canRedo}
            className="flex size-9 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-zinc-200 disabled:opacity-30 dark:text-zinc-400 dark:hover:bg-zinc-800"
            title={`${t("redo")} (Ctrl+Shift+Z)`}
          >
            <Redo2 className="size-4" />
          </button>
          <button
            onClick={handleReset}
            disabled={!canUndo && !canRedo}
            className="flex size-9 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-zinc-200 hover:text-red-500 disabled:opacity-30 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-red-400"
            title={t("resetToOriginal")}
          >
            <RotateCcw className="size-4" />
          </button>
        </div>
        <Select
          value={activeTab}
          onValueChange={(value) => switchTab(value)}
        >
          <SelectTrigger className="h-9 w-full gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 text-sm font-medium dark:border-zinc-700 dark:bg-zinc-900">
            {activeTab === "trim" && <Scissors className="size-4" />}
            {activeTab === "ai" && <Sparkles className="size-4" />}
            {activeTab === "effects" && <Wand2 className="size-4" />}
            {activeTab === "merge" && <Merge className="size-4" />}
            {activeTab === "subtitles" && <MessageCircle className="size-4" />}
            {activeTab === "audio" && <Volume2 className="size-4" />}
            {activeTab === "gif" && <Film className="size-4" />}
            {activeTab === "scene" && <ScanSearch className="size-4" />}
            {activeTab === "thumbnail" && <ImageIcon className="size-4" />}
            {activeTab === "crop" && <Crop className="size-4" />}
            {activeTab === "trim" && t("tabTrim")}
            {activeTab === "ai" && t("tabAI")}
            {activeTab === "effects" && t("tabEffects")}
            {activeTab === "merge" && t("tabMerge")}
            {activeTab === "subtitles" && t("tabSubtitles")}
            {activeTab === "audio" && t("tabAudio")}
            {activeTab === "gif" && t("tabGif")}
            {activeTab === "scene" && t("tabScene")}
            {activeTab === "thumbnail" && t("tabThumbnail")}
            {activeTab === "crop" && t("tabCrop")}
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="trim">
              <span className="flex items-center gap-2"><Scissors className="size-3.5" />{t("tabTrim")}</span>
            </SelectItem>
            <SelectItem value="ai">
              <span className="flex items-center gap-2"><Sparkles className="size-3.5" />{t("tabAI")}</span>
            </SelectItem>
            <SelectItem value="effects">
              <span className="flex items-center gap-2"><Wand2 className="size-3.5" />{t("tabEffects")}</span>
            </SelectItem>
            <SelectItem value="merge">
              <span className="flex items-center gap-2"><Merge className="size-3.5" />{t("tabMerge")}</span>
            </SelectItem>
            <SelectItem value="subtitles">
              <span className="flex items-center gap-2"><MessageCircle className="size-3.5" />{t("tabSubtitles")}</span>
            </SelectItem>
            <SelectItem value="audio">
              <span className="flex items-center gap-2"><Volume2 className="size-3.5" />{t("tabAudio")}</span>
            </SelectItem>
            <SelectItem value="gif">
              <span className="flex items-center gap-2"><Film className="size-3.5" />{t("tabGif")}</span>
            </SelectItem>
            <SelectItem value="scene">
              <span className="flex items-center gap-2"><ScanSearch className="size-3.5" />{t("tabScene")}</span>
            </SelectItem>
            <SelectItem value="thumbnail">
              <span className="flex items-center gap-2"><ImageIcon className="size-3.5" />{t("tabThumbnail")}</span>
            </SelectItem>
            <SelectItem value="crop">
              <span className="flex items-center gap-2"><Crop className="size-3.5" />{t("tabCrop")}</span>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* AI 생성 진행 미니 바 (AI 탭이 아닐 때 표시) */}
      {aiIsGenerating && activeTab !== "ai" && (
        <div
          className="mx-2.5 mb-2 flex cursor-pointer items-center gap-2 rounded-lg bg-primary/10 px-3 py-1.5 transition-colors hover:bg-primary/15 sm:mx-0"
          onClick={() => setActiveTab("ai")}
          role="button"
          tabIndex={0}
        >
          <Loader2 className="size-3.5 animate-spin text-primary" />
          <span className="flex-1 text-xs text-primary">
            {t("aiGenerating")}
            {aiGeneration?.progress != null && ` (${aiGeneration.progress}%)`}
          </span>
          <span className="text-[10px] tabular-nums text-zinc-400">
            {Math.floor(aiElapsed / 60)}:{String(aiElapsed % 60).padStart(2, "0")}
          </span>
          <Sparkles className="size-3 text-primary/60" />
        </div>
      )}

      {/* AI 생성 완료 미니 바 (AI 탭이 아닐 때 표시) */}
      {aiIsCompleted && aiGeneration?.result_url && activeTab !== "ai" && (
        <div
          className="mx-2.5 mb-2 flex cursor-pointer items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-1.5 transition-colors hover:bg-primary/10 sm:mx-0"
          onClick={() => setActiveTab("ai")}
          role="button"
          tabIndex={0}
        >
          <Sparkles className="size-3.5 text-primary" />
          <span className="flex-1 text-xs font-medium text-primary">
            {t("aiGenerateComplete")}
          </span>
          <span className="text-[10px] text-primary/60">{t("tabAI")} →</span>
        </div>
      )}

      {/* 스크롤 영역 */}
      <div ref={scrollRef} className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-2.5 pb-2.5 sm:gap-3 sm:px-0 sm:pb-0">
      {/* 메인: 모바일 세로(영상→옵션) / PC 가로(프리뷰|옵션) */}
      <div className="flex flex-col gap-2 sm:flex-row sm:gap-4">
        {/* 왼쪽(PC) / 위(모바일): 프리뷰 + 타임라인 */}
        <div className="flex flex-col gap-2 sm:w-1/2 sm:shrink-0 sm:gap-3">
          {activeTab === "merge" ? (
            /* 합치기: 결과 또는 클립 목록 */
            <div className="min-h-[200px] w-full overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50 sm:min-h-[280px] dark:border-zinc-800 dark:bg-black">
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
                <div className="flex h-full w-full flex-col border-dashed border-zinc-400 bg-zinc-100/40 dark:border-zinc-700 dark:bg-zinc-900/40">
                  {mergeClips.length === 0 ? (
                    <div className="flex flex-1 flex-col items-center justify-center gap-2 text-zinc-600 dark:text-zinc-600">
                      <Film className="mb-3 size-12" />
                      <p className="text-sm text-zinc-600 dark:text-zinc-500">{t("mergePreviewEmpty")}</p>
                    </div>
                  ) : (
                    <div
                      ref={mergeClipListRef}
                      className="flex w-full flex-col overflow-y-auto p-2 gap-1.5 touch-none"
                      onPointerMove={handleMergePointerMove}
                      onPointerUp={handleMergePointerUp}
                      onPointerCancel={handleMergePointerUp}
                    >
                      {mergeClips.map((clip, idx) => (
                        <div
                          key={clip.id}
                          onPointerDown={(e) =>
                            handleMergePointerDown(e, idx)
                          }
                          className={`flex shrink-0 cursor-grab items-center gap-2 rounded-lg bg-zinc-100/60 px-2 py-1.5 transition-colors hover:bg-zinc-200/60 dark:bg-zinc-900/60 dark:hover:bg-zinc-800/60 ${
                            mergeDragIdx === idx
                              ? "opacity-50"
                              : ""
                          } ${
                            mergeDragOverIdx === idx && mergeDragIdx !== null && mergeDragIdx !== idx
                              ? "ring-1 ring-primary"
                              : ""
                          }`}
                        >
                          <div className="flex shrink-0 flex-col">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                moveMergeClipRef.current?.(idx, -1);
                              }}
                              disabled={idx === 0}
                              className="text-zinc-400 hover:text-zinc-700 disabled:opacity-20 dark:text-zinc-600 dark:hover:text-zinc-300"
                            >
                              <ChevronUp className="size-3" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                moveMergeClipRef.current?.(idx, 1);
                              }}
                              disabled={idx === mergeClips.length - 1}
                              className="text-zinc-400 hover:text-zinc-700 disabled:opacity-20 dark:text-zinc-600 dark:hover:text-zinc-300"
                            >
                              <ChevronDown className="size-3" />
                            </button>
                          </div>
                          <span className="w-4 text-center font-mono text-xs text-zinc-500">
                            {idx + 1}
                          </span>
                          <video
                            src={clip.url}
                            className="h-10 w-16 shrink-0 rounded object-cover"
                            muted
                            preload="metadata"
                          />
                          <span className="min-w-0 flex-1 truncate text-xs text-zinc-700 dark:text-zinc-300">
                            {clip.name ?? `Clip ${idx + 1}`}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeMergeClipRef.current?.(clip.id);
                            }}
                            className="shrink-0 text-zinc-400 hover:text-red-400 dark:text-zinc-600"
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
            <div className="relative">
              {/* 비교 모드 토글 */}
              {resultUrl && source?.url && resultUrl !== source.url && (
                <button
                  onClick={() => setCompareMode((v) => !v)}
                  className={`absolute top-2 right-2 z-10 flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium shadow transition-colors ${
                    compareMode
                      ? "bg-primary text-primary-foreground"
                      : "bg-black/50 text-white hover:bg-black/70"
                  }`}
                >
                  <Columns2 className="size-3.5" />
                  {t("comparePreview")}
                </button>
              )}

              {compareMode && resultUrl && source?.url && resultUrl !== source.url ? (
                <div className="space-y-1.5">
                  <div className="flex aspect-video max-h-[280px] w-full gap-1 overflow-hidden rounded-2xl border border-zinc-300 bg-zinc-50 dark:border-zinc-800 dark:bg-black">
                    {/* 원본 */}
                    <div className="relative flex flex-1 items-center justify-center overflow-hidden">
                      <video
                        ref={originalVideoRef}
                        src={source.url}
                        className="max-h-[280px] max-w-full object-contain"
                        muted
                      />
                      <span className="absolute top-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">
                        {t("original")}
                      </span>
                    </div>
                    {/* 편집본 */}
                    <div className="relative flex flex-1 items-center justify-center overflow-hidden">
                      <video
                        ref={videoRef}
                        src={resultUrl}
                        className="max-h-[280px] max-w-full object-contain"
                        style={activeTab === "effects" && previewCssFilter ? { filter: previewCssFilter } : undefined}
                        muted
                        onTimeUpdate={() => {
                          if (videoRef.current) setCurrentTime(videoRef.current.currentTime);
                        }}
                        onLoadedMetadata={() => {
                          if (videoRef.current) handleDurationLoaded(videoRef.current.duration);
                        }}
                      />
                      <span className="absolute top-1 left-1 rounded bg-primary/80 px-1.5 py-0.5 text-[10px] font-medium text-white">
                        {t("edited")}
                      </span>
                    </div>
                  </div>
                  {/* 동시 재생 버튼 */}
                  <button
                    onClick={handleSyncPlayPause}
                    className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-zinc-200/60 px-3 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-300 dark:bg-zinc-800/60 dark:text-zinc-300 dark:hover:bg-zinc-700"
                  >
                    {syncPlaying ? (
                      <><Pause className="size-3.5" />{t("syncPause")}</>
                    ) : (
                      <><Play className="size-3.5" />{t("syncPlay")}</>
                    )}
                  </button>
                </div>
              ) : (
                <VideoEditPreview
                  videoUrl={displayUrl}
                  currentTime={currentTime}
                  onTimeUpdate={setCurrentTime}
                  onDurationLoaded={handleDurationLoaded}
                  videoRef={videoRef}
                  cssFilter={activeTab === "effects" ? previewCssFilter : undefined}
                  textOverlay={activeTab === "effects" ? previewTextOverlay : undefined}
                  watermark={activeTab === "effects" ? previewWatermark : undefined}
                  subtitles={activeTab === "subtitles" ? previewSubtitles : undefined}
                  playbackRate={activeTab === "effects" ? previewSpeed : 1}
                />
              )}
            </div>
          )}
        </div>

        {/* 오른쪽(PC) / 아래(모바일): 편집 옵션 */}
        <div className="flex min-w-0 flex-1 flex-col gap-2 pr-2 sm:gap-3 sm:pr-3">
          {/* 트리밍 탭 */}
          {source && activeTab === "trim" && duration > 0 && (
            <div className="space-y-2">
              <TrimControls
                trimStart={trimStart}
                trimEnd={trimEnd}
                duration={duration}
                isTrimming={trimMutation.isPending}
                onTrim={handleTrim}
                onReset={handleTrimReset}
              />

              {resultUrl && (
                <div className="space-y-2 rounded-xl bg-primary/10 px-4 py-3">
                  <span className="text-sm font-semibold text-primary">
                    {t("trimComplete")}
                  </span>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700"
                    onClick={() => setIsPublicSave(!isPublicSave)}
                  >
                    {isPublicSave ? <Globe className="size-3.5 text-blue-500" /> : <Lock className="size-3.5 text-zinc-500" />}
                    <span className="text-zinc-700 dark:text-zinc-300">{isPublicSave ? t("public") : t("private")}</span>
                  </button>
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
                            is_public: isPublicSave,
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
          {activeTab === "ai" && (
            <>
              {source && (
                <AIEditPanel
                  sourceUrl={source.url}
                  currentTime={currentTime}
                  videoRef={videoRef}
                  onDirty={() => setIsPanelDirty(true)}
                  aiGenerationId={aiGenerationId}
                  onAiGenerationIdChange={handleAiGenerationIdChange}
                  aiGeneration={aiGeneration}
                  aiIsGenerating={aiIsGenerating}
                  aiIsCompleted={aiIsCompleted}
                  aiIsFailed={aiIsFailed}
                  aiElapsed={aiElapsed}
                />
              )}
              {/* 소스 없어도 생성 상태 표시 */}
              {!source && (aiIsGenerating || aiIsCompleted || aiIsFailed) && (
                <div className="space-y-3">
                  {aiIsGenerating && (
                    <div className="space-y-2 rounded-lg bg-primary/10 px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Loader2 className="size-4 animate-spin text-primary" />
                        <span className="flex-1 text-sm text-primary">
                          {t("aiGenerating")}
                          {aiGeneration?.progress != null && ` (${aiGeneration.progress}%)`}
                        </span>
                        <span className="text-xs tabular-nums text-zinc-400">
                          {Math.floor(aiElapsed / 60)}:{String(aiElapsed % 60).padStart(2, "0")}
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                        {aiGeneration?.progress != null ? (
                          <div
                            className="h-full rounded-full bg-primary transition-all duration-500"
                            style={{ width: `${aiGeneration.progress}%` }}
                          />
                        ) : (
                          <div className="h-full w-1/3 animate-[indeterminate_1.5s_ease-in-out_infinite] rounded-full bg-primary" />
                        )}
                      </div>
                    </div>
                  )}
                  {aiIsCompleted && aiGeneration?.result_url && (
                    <div className="flex items-start gap-3 rounded-lg border border-primary/30 bg-primary/5 p-2">
                      <video
                        src={aiGeneration.result_url}
                        className="h-20 rounded-md"
                        controls
                        muted
                        loop
                      />
                      <div className="flex flex-1 flex-col gap-1.5 py-0.5">
                        <div className="flex items-center gap-1.5">
                          <Sparkles className="size-3 text-primary" />
                          <span className="text-xs font-medium text-primary">
                            {t("aiGenerateComplete")}
                          </span>
                        </div>
                        <button
                          type="button"
                          className="flex w-full items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700"
                          onClick={() => setIsPublicSave(!isPublicSave)}
                        >
                          {isPublicSave ? <Globe className="size-3.5 text-blue-500" /> : <Lock className="size-3.5 text-zinc-500" />}
                          <span className="text-zinc-700 dark:text-zinc-300">{isPublicSave ? t("public") : t("private")}</span>
                        </button>
                        <div className="flex gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 flex-1 gap-1.5 text-xs"
                            onClick={() =>
                              downloadVideo(
                                aiGeneration.result_url!,
                                `ai_edit_${Date.now()}.mp4`,
                              )
                            }
                          >
                            <Download className="size-3" />
                            {t("download")}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 flex-1 gap-1.5 text-xs"
                            disabled={saveEditMutation.isPending}
                            onClick={async () => {
                              try {
                                await saveEditMutation.mutateAsync({
                                  result_url: aiGeneration.result_url!,
                                  edit_type: "ai",
                                  prompt: aiGeneration.prompt || "AI edited video",
                                  is_public: isPublicSave,
                                });
                                toast.success(t("saveSuccess"));
                              } catch {
                                toast.error(t("saveError"));
                              }
                            }}
                          >
                            {saveEditMutation.isPending ? (
                              <Loader2 className="size-3 animate-spin" />
                            ) : (
                              <Save className="size-3" />
                            )}
                            {t("save")}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                  {aiIsFailed && aiGeneration && (
                    <div className="flex items-center gap-3 rounded-lg border border-red-300/40 bg-red-50/20 px-4 py-2 dark:border-red-900/40 dark:bg-red-950/20">
                      <span className="text-sm text-red-600 dark:text-red-400">
                        {t("aiGenerateError")}
                        {aiGeneration.error?.message && `: ${aiGeneration.error.message}`}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* 효과 탭 */}
          {source && activeTab === "effects" && (
            <>
              <EffectsPanel
                sourceUrl={source.url}
                onEffectApplied={setResultUrl}
                onPreviewFilter={setPreviewCssFilter}
                onPreviewTextOverlay={setPreviewTextOverlay}
                onPreviewWatermark={setPreviewWatermark}
                onPreviewSpeed={setPreviewSpeed}
                onDirty={() => setIsPanelDirty(true)}
              />

              {resultUrl && (
                <div className="space-y-2 rounded-xl bg-primary/10 px-4 py-3">
                  <span className="text-sm font-semibold text-primary">
                    {t("effectApplied")}
                  </span>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700"
                    onClick={() => setIsPublicSave(!isPublicSave)}
                  >
                    {isPublicSave ? <Globe className="size-3.5 text-blue-500" /> : <Lock className="size-3.5 text-zinc-500" />}
                    <span className="text-zinc-700 dark:text-zinc-300">{isPublicSave ? t("public") : t("private")}</span>
                  </button>
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
                            is_public: isPublicSave,
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
              onSetClipsRef={(fn) => {
                setMergeClipsInternalRef.current = fn;
              }}
              onClipsChange={(c) => setMergeClips(c)}
            />
          )}

          {/* 자막 탭 */}
          {source && activeTab === "subtitles" && (
            <>
              <SubtitlesPanel
                sourceUrl={source.url}
                duration={duration}
                onSubtitlesApplied={setResultUrl}
                onPreviewSubtitles={setPreviewSubtitles}
                onDirty={() => setIsPanelDirty(true)}
              />
              {resultUrl && (
                <div className="space-y-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3">
                  <span className="text-sm font-semibold text-primary">
                    {t("subtitlesApplied")}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5"
                      onClick={() =>
                        downloadVideo(resultUrl, `subtitles_${Date.now()}.mp4`)
                      }
                    >
                      <Download className="size-3.5" />
                      {t("download")}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5"
                      onClick={async () => {
                        try {
                          await saveEditMutation.mutateAsync({
                            result_url: resultUrl,
                            edit_type: "subtitles",
                            prompt: source?.name || "Subtitles added",
                          });
                          toast.success(t("saveSuccess"));
                        } catch {
                          toast.error(t("saveError"));
                        }
                      }}
                    >
                      <Save className="size-3.5" />
                      {t("save")}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}

          {source && activeTab === "audio" && (
              <AudioPanel
                sourceUrl={source.url}
                onAudioApplied={setResultUrl}
                onSave={async (url, isPublic) => {
                  await saveEditMutation.mutateAsync({
                    result_url: url,
                    edit_type: "audio",
                    prompt: source?.name || "Audio edited",
                    is_public: isPublic,
                  });
                }}
                onDirty={() => setIsPanelDirty(true)}
              />
          )}

          {source && activeTab === "gif" && (
              <GifPanel
                sourceUrl={source.url}
                onDirty={() => setIsPanelDirty(true)}
              />
          )}

          {source && activeTab === "scene" && (
              <SceneSplitPanel
                sourceUrl={source.url}
                duration={source.duration ?? duration}
                onSceneExtracted={(url) => {
                  setSource({ ...source, url });
                }}
              />
          )}

          {source && activeTab === "thumbnail" && (
              <ThumbnailPanel
                sourceUrl={source.url}
                onSave={async (url, isPublic) => {
                  await saveEditMutation.mutateAsync({
                    result_url: url,
                    edit_type: "thumbnail",
                    prompt: source?.name || "Thumbnail",
                    is_public: isPublic,
                  });
                }}
              />
          )}

          {source && activeTab === "crop" && (
              <CropPanel
                sourceUrl={source.url}
                videoWidth={source.width || 1280}
                videoHeight={source.height || 720}
                onCropApplied={setResultUrl}
                onSave={async (url, isPublic) => {
                  await saveEditMutation.mutateAsync({
                    result_url: url,
                    edit_type: "crop",
                    prompt: source?.name || "Cropped",
                    is_public: isPublic,
                  });
                }}
                onDirty={() => setIsPanelDirty(true)}
              />
          )}
        </div>
      </div>

      {/* 타임라인 (트림 탭, 소스 있고 결과 없을 때만) — 전체 너비 */}
      {activeTab === "trim" && source && duration > 0 && !resultUrl && (
        <div className="px-2 sm:px-4">
        <VideoTimeline
          duration={duration}
          currentTime={currentTime}
          trimStart={trimStart}
          trimEnd={trimEnd}
          onTrimStartChange={setTrimStart}
          onTrimEndChange={setTrimEnd}
          onSeek={handleSeek}
        />
        </div>
      )}

      {/* 소스 선택 */}
      <VideoSourceSelector
        onSourceSelected={handleSourceSelected}
        isLoading={false}
        mergeMode={activeTab === "merge"}
        onAddToMerge={(url, name) => addMergeClipRef.current?.(url, name)}
        onSelectVideo={resultUrl ? openModal : undefined}
      />
      </div>{/* 스크롤 영역 끝 */}

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

      {/* 탭 전환 확인 모달 */}
      {isTabConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/60">
          <div className="mx-4 w-full max-w-sm space-y-4 rounded-2xl border border-zinc-300 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-900">
            <h3 className="text-base font-semibold text-foreground">
              {t("tabSwitchConfirmTitle")}
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              {t("tabSwitchConfirmMessage")}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={cancelTabSwitch}
              >
                {t("tabSwitchCancel")}
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={confirmTabSwitch}
              >
                {t("tabSwitchConfirm")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
