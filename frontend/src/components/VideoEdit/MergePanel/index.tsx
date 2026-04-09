"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import {
  Check,
  Download,
  Globe,
  Lock,
  Loader2,
  Save,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Button } from "@/components/ui/Button";
import { useMergeVideos, useSaveEdit } from "@/hooks/queries/useVideoEdit";
import { useNotifyOnComplete } from "@/hooks/useNotifyOnComplete";

import { downloadVideo } from "../utils";
import type { MergeClip, MergePanelProps, MergePanelRef } from "./types";

export const MergePanel = forwardRef<MergePanelRef, MergePanelProps>(function MergePanel({
  onMergeComplete,
  onAddClipRef,
  onRemoveClipRef,
  onMoveClipRef,
  onResetClipsRef,
  onSetClipsRef,
  onClipsChange,
  onStateChange,
  sourceUrl,
  sourceName,
}, ref) {
  const t = useTranslations("VideoEdit");
  const [clips, setClips] = useState<MergeClip[]>([]);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [isPublicSave, setIsPublicSave] = useState(false);

  const notify = useNotifyOnComplete();
  const mergeMutation = useMergeVideos();
  const saveEditMutation = useSaveEdit();

  const clipIdRef = useRef(0);
  const addClip = useCallback((url: string, name?: string) => {
    setClips((prev) => {
      if (prev.length >= 5) return prev;
      clipIdRef.current += 1;
      const id = `clip_${Date.now()}_${clipIdRef.current}`;
      return [...prev, { id, url, name }];
    });
    setResultUrl(null);
  }, []);

  const removeClip = useCallback((id: string) => {
    setClips((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((c) => c.id !== id);
    });
  }, []);

  const moveClip = useCallback((idx: number, direction: -1 | 1) => {
    setClips((prev) => {
      const targetIdx = idx + direction;
      if (targetIdx < 0 || targetIdx >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[targetIdx]] = [next[targetIdx], next[idx]];
      return next;
    });
  }, []);

  const resetClips = useCallback(() => {
    setResultUrl(null);
    clipIdRef.current = 1;
    if (sourceUrl) {
      setClips([{ id: `clip_${Date.now()}_1`, url: sourceUrl, name: sourceName || "Current video" }]);
    } else {
      setClips([]);
      clipIdRef.current = 0;
    }
  }, [sourceUrl, sourceName]);

  // 함수들을 부모에 노출
  useEffect(() => { onAddClipRef?.(addClip); }, [addClip, onAddClipRef]);
  useEffect(() => { onRemoveClipRef?.(removeClip); }, [removeClip, onRemoveClipRef]);
  useEffect(() => { onMoveClipRef?.(moveClip); }, [moveClip, onMoveClipRef]);
  useEffect(() => { onResetClipsRef?.(resetClips); }, [resetClips, onResetClipsRef]);
  useEffect(() => { onSetClipsRef?.(setClips); }, [onSetClipsRef]);
  useEffect(() => { onClipsChange?.(clips); }, [clips, onClipsChange]);

  const canApply = clips.length >= 2 && !resultUrl;

  useEffect(() => {
    onStateChange?.({ canApply, isPending: mergeMutation.isPending });
  }, [canApply, mergeMutation.isPending, onStateChange]);

  const handleMerge = useCallback(async () => {
    if (clips.length < 2) {
      toast.error(t("mergeMinClips"));
      return;
    }
    try {
      const result = await mergeMutation.mutateAsync({
        video_urls: clips.map((c) => c.url),
      });
      setResultUrl(result.result_url);
      onMergeComplete?.(result.result_url);
      toast.success(t("mergeSuccess"));
      notify(t("mergeSuccess"));
    } catch {
      toast.error(t("mergeError"));
    }
  }, [clips, mergeMutation, onMergeComplete, t, notify]);

  useImperativeHandle(ref, () => ({
    reset: resetClips,
    apply: handleMerge,
  }));

  const handleSaveToHistory = useCallback(async () => {
    if (!resultUrl) return;
    try {
      await saveEditMutation.mutateAsync({
        result_url: resultUrl,
        edit_type: "merge",
        prompt: `Merged ${clips.length} clips`,
        is_public: isPublicSave,
      });
      toast.success(t("saveSuccess"));
    } catch {
      toast.error(t("saveError"));
    }
  }, [resultUrl, clips.length, saveEditMutation, t, isPublicSave]);

  return (
    <div className="flex flex-col gap-5">
      {/* 합치기 완료 결과 */}
      {resultUrl && (
        <div className="animate-in fade-in slide-in-from-bottom-2 space-y-3 rounded-lg border border-primary/30 bg-primary/5 p-3 duration-200">
          <div className="flex items-center gap-2">
            <div className="flex size-5 items-center justify-center rounded-full bg-primary/20">
              <Check className="size-3 text-primary" />
            </div>
            <p className="text-[12px] font-[500] text-primary">{t("mergeComplete")}</p>
          </div>

          <video
            src={resultUrl}
            className="w-full rounded-lg object-cover"
            controls
            muted
          />

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsPublicSave(!isPublicSave)}
              className="flex items-center gap-1 rounded-lg bg-neutral-50 px-2.5 py-1.5 text-[12px] font-[500] text-muted-foreground transition-all hover:bg-neutral-100 hover:text-foreground active:opacity-80 dark:bg-neutral-800/60 dark:hover:bg-neutral-800 dark:hover:text-white"
            >
              {isPublicSave ? <Globe className="size-3" /> : <Lock className="size-3" />}
              {isPublicSave ? t("public") : t("private")}
            </button>
            <Button size="sm" className="flex-1 gap-1.5" onClick={handleSaveToHistory} disabled={saveEditMutation.isPending}>
              {saveEditMutation.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
              {t("saveMerged")}
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => downloadVideo(resultUrl, `merged_${Date.now()}.mp4`)}>
              <Download className="size-3.5" />
              {t("downloadMerged")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
});
