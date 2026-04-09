"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useSearchParams } from "next/navigation";
import { Download, Globe, Lock, Loader2, Merge, MessageCircle, Save, ScanSearch, Scissors, Sparkle, Sparkles, Volume2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { ChevronDown, ChevronUp, Clapperboard, Columns2, Copy, Crop, Film, Gauge, ImageIcon, Layers, Maximize2, Palette, Pause, Play, Plus, RectangleHorizontal, Redo2, RotateCcw, RotateCw, SlidersHorizontal, Smile, Stamp, Sun, Timer, Trash2, Type, Undo2, Upload, Wand2, X } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { useTrimVideo, useSaveEdit, useUploadVideo } from "@/hooks/queries/useVideoEdit";
import { useGeneration } from "@/hooks/queries/useGeneration";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/hooks/queries/keys";

import { VideoEditPreview } from "../VideoEditPreview";
import { VideoTimeline } from "../VideoTimeline";
import { HistorySelectModal } from "../HistorySelectModal";
import { TrimControls } from "../TrimControls";
import { AIEditPanel } from "../AIEditPanel";
import type { AIEditPanelRef } from "../AIEditPanel/types";
import { MergePanel } from "../MergePanel";
import type { MergePanelRef } from "../MergePanel/types";
import { EffectsPanel } from "../EffectsPanel";
import type { EffectsPanelRef } from "../EffectsPanel/types";
import { FilterPanel } from "../FilterPanel";
import type { FilterPanelRef } from "../FilterPanel/types";
import type { CreativePresetPanelRef } from "../CreativePresetPanel/types";
import { SubtitlesPanel } from "../SubtitlesPanel";
import type { SubtitlesPanelRef } from "../SubtitlesPanel/types";
import { TextOverlayPanel } from "../TextOverlayPanel";
import type { TextOverlayPanelRef } from "../TextOverlayPanel/types";
import { WatermarkPanel } from "../WatermarkPanel";
import type { WatermarkPanelRef } from "../WatermarkPanel/types";
import { AudioPanel } from "../AudioPanel";
import { GifPanel } from "../GifPanel";
import type { GifPanelRef } from "../GifPanel/types";
import { SceneSplitPanel } from "../SceneSplitPanel";
import { ThumbnailPanel } from "../ThumbnailPanel";
import { CropPanel } from "../CropPanel";
import type { CropPanelRef } from "../CropPanel/types";
import { RatioPanel } from "../RatioPanel";
import type { RatioPanelRef } from "../RatioPanel/types";
import { RotatePanel } from "../RotatePanel";
import type { RotatePanelRef } from "../RotatePanel/types";
import { CreativePresetPanel } from "../CreativePresetPanel";
import { VideoSourceSelectModal } from "../VideoSourceSelectModal";
import { VideoSourceSelector } from "../VideoSourceSelector";
import type { MergeClip } from "../MergePanel/types";
import { downloadVideo } from "../utils";
import { useVideoEditStore } from "@/stores/videoEditStore";
import { useNotifyOnComplete } from "@/hooks/useNotifyOnComplete";
import type { VideoSource } from "./types";

type MainTab = "edit" | "filter" | "overlay" | "ai";
type SubTool = "trim" | "crop" | "ratio" | "merge" | "speed" | "reverse" | "rotate" | "resolution" | "fps" | "filter" | "creative" | "subtitles" | "text" | "watermark" | "audio" | "gif" | "scene" | "thumbnail" | "color" | "cinematic" | "vintage" | "mood" | "fun" | null;
type EditTab = "trim" | "ai" | "effects" | "filter" | "merge" | "subtitles" | "audio" | "gif" | "thumbnail" | "crop" | "ratio" | "rotate" | "scene" | "preset" | "creative" | "text" | "watermark";

export function VideoEditWorkspace() {
  const t = useTranslations("VideoEdit");
  const notify = useNotifyOnComplete();
  const queryClient = useQueryClient();
  const videoRef = useRef<HTMLVideoElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadMutation = useUploadVideo();
  const cropPanelRef = useRef<CropPanelRef>(null);
  const [cropState, setCropState] = useState({ isOriginal: true, isPending: false });
  const rotatePanelRef = useRef<RotatePanelRef>(null);
  const [rotateState, setRotateState] = useState({ hasSelection: false, isPending: false });
  const ratioPanelRef = useRef<RatioPanelRef>(null);
  const [ratioState, setRatioState] = useState({ canApply: false, isPending: false });
  const effectsPanelRef = useRef<EffectsPanelRef>(null);
  const [effectsState, setEffectsState] = useState({ canApply: false, isPending: false });
  const mergePanelRef = useRef<MergePanelRef>(null);
  const [mergeState, setMergeState] = useState({ canApply: false, isPending: false });
  const filterPanelRef = useRef<FilterPanelRef>(null);
  const [filterState, setFilterState] = useState({ canApply: false, isPending: false });
  const creativePanelRef = useRef<CreativePresetPanelRef>(null);
  const [creativeState, setCreativeState] = useState({ canApply: false, isPending: false });
  const subtitlesPanelRef = useRef<SubtitlesPanelRef>(null);
  const [subtitlesState, setSubtitlesState] = useState({ canApply: false, isPending: false });
  const textOverlayPanelRef = useRef<TextOverlayPanelRef>(null);
  const [textOverlayState, setTextOverlayState] = useState({ canApply: false, isPending: false });
  const watermarkPanelRef = useRef<WatermarkPanelRef>(null);
  const [watermarkState, setWatermarkState] = useState({ canApply: false, isPending: false });
  const gifPanelRef = useRef<GifPanelRef>(null);
  const [gifState, setGifState] = useState({ canApply: false, isPending: false });
  const aiEditPanelRef = useRef<AIEditPanelRef>(null);
  const [aiEditState, setAiEditState] = useState({ canApply: false, isPending: false });
  const searchParams = useSearchParams();

  // 탭 (URL ?tab= 파라미터로 초기값 설정)
  const [activeTab, setActiveTab] = useState<EditTab>(() => {
    const tab = searchParams.get("tab");
    if (tab === "ai" || tab === "trim" || tab === "effects" || tab === "merge" || tab === "subtitles") return tab;
    return "trim";
  });

  // 4탭 구조
  const [mainTab, setMainTab] = useState<MainTab>("edit");
  const [subTool, setSubTool] = useState<SubTool>(null);

  // mainTab 변경 시 subTool 초기화 + activeTab 매핑
  const handleMainTabChange = useCallback((tab: MainTab) => {
    setMainTab(tab);
    setSubTool(null);
    if (tab === "ai") setActiveTab("ai");
    else if (tab === "filter") setActiveTab("filter");
    else setActiveTab("trim");
  }, []);

  // subTool 변경 시 activeTab 매핑
  const handleSubToolChange = useCallback((tool: SubTool) => {
    setSubTool(tool);
    if (tool === null) setActiveTab("trim");
    else if (tool === "trim") setActiveTab("trim");
    else if (tool === "crop") setActiveTab("crop");
    else if (tool === "ratio") setActiveTab("ratio");
    else if (tool === "merge") setActiveTab("merge");
    else if (tool === "rotate") setActiveTab("rotate");
    else if (tool === "speed" || tool === "reverse" || tool === "resolution" || tool === "fps") setActiveTab("effects");
    else if (tool === "text") setActiveTab("text");
    else if (tool === "watermark") setActiveTab("watermark");
    else if (tool === "filter") setActiveTab("filter");
    else if (tool === "creative") setActiveTab("creative");
    else if (tool === "subtitles") setActiveTab("subtitles");
    else if (tool === "audio") setActiveTab("audio");
    else if (tool === "gif") setActiveTab("gif");
    else if (tool === "scene") setActiveTab("scene");
    else if (tool === "thumbnail") setActiveTab("thumbnail");
  }, []);

  // 탭 전환 확인 모달
  const [pendingTab, setPendingTab] = useState<EditTab | null>(null);
  const [isTabConfirmOpen, setIsTabConfirmOpen] = useState(false);

  // 소스 상태
  const [source, setSource] = useState<VideoSource | null>(null);

  // 합치기 탭 진입 시 현재 영상을 클립 1에 자동 추가
  const mergeAutoAddedRef = useRef(false);
  useEffect(() => {
    if (activeTab === "merge" && source && !mergeAutoAddedRef.current) {
      mergeAutoAddedRef.current = true;
      // MergePanel 마운트 후 실행되도록 충분한 딜레이
      const timer = setTimeout(() => {
        addMergeClipRef.current?.(source.url, source.name || "Current video");
      }, 100);
      return () => clearTimeout(timer);
    }
    if (activeTab !== "merge") {
      mergeAutoAddedRef.current = false;
    }
  }, [activeTab, source]);

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
  const [compareModal, setCompareModal] = useState(false);
  const originalVideoRef = useRef<HTMLVideoElement | null>(null);
  const modalOrigRef = useRef<HTMLVideoElement | null>(null);
  const modalEditRef = useRef<HTMLVideoElement | null>(null);
  const [modalSyncPlaying, setModalSyncPlaying] = useState(false);

  // ESC로 비교 모달 닫기
  useEffect(() => {
    if (!compareModal) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setCompareModal(false);
        setModalSyncPlaying(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [compareModal]);
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
  const [previewCreativeOverlay, setPreviewCreativeOverlay] = useState<React.ReactNode>(null);

  // 썸네일 캡처 이미지 (프리뷰 옆 표시용)
  const [capturedThumbnails, setCapturedThumbnails] = useState<string[]>([]);
  const [previewSpeed, setPreviewSpeed] = useState(1);

  // 합치기
  const addMergeClipRef = useRef<((url: string, name?: string) => void) | null>(null);
  const removeMergeClipRef = useRef<((id: string) => void) | null>(null);
  const moveMergeClipRef = useRef<((idx: number, direction: -1 | 1) => void) | null>(null);
  const resetMergeClipsRef = useRef<(() => void) | null>(null);
  const setMergeClipsInternalRef = useRef<React.Dispatch<React.SetStateAction<MergeClip[]>> | null>(null);
  const [mergePreviewUrl, setMergePreviewUrl] = useState<string | null>(null);
  const [mergeClips, setMergeClips] = useState<MergeClip[]>([]);

  // 히스토리 모달
  const [isHistoryModalOpen, setHistoryModalOpen] = useState(false);

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
        // AI 편집 완료 시 자동 DB 저장
        if (aiGeneration.result_url) {
          saveEditMutation.mutate({
            result_url: aiGeneration.result_url,
            edit_type: "ai_edit",
            prompt: aiGeneration.prompt || "AI Edit",
            is_public: false,
          });
        }
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

  // 하단 스트립 메뉴
  const [stripMenuOpen, setStripMenuOpen] = useState(false);
  const [stripMenuPos, setStripMenuPos] = useState({ top: 0, left: 0 });
  const stripMenuBtnRef = useRef<HTMLButtonElement>(null);
  const stripMenuRef = useRef<HTMLDivElement>(null);
  const stripFileInputRef = useRef<HTMLInputElement>(null);

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
      const x = e.clientX;
      for (let i = 0; i < items.length; i++) {
        const rect = items[i].getBoundingClientRect();
        if (x >= rect.left && x <= rect.right) {
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

  // 하단 스트립 메뉴 열기
  const openStripMenu = useCallback(() => {
    const rect = stripMenuBtnRef.current?.getBoundingClientRect();
    if (rect) {
      const menuW = 200;
      const menuH = 96;
      const top = rect.top - menuH - 4;
      const left = Math.min(Math.max(16, rect.left + rect.width / 2 - menuW / 2), window.innerWidth - menuW - 16);
      setStripMenuPos({ top, left });
    }
    setStripMenuOpen(true);
  }, []);

  // 하단 스트립 메뉴 외부 클릭 닫기
  useEffect(() => {
    if (!stripMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        stripMenuRef.current && !stripMenuRef.current.contains(e.target as Node) &&
        stripMenuBtnRef.current && !stripMenuBtnRef.current.contains(e.target as Node)
      ) {
        setStripMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [stripMenuOpen]);

  // 하단 스트립 파일 업로드
  const handleStripFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const url = URL.createObjectURL(file);
      addMergeClipRef.current?.(url, file.name);
      setStripMenuOpen(false);
      e.target.value = "";
    },
    [],
  );

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

  const handleFileUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      e.target.value = "";
      try {
        const result = await uploadMutation.mutateAsync(file);
        if (activeTab === "merge") {
          addMergeClipRef.current?.(result.url, file.name);
        } else {
          handleSourceSelected({
            url: result.url,
            duration: result.duration,
            width: result.width,
            height: result.height,
            name: file.name,
          });
        }
      } catch {
        toast.error(t("uploadError"));
      }
    },
    [uploadMutation, activeTab, handleSourceSelected, t],
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

  const displayUrl = (activeTab === "merge" && mergePreviewUrl) ? mergePreviewUrl : (resultUrl ?? source?.url ?? null);

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

  const MAIN_TABS: { id: MainTab; icon: typeof Scissors; labelKey: string }[] = [
    { id: "edit", icon: Scissors, labelKey: "tabEdit" },
    { id: "filter", icon: SlidersHorizontal, labelKey: "tabFilter" },
    { id: "overlay", icon: Layers, labelKey: "tabOverlay" },
    { id: "ai", icon: Sparkle, labelKey: "tabAI" },
  ];

  const EDIT_TOOLS: { id: SubTool; icon: typeof Scissors; labelKey: string }[] = [
    { id: "trim", icon: Scissors, labelKey: "tabTrim" },
    { id: "crop", icon: Crop, labelKey: "tabCrop" },
    { id: "ratio", icon: RectangleHorizontal, labelKey: "tabRatio" },
    { id: "merge", icon: Merge, labelKey: "tabMerge" },
    { id: "rotate", icon: RotateCw, labelKey: "toolRotate" },
    { id: "speed", icon: Gauge, labelKey: "toolSpeed" },
    { id: "resolution", icon: Maximize2, labelKey: "toolOutput" },
    { id: "audio", icon: Volume2, labelKey: "tabAudio" },
  ];

  const OVERLAY_TOOLS: { id: SubTool; icon: typeof Scissors; labelKey: string }[] = [
    { id: "subtitles", icon: MessageCircle, labelKey: "tabSubtitles" },
    { id: "text", icon: Type, labelKey: "toolText" },
    { id: "watermark", icon: Stamp, labelKey: "toolWatermark" },
    { id: "gif", icon: Film, labelKey: "tabGif" },
    { id: "scene", icon: ScanSearch, labelKey: "tabScene" },
    { id: "thumbnail", icon: ImageIcon, labelKey: "tabThumbnail" },
  ];

  const FILTER_TOOLS: { id: SubTool; icon: typeof Scissors; labelKey: string }[] = [
    { id: "color", icon: Sun, labelKey: "categoryColor" },
    { id: "cinematic", icon: Clapperboard, labelKey: "categoryCinematic" },
    { id: "vintage", icon: Timer, labelKey: "categoryVintage" },
    { id: "mood", icon: Palette, labelKey: "categoryMood" },
    { id: "fun", icon: Smile, labelKey: "categoryFun" },
    { id: "creative", icon: Sparkles, labelKey: "tabCreative" },
  ];

  return (
    <div className="relative">
      <div className="mx-auto flex max-w-7xl flex-col px-4 pt-5 sm:pt-6 md:px-6">
        <div className="flex min-h-0 flex-col gap-4 sm:flex-row sm:gap-6">
          {/* 좌측: 프리뷰 */}
          <div className="flex flex-1 flex-col">
            <div className="relative">
              {/* 비교 모드 토글 */}
              {resultUrl && source?.url && resultUrl !== source.url && (
                <div className="absolute top-2 right-2 z-10 flex gap-1">
                  <button
                    onClick={() => setCompareMode((v) => !v)}
                    className={`flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium shadow transition-colors ${
                      compareMode
                        ? "bg-primary text-primary-foreground"
                        : "bg-black/50 text-white hover:bg-black/70"
                    }`}
                  >
                    <Columns2 className="size-3.5" />
                    {t("comparePreview")}
                  </button>
                  {compareMode && (
                    <button
                      onClick={() => setCompareModal(true)}
                      className="flex items-center gap-1 rounded-md bg-black/50 px-2 py-1 text-[11px] font-medium text-white shadow transition-colors hover:bg-black/70"
                    >
                      <Maximize2 className="size-3.5" />
                    </button>
                  )}
                </div>
              )}

              {compareMode && resultUrl && source?.url && resultUrl !== source.url ? (
                <div className="space-y-1.5">
                  <div className="flex aspect-video max-h-[280px] w-full gap-1 overflow-hidden rounded-2xl border border-neutral-300 bg-neutral-50 dark:border-neutral-800 dark:bg-black">
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
                        style={(activeTab === "effects" || activeTab === "filter") && previewCssFilter ? { filter: previewCssFilter } : undefined}
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
                    className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-neutral-200/60 px-3 py-1.5 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-300 dark:bg-neutral-800/60 dark:text-neutral-300 dark:hover:bg-neutral-700"
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
                  cssFilter={(activeTab === "effects" || mainTab === "filter") ? previewCssFilter : undefined}
                  textOverlay={activeTab === "effects" ? previewTextOverlay : undefined}
                  watermark={activeTab === "effects" ? previewWatermark : undefined}
                  subtitles={activeTab === "subtitles" ? previewSubtitles : undefined}
                  playbackRate={activeTab === "effects" ? previewSpeed : 1}
                  creativeOverlay={activeTab === "creative" ? previewCreativeOverlay : undefined}
                  sourceAspectRatio={source?.aspectRatio}
                  onClickEmpty={() => setHistoryModalOpen(true)}
                  onUpload={() => fileInputRef.current?.click()}
                  onFileDrop={(file) => {
                    const url = URL.createObjectURL(file);
                    handleSourceSelected({
                      url,
                      duration: 0,
                      width: 0,
                      height: 0,
                      name: file.name,
                    });
                  }}
                  onDownload={() => {
                    if (source?.url) downloadVideo(source.url, `video_${Date.now()}.mp4`);
                  }}
                  onRemove={() => {
                    setSource(null);
                    setResultUrl(null);
                    setCurrentTime(0);
                    setDuration(0);
                  }}
                />
              )}
            </div>


          {/* 모바일 편집 도구 버튼 */}
          {source && (
            <button
              onClick={() => toast(t("mobileEditSoon"))}
              className="mt-3 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-foreground py-3 text-[14px] font-[600] text-background transition-colors hover:opacity-90 sm:hidden"
            >
              <Scissors className="size-4" />
              {t("tabEdit")}
            </button>
          )}

          <input ref={fileInputRef} type="file" accept="video/*" className="hidden" onChange={handleFileUpload} />

          {/* 서브 패널: 트림 컨트롤 + 타임라인 (캔버스 아래) */}
          {subTool === "trim" && source && duration > 0 && !resultUrl && (
            <div className="mt-3 overflow-hidden rounded-2xl border-2 border-neutral-200 bg-white px-5 py-4 dark:border-neutral-800/80 dark:bg-neutral-950/85">
              <TrimControls
                trimStart={trimStart}
                trimEnd={trimEnd}
                duration={duration}
                isTrimming={trimMutation.isPending}
                onTrim={handleTrim}
                onReset={handleTrimReset}
              />
              <div className="mt-4 border-t border-neutral-200 pt-4 dark:border-neutral-700/60">
                <VideoTimeline
                  duration={duration}
                  currentTime={currentTime}
                  trimStart={trimStart}
                  trimEnd={trimEnd}
                  isTrimming={trimMutation.isPending}
                  onTrimStartChange={setTrimStart}
                  onTrimEndChange={setTrimEnd}
                  onSeek={handleSeek}
                />
              </div>
            </div>
          )}

          {/* 서브 패널: 합치기 클립 스트립 (캔버스 아래) */}
          {activeTab === "merge" && source && (
            <div className="mt-3 rounded-2xl border-2 border-neutral-200 bg-white px-4 py-4 dark:border-neutral-800/80 dark:bg-neutral-950/85">
              <div className="mb-2.5 flex items-center justify-between">
                <p className="text-[13px] font-[600] text-foreground">
                  {t("clipCount")}
                </p>
                <span className="text-[12px] tabular-nums text-muted-foreground/50">
                  {mergeClips.length} / 5
                </span>
              </div>
              <div
                ref={mergeClipListRef}
                className="flex items-center gap-3 overflow-x-auto pb-1 scrollbar-none touch-none"
                onPointerMove={handleMergePointerMove}
                onPointerUp={handleMergePointerUp}
                onPointerCancel={handleMergePointerUp}
              >
                {mergeClips.map((clip, idx) => {
                  const isDragging = mergeDragIdx === idx;
                  const isOver = mergeDragOverIdx === idx && mergeDragIdx !== null && mergeDragIdx !== idx;
                  const showLeftBar = isOver && mergeDragIdx !== null && mergeDragIdx > idx;
                  const showRightBar = isOver && mergeDragIdx !== null && mergeDragIdx < idx;
                  return (
                    <div
                      key={clip.id}
                      onPointerDown={(e) => handleMergePointerDown(e, idx)}
                      onClick={() => setMergePreviewUrl(clip.url)}
                      className={`group relative flex shrink-0 cursor-grab items-center gap-1 transition-all duration-150 ${
                        isDragging ? "scale-[0.90] opacity-40" : ""
                      }`}
                    >
                      {/* 왼쪽 삽입 인디케이터 */}
                      <div className={`absolute -left-2 top-0 h-full w-[3px] rounded-full bg-primary transition-opacity duration-150 ${showLeftBar ? "opacity-100" : "opacity-0"}`} />
                      <div className={`relative overflow-hidden rounded-xl border-[3px] transition-all ${mergePreviewUrl === clip.url ? "border-white" : "border-transparent"}`}>
                        <video
                          src={clip.url}
                          className="size-28 object-cover"
                          muted
                          preload="metadata"
                        />
                        {/* 호버 오버레이 */}
                        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
                        <span className="pointer-events-none absolute top-1.5 left-1.5 max-w-[calc(100%-32px)] truncate text-[10px] font-[500] leading-tight text-white/90 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                          {clip.name ?? `Clip ${idx + 1}`}
                        </span>
                        {mergeClips.length > 1 && <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (mergePreviewUrl === clip.url) {
                              const next = mergeClips[idx + 1] ?? mergeClips[idx - 1];
                              setMergePreviewUrl(next?.url ?? null);
                            }
                            removeMergeClipRef.current?.(clip.id);
                          }}
                          className="absolute top-1 right-1 z-10 flex size-4 cursor-pointer items-center justify-center rounded-full bg-black/50 text-white/80 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-black/70"
                        >
                          <X className="size-2.5" />
                        </button>}
                      </div>
                      {/* 오른쪽 삽입 인디케이터 */}
                      <div className={`absolute -right-2 top-0 h-full w-[3px] rounded-full bg-primary transition-opacity duration-150 ${showRightBar ? "opacity-100" : "opacity-0"}`} />
                    </div>
                  );
                })}
                {/* 추가 버튼 — 5개 미만일 때 표시 */}
                {mergeClips.length < 5 && <button
                  ref={stripMenuBtnRef}
                  onClick={() => stripMenuOpen ? setStripMenuOpen(false) : openStripMenu()}
                  className="flex size-28 shrink-0 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-neutral-300 bg-neutral-50 text-muted-foreground transition-colors hover:border-neutral-400 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-900/50 dark:hover:border-neutral-500 dark:hover:bg-white/5"
                >
                  <Plus className="size-5 opacity-40" />
                  <span className="text-[13px] font-[500]">{t("addClip")}</span>
                </button>}
              </div>

              {/* 스트립 메뉴 팝오버 */}
              {stripMenuOpen && createPortal(
                <div
                  ref={stripMenuRef}
                  className="fixed z-[100] w-[200px] rounded-xl border border-border/50 bg-popover p-2 shadow-lg"
                  style={{ top: stripMenuPos.top, left: stripMenuPos.left }}
                >
                  <div className="flex flex-col gap-0.5">
                    {source?.url && mergeClips.length < 5 && !mergeClips.some((c) => c.url === source.url) && (
                      <button
                        onClick={() => { addMergeClipRef.current?.(source.url, source.name || "Current video"); setStripMenuOpen(false); }}
                        className="flex h-9 w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 text-[13px] font-[500] text-foreground transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800"
                      >
                        <Copy className="size-4 opacity-35" />
                        {t("mergeUseCurrentVideo")}
                      </button>
                    )}
                    <button
                      onClick={() => { setStripMenuOpen(false); setHistoryModalOpen(true); }}
                      className="flex h-9 w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 text-[13px] font-[500] text-foreground transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800"
                    >
                      <Film className="size-4 opacity-35" />
                      {t("mergeFromHistory")}
                    </button>
                    <button
                      onClick={() => stripFileInputRef.current?.click()}
                      className="flex h-9 w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 text-[13px] font-[500] text-foreground transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800"
                    >
                      <Upload className="size-4 opacity-35" />
                      {t("mergeUploadVideo")}
                    </button>
                    <input
                      ref={stripFileInputRef}
                      type="file"
                      accept="video/*"
                      className="hidden"
                      onChange={handleStripFileChange}
                    />
                  </div>
                </div>,
                document.body,
              )}
            </div>
          )}
          </div>

          {/* 우측 패널 — 데스크톱 고정 (소스 있을 때만) */}
          {source && <div className="hidden sm:block sm:w-[360px] sm:shrink-0">
            <div className="fixed top-[88px] right-[max(16px,calc((100vw-1280px)/2+24px))] flex h-[calc(100vh-104px)] w-[360px] flex-col overflow-hidden rounded-2xl border-2 border-neutral-200 bg-white shadow-lg dark:border-neutral-800/80 dark:bg-neutral-950/85 dark:backdrop-blur-xl">
              {/* 4탭 세그먼트 — 상단 고정 */}
              <div className="shrink-0 px-5 pt-5 pb-4">
                <div className="relative flex flex-1 rounded-lg bg-neutral-100 p-1.5 dark:bg-neutral-800/60">
                  {MAIN_TABS.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = mainTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => handleMainTabChange(tab.id)}
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

              {/* 스크롤 영역 — 서브도구 + Undo/Redo + 패널 콘텐츠 */}
              <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto scrollbar-none px-5 pb-5">
                {/* 서브 도구 그리드 — 편집/필터/오버레이 탭 */}
                {(mainTab === "edit" || mainTab === "filter" || mainTab === "overlay") && (
                  <div className="grid grid-cols-4 gap-2">
                    {(mainTab === "edit" ? EDIT_TOOLS : mainTab === "filter" ? FILTER_TOOLS : OVERLAY_TOOLS).map((tool) => {
                      const Icon = tool.icon;
                      const isActive = subTool === tool.id;
                      return (
                        <button
                          key={tool.id}
                          onClick={() => handleSubToolChange(subTool === tool.id ? null : tool.id)}
                          className={`flex cursor-pointer flex-col items-center gap-2 rounded-xl py-3.5 text-[12px] font-[500] transition-all active:opacity-80 ${
                            isActive
                              ? "bg-foreground text-background"
                              : "bg-neutral-50 text-muted-foreground hover:bg-neutral-100 hover:text-foreground dark:bg-neutral-800/60 dark:hover:bg-neutral-800 dark:hover:text-white"
                          }`}
                        >
                          <Icon className="size-5" strokeWidth={1.5} />
                          {t(tool.labelKey)}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Undo/Redo — 서브도구 선택 시만 */}
                {subTool && mainTab !== "filter" && mainTab !== "overlay" && (
                <div className="mt-4 flex justify-center">
                  <div className="flex items-center gap-0.5 rounded-full bg-neutral-100 px-1.5 py-1.5 dark:bg-neutral-800/60">
                    <button
                      onClick={handleUndo}
                      disabled={!canUndo}
                      className="flex size-9 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-neutral-200 hover:text-foreground disabled:pointer-events-none disabled:opacity-30 dark:hover:bg-neutral-700"
                      title={`${t("undo")} (Ctrl+Z)`}
                    >
                      <Undo2 className="size-[18px]" />
                    </button>
                    <button
                      onClick={handleRedo}
                      disabled={!canRedo}
                      className="flex size-9 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-neutral-200 hover:text-foreground disabled:pointer-events-none disabled:opacity-30 dark:hover:bg-neutral-700"
                      title={`${t("redo")} (Ctrl+Shift+Z)`}
                    >
                      <Redo2 className="size-[18px]" />
                    </button>
                  </div>
                </div>
                )}

                {/* 디바이더 — 서브도구 선택 시 (트리밍, 합치기 제외) */}
                {subTool && subTool !== "trim" && activeTab !== "merge" && <div className="my-4 border-t border-neutral-200 dark:border-neutral-800" />}

              {/* AI 생성 미니 바 */}
              {aiIsGenerating && activeTab !== "ai" && (
                <div
                  className="mb-3 flex cursor-pointer items-center gap-2 rounded-lg bg-primary/10 px-3 py-1.5 transition-colors hover:bg-primary/15"
                  onClick={() => handleMainTabChange("ai")}
                  role="button"
                  tabIndex={0}
                >
                  <Loader2 className="size-3.5 animate-spin text-primary" />
                  <span className="flex-1 text-xs text-primary">
                    {t("aiGenerating")}
                    {aiGeneration?.progress != null && ` (${aiGeneration.progress}%)`}
                  </span>
                  <span className="text-[10px] tabular-nums text-neutral-400">
                    {Math.floor(aiElapsed / 60)}:{String(aiElapsed % 60).padStart(2, "0")}
                  </span>
                </div>
              )}
              {aiIsCompleted && aiGeneration?.result_url && activeTab !== "ai" && (
                <div
                  className="mb-3 flex cursor-pointer items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-1.5 transition-colors hover:bg-primary/10"
                  onClick={() => handleMainTabChange("ai")}
                  role="button"
                  tabIndex={0}
                >
                  <Sparkles className="size-3.5 text-primary" />
                  <span className="flex-1 text-xs font-medium text-primary">
                    {t("aiGenerateComplete")}
                  </span>
                </div>
              )}

                <div className="flex flex-col gap-3">


          {/* 트리밍 — 결과만 패널에 표시 */}
          {source && subTool === "trim" && duration > 0 && (
            <div className="space-y-2">

              {resultUrl && (
                <div className="space-y-2 rounded-xl bg-primary/10 px-4 py-3">
                  <span className="text-sm font-semibold text-primary">
                    {t("trimComplete")}
                  </span>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:hover:bg-neutral-700"
                    onClick={() => setIsPublicSave(!isPublicSave)}
                  >
                    {isPublicSave ? <Globe className="size-3.5 text-blue-500" /> : <Lock className="size-3.5 text-neutral-500" />}
                    <span className="text-neutral-700 dark:text-neutral-300">{isPublicSave ? t("public") : t("private")}</span>
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
                  ref={aiEditPanelRef}
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
                  onStateChange={setAiEditState}
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
                        <span className="text-xs tabular-nums text-neutral-400">
                          {Math.floor(aiElapsed / 60)}:{String(aiElapsed % 60).padStart(2, "0")}
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
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
                    <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2">
                      <Sparkles className="size-3.5 text-primary" />
                      <span className="flex-1 text-xs font-medium text-primary">
                        {t("aiGenerateComplete")}
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 gap-1.5 text-xs"
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
                ref={effectsPanelRef}
                sourceUrl={source.url}
                onEffectApplied={setResultUrl}
                onPreviewSpeed={setPreviewSpeed}
                onDirty={() => setIsPanelDirty(true)}
                onStateChange={setEffectsState}
                category={subTool === "speed" ? "speed" : "output"}
              />

              {resultUrl && (
                <div className="space-y-2 rounded-xl bg-primary/10 px-4 py-3">
                  <span className="text-sm font-semibold text-primary">
                    {t("effectApplied")}
                  </span>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:hover:bg-neutral-700"
                    onClick={() => setIsPublicSave(!isPublicSave)}
                  >
                    {isPublicSave ? <Globe className="size-3.5 text-blue-500" /> : <Lock className="size-3.5 text-neutral-500" />}
                    <span className="text-neutral-700 dark:text-neutral-300">{isPublicSave ? t("public") : t("private")}</span>
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

          {source && mainTab === "filter" && subTool && subTool !== "creative" && (
              <FilterPanel
                ref={filterPanelRef}
                sourceUrl={source.url}
                onEffectApplied={setResultUrl}
                onPreviewFilter={setPreviewCssFilter}
                onDirty={() => setIsPanelDirty(true)}
                category={subTool as "color" | "cinematic" | "vintage" | "mood" | "fun"}
                onStateChange={setFilterState}
              />
          )}

          {/* 합치기 탭 */}
          {activeTab === "merge" && (
            <MergePanel
              ref={mergePanelRef}
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
              onStateChange={setMergeState}
              sourceUrl={source?.url ?? null}
              sourceName={source?.name}
            />
          )}

          {/* 자막 탭 */}
          {source && activeTab === "subtitles" && (
            <>
              <SubtitlesPanel
                ref={subtitlesPanelRef}
                sourceUrl={source.url}
                duration={duration}
                onSubtitlesApplied={setResultUrl}
                onPreviewSubtitles={setPreviewSubtitles}
                onDirty={() => setIsPanelDirty(true)}
                onStateChange={setSubtitlesState}
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
                ref={gifPanelRef}
                sourceUrl={source.url}
                onDirty={() => setIsPanelDirty(true)}
                onStateChange={setGifState}
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
                onThumbnailsChange={setCapturedThumbnails}
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

          {source && activeTab === "text" && (
              <TextOverlayPanel
                ref={textOverlayPanelRef}
                sourceUrl={source.url}
                onEffectApplied={setResultUrl}
                onDirty={() => setIsPanelDirty(true)}
                onStateChange={setTextOverlayState}
              />
          )}

          {source && activeTab === "watermark" && (
              <WatermarkPanel
                ref={watermarkPanelRef}
                sourceUrl={source.url}
                onEffectApplied={setResultUrl}
                onDirty={() => setIsPanelDirty(true)}
                onStateChange={setWatermarkState}
              />
          )}

          {source && activeTab === "crop" && (
              <CropPanel
                ref={cropPanelRef}
                sourceUrl={source.url}
                onStateChange={setCropState}
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

          {source && activeTab === "ratio" && (
              <RatioPanel
                ref={ratioPanelRef}
                sourceUrl={source.url}
                onStateChange={setRatioState}
                onRatioApplied={setResultUrl}
                onSave={async (url, isPublic) => {
                  await saveEditMutation.mutateAsync({
                    result_url: url,
                    edit_type: "ratio",
                    prompt: source?.name || "Ratio converted",
                    is_public: isPublic,
                  });
                }}
                onDirty={() => setIsPanelDirty(true)}
              />
          )}

          {source && activeTab === "rotate" && (
              <RotatePanel
                ref={rotatePanelRef}
                sourceUrl={source.url}
                onStateChange={setRotateState}
                onRotateApplied={setResultUrl}
                onSave={async (url, isPublic) => {
                  await saveEditMutation.mutateAsync({
                    result_url: url,
                    edit_type: "rotate",
                    prompt: source?.name || "Rotated",
                    is_public: isPublic,
                  });
                }}
                onDirty={() => setIsPanelDirty(true)}
              />
          )}

          {source && activeTab === "creative" && (
              <CreativePresetPanel
                ref={creativePanelRef}
                sourceUrl={displayUrl}
                onApplied={setResultUrl}
                onPreviewOverlay={setPreviewCreativeOverlay}
                onPreviewFilter={setPreviewCssFilter}
                onStateChange={setCreativeState}
                onSave={async (url, isPublic) => {
                  await saveEditMutation.mutateAsync({
                    result_url: url,
                    edit_type: "creative_preset",
                    prompt: source?.name || "Creative Preset",
                    is_public: isPublic,
                  });
                }}
              />
          )}

                </div>
              </div>

              {/* 하단 고정 액션 바 — merge */}
              {activeTab === "merge" && (
                <div className="shrink-0 px-5 pt-3 pb-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => mergePanelRef.current?.reset()}
                      className="flex flex-1 cursor-pointer items-center justify-center rounded-lg bg-neutral-100 py-2.5 text-[13px] font-[500] text-muted-foreground transition-all hover:bg-neutral-200 hover:text-foreground active:opacity-80 dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:hover:text-white"
                    >
                      {t("reset")}
                    </button>
                    <button
                      onClick={() => mergePanelRef.current?.apply()}
                      disabled={!mergeState.canApply || mergeState.isPending}
                      className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-primary py-2.5 text-[13px] font-[600] text-white transition-all hover:opacity-90 active:opacity-80 disabled:pointer-events-none disabled:opacity-30"
                    >
                      {mergeState.isPending && <Loader2 className="size-3.5 animate-spin" />}
                      {t("apply")}
                    </button>
                  </div>
                </div>
              )}

              {/* 하단 고정 액션 바 — effects */}
              {activeTab === "effects" && source && (
                <div className="shrink-0 px-5 pt-3 pb-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => effectsPanelRef.current?.reset()}
                      className="flex flex-1 cursor-pointer items-center justify-center rounded-lg bg-neutral-100 py-2.5 text-[13px] font-[500] text-muted-foreground transition-all hover:bg-neutral-200 hover:text-foreground active:opacity-80 dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:hover:text-white"
                    >
                      {t("reset")}
                    </button>
                    <button
                      onClick={() => effectsPanelRef.current?.apply()}
                      disabled={!effectsState.canApply || effectsState.isPending}
                      className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-primary py-2.5 text-[13px] font-[600] text-white transition-all hover:opacity-90 active:opacity-80 disabled:pointer-events-none disabled:opacity-30"
                    >
                      {effectsState.isPending && <Loader2 className="size-3.5 animate-spin" />}
                      {t("apply")}
                    </button>
                  </div>
                </div>
              )}

              {/* 하단 고정 액션 바 — crop */}
              {activeTab === "crop" && source && (
                <div className="shrink-0 px-5 pt-3 pb-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => cropPanelRef.current?.reset()}
                      className="flex flex-1 cursor-pointer items-center justify-center rounded-lg bg-neutral-100 py-2.5 text-[13px] font-[500] text-muted-foreground transition-all hover:bg-neutral-200 hover:text-foreground active:opacity-80 dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:hover:text-white"
                    >
                      {t("reset")}
                    </button>
                    <button
                      onClick={() => cropPanelRef.current?.apply()}
                      disabled={cropState.isOriginal || cropState.isPending}
                      className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-primary py-2.5 text-[13px] font-[600] text-white transition-all hover:opacity-90 active:opacity-80 disabled:pointer-events-none disabled:opacity-30"
                    >
                      {cropState.isPending && <Loader2 className="size-3.5 animate-spin" />}
                      {t("applyCrop")}
                    </button>
                  </div>
                </div>
              )}

              {/* 하단 고정 액션 바 — ratio */}
              {activeTab === "ratio" && source && (
                <div className="shrink-0 px-5 pt-3 pb-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => ratioPanelRef.current?.reset()}
                      className="flex flex-1 cursor-pointer items-center justify-center rounded-lg bg-neutral-100 py-2.5 text-[13px] font-[500] text-muted-foreground transition-all hover:bg-neutral-200 hover:text-foreground active:opacity-80 dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:hover:text-white"
                    >
                      {t("reset")}
                    </button>
                    <button
                      onClick={() => ratioPanelRef.current?.apply()}
                      disabled={!ratioState.canApply || ratioState.isPending}
                      className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-primary py-2.5 text-[13px] font-[600] text-white transition-all hover:opacity-90 active:opacity-80 disabled:pointer-events-none disabled:opacity-30"
                    >
                      {ratioState.isPending && <Loader2 className="size-3.5 animate-spin" />}
                      {t("apply")}
                    </button>
                  </div>
                </div>
              )}

              {/* 하단 고정 액션 바 — creative */}
              {activeTab === "creative" && source && (
                <div className="shrink-0 px-5 pt-3 pb-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => creativePanelRef.current?.reset()}
                      className="flex flex-1 cursor-pointer items-center justify-center rounded-lg bg-neutral-100 py-2.5 text-[13px] font-[500] text-muted-foreground transition-all hover:bg-neutral-200 hover:text-foreground active:opacity-80 dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:hover:text-white"
                    >
                      {t("reset")}
                    </button>
                    <button
                      onClick={() => creativePanelRef.current?.apply()}
                      disabled={!creativeState.canApply || creativeState.isPending}
                      className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-primary py-2.5 text-[13px] font-[600] text-white transition-all hover:opacity-90 active:opacity-80 disabled:pointer-events-none disabled:opacity-30"
                    >
                      {creativeState.isPending && <Loader2 className="size-3.5 animate-spin" />}
                      {t("apply")}
                    </button>
                  </div>
                </div>
              )}

              {/* 하단 고정 액션 바 — filter */}
              {mainTab === "filter" && subTool && subTool !== "creative" && source && (
                <div className="shrink-0 px-5 pt-3 pb-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => filterPanelRef.current?.reset()}
                      className="flex flex-1 cursor-pointer items-center justify-center rounded-lg bg-neutral-100 py-2.5 text-[13px] font-[500] text-muted-foreground transition-all hover:bg-neutral-200 hover:text-foreground active:opacity-80 dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:hover:text-white"
                    >
                      {t("reset")}
                    </button>
                    <button
                      onClick={() => filterPanelRef.current?.apply()}
                      disabled={!filterState.canApply || filterState.isPending}
                      className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-primary py-2.5 text-[13px] font-[600] text-white transition-all hover:opacity-90 active:opacity-80 disabled:pointer-events-none disabled:opacity-30"
                    >
                      {filterState.isPending && <Loader2 className="size-3.5 animate-spin" />}
                      {t("apply")}
                    </button>
                  </div>
                </div>
              )}

              {/* 하단 고정 액션 바 — rotate */}
              {activeTab === "rotate" && source && (
                <div className="shrink-0 px-5 pt-3 pb-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => rotatePanelRef.current?.reset()}
                      className="flex flex-1 cursor-pointer items-center justify-center rounded-lg bg-neutral-100 py-2.5 text-[13px] font-[500] text-muted-foreground transition-all hover:bg-neutral-200 hover:text-foreground active:opacity-80 dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:hover:text-white"
                    >
                      {t("reset")}
                    </button>
                    <button
                      onClick={() => rotatePanelRef.current?.apply()}
                      disabled={!rotateState.hasSelection || rotateState.isPending}
                      className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-primary py-2.5 text-[13px] font-[600] text-white transition-all hover:opacity-90 active:opacity-80 disabled:pointer-events-none disabled:opacity-30"
                    >
                      {rotateState.isPending && <Loader2 className="size-3.5 animate-spin" />}
                      {t("apply")}
                    </button>
                  </div>
                </div>
              )}

              {/* 하단 고정 액션 바 — subtitles */}
              {activeTab === "subtitles" && source && (
                <div className="shrink-0 px-5 pt-3 pb-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => subtitlesPanelRef.current?.reset()}
                      className="flex flex-1 cursor-pointer items-center justify-center rounded-lg bg-neutral-100 py-2.5 text-[13px] font-[500] text-muted-foreground transition-all hover:bg-neutral-200 hover:text-foreground active:opacity-80 dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:hover:text-white"
                    >
                      {t("reset")}
                    </button>
                    <button
                      onClick={() => subtitlesPanelRef.current?.apply()}
                      disabled={!subtitlesState.canApply || subtitlesState.isPending}
                      className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-primary py-2.5 text-[13px] font-[600] text-white transition-all hover:opacity-90 active:opacity-80 disabled:pointer-events-none disabled:opacity-30"
                    >
                      {subtitlesState.isPending && <Loader2 className="size-3.5 animate-spin" />}
                      {t("apply")}
                    </button>
                  </div>
                </div>
              )}

              {/* 하단 고정 액션 바 — text overlay */}
              {activeTab === "text" && source && (
                <div className="shrink-0 px-5 pt-3 pb-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => textOverlayPanelRef.current?.reset()}
                      className="flex flex-1 cursor-pointer items-center justify-center rounded-lg bg-neutral-100 py-2.5 text-[13px] font-[500] text-muted-foreground transition-all hover:bg-neutral-200 hover:text-foreground active:opacity-80 dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:hover:text-white"
                    >
                      {t("reset")}
                    </button>
                    <button
                      onClick={() => textOverlayPanelRef.current?.apply()}
                      disabled={!textOverlayState.canApply || textOverlayState.isPending}
                      className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-primary py-2.5 text-[13px] font-[600] text-white transition-all hover:opacity-90 active:opacity-80 disabled:pointer-events-none disabled:opacity-30"
                    >
                      {textOverlayState.isPending && <Loader2 className="size-3.5 animate-spin" />}
                      {t("apply")}
                    </button>
                  </div>
                </div>
              )}

              {/* 하단 고정 액션 바 — watermark */}
              {activeTab === "watermark" && source && (
                <div className="shrink-0 px-5 pt-3 pb-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => watermarkPanelRef.current?.reset()}
                      className="flex flex-1 cursor-pointer items-center justify-center rounded-lg bg-neutral-100 py-2.5 text-[13px] font-[500] text-muted-foreground transition-all hover:bg-neutral-200 hover:text-foreground active:opacity-80 dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:hover:text-white"
                    >
                      {t("reset")}
                    </button>
                    <button
                      onClick={() => watermarkPanelRef.current?.apply()}
                      disabled={!watermarkState.canApply || watermarkState.isPending}
                      className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-primary py-2.5 text-[13px] font-[600] text-white transition-all hover:opacity-90 active:opacity-80 disabled:pointer-events-none disabled:opacity-30"
                    >
                      {watermarkState.isPending && <Loader2 className="size-3.5 animate-spin" />}
                      {t("apply")}
                    </button>
                  </div>
                </div>
              )}

              {/* 하단 고정 액션 바 — gif */}
              {activeTab === "gif" && source && (
                <div className="shrink-0 px-5 pt-3 pb-4">
                  <button
                    onClick={() => gifPanelRef.current?.apply()}
                    disabled={!gifState.canApply || gifState.isPending}
                    className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-primary py-2.5 text-[13px] font-[600] text-white transition-all hover:opacity-90 active:opacity-80 disabled:pointer-events-none disabled:opacity-30"
                  >
                    {gifState.isPending && <Loader2 className="size-3.5 animate-spin" />}
                    {t("createGif")}
                  </button>
                </div>
              )}

              {/* 하단 고정 액션 바 — ai */}
              {mainTab === "ai" && source && (
                <div className="shrink-0 px-5 pt-3 pb-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => aiEditPanelRef.current?.reset()}
                      className="flex flex-1 cursor-pointer items-center justify-center rounded-lg bg-neutral-100 py-2.5 text-[13px] font-[500] text-muted-foreground transition-all hover:bg-neutral-200 hover:text-foreground active:opacity-80 dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:hover:text-white"
                    >
                      {t("reset")}
                    </button>
                    <button
                      onClick={() => aiEditPanelRef.current?.apply()}
                      disabled={!aiEditState.canApply || aiEditState.isPending}
                      className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-primary py-2.5 text-[13px] font-[600] text-white transition-all hover:opacity-90 active:opacity-80 disabled:pointer-events-none disabled:opacity-30"
                    >
                      {aiEditState.isPending && <Loader2 className="size-3.5 animate-spin" />}
                      {t("apply")}
                    </button>
                  </div>
                </div>
              )}

            </div>
          </div>}
        </div>


        {/* 하단 비디오 히스토리 */}
        <div className={`mt-12 pb-10 ${source ? "sm:mr-[384px]" : ""}`}>
          <VideoSourceSelector
            onSourceSelected={handleSourceSelected}
            isLoading={uploadMutation.isPending}
            onDelete={() => {
              // TODO: API 삭제 연동
            }}
          />
        </div>
      </div>

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

      {/* 히스토리 선택 모달 */}
      <HistorySelectModal
        isOpen={isHistoryModalOpen}
        onClose={() => setHistoryModalOpen(false)}
        onSelect={(item) => {
          if (activeTab === "merge") {
            addMergeClipRef.current?.(item.url, item.name);
            setHistoryModalOpen(false);
          } else {
            handleSourceSelected(item);
          }
        }}
      />

      {/* 탭 전환 확인 모달 */}
      {isTabConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/60">
          <div className="mx-4 w-full max-w-sm space-y-4 rounded-2xl border border-neutral-300 bg-white p-6 dark:border-neutral-700 dark:bg-neutral-900">
            <h3 className="text-base font-semibold text-foreground">
              {t("tabSwitchConfirmTitle")}
            </h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
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

      {/* 비교 크게 보기 모달 */}
      {compareModal && resultUrl && source?.url && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="relative flex h-[90vh] w-[95vw] max-w-7xl flex-col gap-3 rounded-2xl bg-background p-4">
            {/* 닫기 */}
            <button
              onClick={() => { setCompareModal(false); setModalSyncPlaying(false); }}
              className="absolute right-3 top-3 z-10 rounded-full bg-black/50 p-1.5 text-white transition-colors hover:bg-black/70"
            >
              <X className="size-5" />
            </button>

            {/* 비디오 영역 */}
            <div className="flex flex-1 gap-2 overflow-hidden">
              {/* 원본 */}
              <div className="relative flex flex-1 items-center justify-center overflow-hidden rounded-xl border border-border bg-black">
                <video
                  ref={modalOrigRef}
                  src={source.url}
                  className="max-h-full max-w-full object-contain"
                  muted
                  loop
                />
                <span className="absolute top-2 left-2 rounded bg-black/60 px-2 py-1 text-xs font-medium text-white">
                  {t("original")}
                </span>
              </div>
              {/* 편집본 */}
              <div className="relative flex flex-1 items-center justify-center overflow-hidden rounded-xl border border-border bg-black">
                <video
                  ref={modalEditRef}
                  src={resultUrl}
                  className="max-h-full max-w-full object-contain"
                  muted
                  loop
                />
                <span className="absolute top-2 left-2 rounded bg-primary/80 px-2 py-1 text-xs font-medium text-white">
                  {t("edited")}
                </span>
              </div>
            </div>

            {/* 동시 재생 버튼 */}
            <button
              onClick={() => {
                const orig = modalOrigRef.current;
                const edit = modalEditRef.current;
                if (!orig || !edit) return;
                if (modalSyncPlaying) {
                  orig.pause();
                  edit.pause();
                  setModalSyncPlaying(false);
                } else {
                  orig.currentTime = 0;
                  edit.currentTime = 0;
                  orig.play();
                  edit.play();
                  setModalSyncPlaying(true);
                }
              }}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-neutral-200/60 px-4 py-2.5 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-300 dark:bg-neutral-800/60 dark:text-neutral-300 dark:hover:bg-neutral-700"
            >
              {modalSyncPlaying ? (
                <><Pause className="size-4" />{t("syncPause")}</>
              ) : (
                <><Play className="size-4" />{t("syncPlay")}</>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
