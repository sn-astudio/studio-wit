"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Download,
  Globe,
  Lock,
  Loader2,
  Merge,
  Save,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Button } from "@/components/ui/Button";
import { useMergeVideos, useSaveEdit } from "@/hooks/queries/useVideoEdit";
import { useNotifyOnComplete } from "@/hooks/useNotifyOnComplete";

import { downloadVideo } from "../utils";
import type { MergeClip, MergePanelProps } from "./types";

export function MergePanel({ onMergeComplete, onAddClipRef, onRemoveClipRef, onMoveClipRef, onResetClipsRef, onSetClipsRef, onClipsChange }: MergePanelProps) {
  const t = useTranslations("VideoEdit");
  const [clips, setClips] = useState<MergeClip[]>([]);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [isPublicSave, setIsPublicSave] = useState(false);

  const notify = useNotifyOnComplete();
  const mergeMutation = useMergeVideos();
  const saveEditMutation = useSaveEdit();

  const clipIdRef = useRef(0);
  const addClip = useCallback((url: string, name?: string) => {
    clipIdRef.current += 1;
    const id = `clip_${Date.now()}_${clipIdRef.current}`;
    setClips((prev) => [...prev, { id, url, name }]);
    setResultUrl(null);
  }, []);

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

  const removeClip = useCallback((id: string) => {
    setClips((prev) => prev.filter((c) => c.id !== id));
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

  // 함수들을 부모에 노출
  useEffect(() => {
    onAddClipRef?.(addClip);
  }, [addClip, onAddClipRef]);

  useEffect(() => {
    onRemoveClipRef?.(removeClip);
  }, [removeClip, onRemoveClipRef]);

  useEffect(() => {
    onMoveClipRef?.(moveClip);
  }, [moveClip, onMoveClipRef]);

  const resetClips = useCallback(() => {
    setClips([]);
    setResultUrl(null);
    clipIdRef.current = 0;
  }, []);

  useEffect(() => {
    onResetClipsRef?.(resetClips);
  }, [resetClips, onResetClipsRef]);

  useEffect(() => {
    onSetClipsRef?.(setClips);
  }, [onSetClipsRef]);

  // 클립 변경 시 부모에 알림
  useEffect(() => {
    onClipsChange?.(clips);
  }, [clips, onClipsChange]);

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
  }, [clips, mergeMutation, onMergeComplete, t]);

  return (
    <div className="space-y-3">
      {!resultUrl && (
        <>
          <p className="text-xs text-zinc-600 dark:text-zinc-400">{t("mergeDescription")}</p>

          {/* 합치기 버튼 */}
          <Button
            size="sm"
            className="w-full gap-1.5"
            onClick={handleMerge}
            disabled={clips.length < 2 || mergeMutation.isPending}
          >
            {mergeMutation.isPending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Merge className="size-3.5" />
            )}
            {t("merge")}
            {clips.length > 0 && (
              <span className="text-xs opacity-70">
                ({t("clipCount", { count: clips.length })})
              </span>
            )}
          </Button>
        </>
      )}

      {/* 합치기 완료 결과 */}
      {resultUrl && (
        <div className="space-y-2">
          <div className="flex items-start gap-3 rounded-lg border border-primary/30 bg-primary/5 p-3">
            <video
              src={resultUrl}
              className="h-24 w-32 shrink-0 rounded-md object-cover"
              controls
              muted
            />
            <div className="flex flex-1 flex-col gap-2 py-1">
              <div className="flex items-center gap-1.5">
                <Merge className="size-4 text-primary" />
                <span className="text-sm font-semibold text-primary">
                  {t("mergeComplete")}
                </span>
              </div>
              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                {t("mergeResultReady")}
              </p>
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
                  className="flex-1 gap-1.5"
                  onClick={() =>
                    downloadVideo(resultUrl, `merged_${Date.now()}.mp4`)
                  }
                >
                  <Download className="size-4" />
                  {t("downloadMerged")}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 gap-1.5"
                  disabled={saveEditMutation.isPending}
                  onClick={handleSaveToHistory}
                >
                  {saveEditMutation.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Save className="size-4" />
                  )}
                  {t("saveMerged")}
                </Button>
              </div>
            </div>
          </div>

          {/* 새로운 합치기 시작 */}
          <Button
            size="sm"
            variant="outline"
            className="w-full gap-1.5"
            onClick={() => {
              setResultUrl(null);
              setClips([]);
              clipIdRef.current = 0;
            }}
          >
            <Merge className="size-3.5" />
            {t("mergeAgain")}
          </Button>
        </div>
      )}
    </div>
  );
}
