"use client";

import { useCallback, useState } from "react";
import {
  Download,
  Loader2,
  Save,
  ScanSearch,
  Scissors,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { useNotifyOnComplete } from "@/hooks/useNotifyOnComplete";
import {
  useDetectScenes,
  useSplitScene,
  useSaveEdit,
} from "@/hooks/queries/useVideoEdit";
import type { SceneInfo } from "@/types/api";

import type { SceneSplitPanelProps } from "./types";

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.round((seconds % 1) * 10);
  return `${m}:${String(s).padStart(2, "0")}.${ms}`;
}

export function SceneSplitPanel({
  sourceUrl,
  duration,
  onSceneExtracted,
}: SceneSplitPanelProps) {
  const t = useTranslations("VideoEdit");
  const notify = useNotifyOnComplete();

  const [threshold, setThreshold] = useState(0.3);
  const [minDuration, setMinDuration] = useState(1.0);
  const [scenes, setScenes] = useState<SceneInfo[]>([]);
  const [extractingIdx, setExtractingIdx] = useState<number | null>(null);
  const [savingIdx, setSavingIdx] = useState<number | null>(null);

  const detectMutation = useDetectScenes();
  const splitMutation = useSplitScene();
  const saveMutation = useSaveEdit();

  const handleDetect = useCallback(async () => {
    if (!sourceUrl) return;
    try {
      const result = await detectMutation.mutateAsync({
        source_url: sourceUrl,
        threshold,
        min_scene_duration: minDuration,
      });
      setScenes(result.scenes);
      if (result.scenes.length === 0) {
        toast.info(t("noScenesDetected"));
      } else {
        toast.success(t("scenesDetected", { count: result.scenes.length }));
      }
    } catch {
      toast.error(t("sceneDetectError"));
    }
  }, [sourceUrl, threshold, minDuration, detectMutation, t]);

  const handleExtract = useCallback(
    async (scene: SceneInfo) => {
      if (!sourceUrl) return;
      setExtractingIdx(scene.index);
      try {
        const result = await splitMutation.mutateAsync({
          source_url: sourceUrl,
          start_time: scene.start,
          end_time: scene.end,
        });
        onSceneExtracted?.(result.result_url);
        toast.success(t("sceneExtracted"));
        notify(t("sceneExtracted"));
      } catch {
        toast.error(t("sceneExtractError"));
      } finally {
        setExtractingIdx(null);
      }
    },
    [sourceUrl, splitMutation, onSceneExtracted, t, notify],
  );

  const handleDownload = useCallback(
    async (scene: SceneInfo) => {
      if (!sourceUrl) return;
      setExtractingIdx(scene.index);
      try {
        const result = await splitMutation.mutateAsync({
          source_url: sourceUrl,
          start_time: scene.start,
          end_time: scene.end,
        });
        const resp = await fetch(result.result_url);
        const blob = await resp.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `scene_${scene.index + 1}.mp4`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success(t("sceneDownloaded"));
      } catch {
        toast.error(t("sceneExtractError"));
      } finally {
        setExtractingIdx(null);
      }
    },
    [sourceUrl, splitMutation, t],
  );

  const handleSave = useCallback(
    async (scene: SceneInfo) => {
      if (!sourceUrl) return;
      setSavingIdx(scene.index);
      try {
        const splitResult = await splitMutation.mutateAsync({
          source_url: sourceUrl,
          start_time: scene.start,
          end_time: scene.end,
        });
        await saveMutation.mutateAsync({
          result_url: splitResult.result_url,
          edit_type: "scene_split",
          prompt: `Scene ${scene.index + 1} (${formatTime(scene.start)} - ${formatTime(scene.end)})`,
          is_public: false,
        });
        toast.success(t("sceneSaved"));
      } catch {
        toast.error(t("sceneExtractError"));
      } finally {
        setSavingIdx(null);
      }
    },
    [sourceUrl, splitMutation, saveMutation, t],
  );

  const isPending = detectMutation.isPending || splitMutation.isPending;

  return (
    <div className="flex flex-1 flex-col gap-5">
      {/* 설정 */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-[600] text-foreground">{t("sceneThreshold")}</span>
          <span className="text-[12px] font-[500] tabular-nums text-muted-foreground">{threshold.toFixed(1)}</span>
        </div>
        <p className="text-[12px] text-muted-foreground/60">{t("sceneThresholdHelp")}</p>
        <input
          type="range"
          min={0.1}
          max={0.9}
          step={0.05}
          value={threshold}
          onChange={(e) => setThreshold(Number(e.target.value))}
          className="filter-slider h-1.5 w-full cursor-pointer appearance-none rounded-full bg-neutral-300 accent-white dark:bg-neutral-700"
          style={{ "--slider-pct": `${((threshold - 0.1) / 0.8) * 100}%` } as React.CSSProperties}
        />
      </div>

      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-[600] text-foreground">{t("sceneMinDuration")}</span>
          <span className="text-[12px] font-[500] tabular-nums text-muted-foreground">{minDuration.toFixed(1)}s</span>
        </div>
        <input
          type="range"
          min={0.5}
          max={10}
          step={0.5}
          value={minDuration}
          onChange={(e) => setMinDuration(Number(e.target.value))}
          className="filter-slider h-1.5 w-full cursor-pointer appearance-none rounded-full bg-neutral-300 accent-white dark:bg-neutral-700"
          style={{ "--slider-pct": `${((minDuration - 0.5) / 9.5) * 100}%` } as React.CSSProperties}
        />
      </div>

      {/* 감지 버튼 */}
      <button
        onClick={handleDetect}
        disabled={!sourceUrl || isPending}
        className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-neutral-50 py-2.5 text-[12px] font-[500] text-muted-foreground transition-all hover:bg-neutral-100 hover:text-foreground active:opacity-80 disabled:pointer-events-none disabled:opacity-30 dark:bg-neutral-800/60 dark:hover:bg-neutral-800 dark:hover:text-white"
      >
        {detectMutation.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <ScanSearch className="size-3.5" />}
        {t("detectScenes")}
      </button>

      {/* 장면 목록 */}
      {scenes.length > 0 && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-[600] text-foreground">
              {t("scenesFound", { count: scenes.length })}
            </span>
            <span className="text-[11px] tabular-nums text-muted-foreground/60">
              {t("totalDuration", { duration: formatTime(duration) })}
            </span>
          </div>
          <div className="space-y-1.5">
            {scenes.map((scene) => {
              const isExtracting = extractingIdx === scene.index;
              const isSaving = savingIdx === scene.index;
              const busy = isExtracting || isSaving;

              return (
                <div
                  key={scene.index}
                  className="flex items-center gap-2 rounded-xl bg-neutral-50 p-3 dark:bg-neutral-800/60"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="flex size-5 shrink-0 items-center justify-center rounded-md bg-foreground text-[10px] font-[600] text-background">
                        {scene.index + 1}
                      </span>
                      <span className="text-[12px] tabular-nums text-foreground">
                        {formatTime(scene.start)} – {formatTime(scene.end)}
                      </span>
                      <span className="text-[11px] text-muted-foreground/60">
                        ({scene.duration.toFixed(1)}s)
                      </span>
                    </div>
                    <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700">
                      <div
                        className="h-full rounded-full bg-foreground/60"
                        style={{
                          marginLeft: `${(scene.start / duration) * 100}%`,
                          width: `${(scene.duration / duration) * 100}%`,
                        }}
                      />
                    </div>
                  </div>

                  <div className="flex shrink-0 gap-1">
                    <button
                      onClick={() => handleExtract(scene)}
                      disabled={busy}
                      className="flex size-8 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-neutral-200 hover:text-foreground disabled:pointer-events-none disabled:opacity-40 dark:hover:bg-neutral-700"
                      title={t("sceneExtract")}
                    >
                      {isExtracting && !isSaving ? <Loader2 className="size-3.5 animate-spin" /> : <Scissors className="size-3.5" />}
                    </button>
                    <button
                      onClick={() => handleSave(scene)}
                      disabled={busy}
                      className="flex size-8 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-neutral-200 hover:text-foreground disabled:pointer-events-none disabled:opacity-40 dark:hover:bg-neutral-700"
                      title={t("sceneSave")}
                    >
                      {isSaving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
                    </button>
                    <button
                      onClick={() => handleDownload(scene)}
                      disabled={busy}
                      className="flex size-8 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-neutral-200 hover:text-foreground disabled:pointer-events-none disabled:opacity-40 dark:hover:bg-neutral-700"
                      title={t("sceneDownload")}
                    >
                      <Download className="size-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
