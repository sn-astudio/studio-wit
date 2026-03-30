"use client";

import { useCallback, useState } from "react";
import {
  Download,
  Loader2,
  Play,
  Scissors,
  ScanSearch,
  Save,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Slider as SliderPrimitive } from "@base-ui/react/slider";

import { Button } from "@/components/ui/Button";
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
        toast.success(
          t("scenesDetected", { count: result.scenes.length }),
        );
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
        // blob 다운로드
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
    <div className="space-y-3">
      {/* 설정 */}
      <div className="space-y-2 rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
        <div className="flex items-center justify-between">
          <span className="text-xs text-zinc-500">{t("sceneThreshold")}</span>
          <span className="text-xs tabular-nums text-zinc-400">
            {threshold.toFixed(1)}
          </span>
        </div>
        <SliderPrimitive.Root
          value={threshold}
          onValueChange={(v) => setThreshold(v as number)}
          min={0.1}
          max={0.9}
          step={0.05}
        >
          <SliderPrimitive.Control className="relative flex h-5 w-full cursor-pointer items-center">
            <SliderPrimitive.Track className="h-1.5 w-full rounded-full bg-zinc-200 dark:bg-zinc-800">
              <SliderPrimitive.Indicator className="rounded-full bg-primary" />
            </SliderPrimitive.Track>
            <SliderPrimitive.Thumb className="block size-4 rounded-full border-2 border-primary bg-background shadow-sm" />
          </SliderPrimitive.Control>
        </SliderPrimitive.Root>
        <p className="text-[10px] text-zinc-400">{t("sceneThresholdHelp")}</p>

        <div className="flex items-center justify-between">
          <span className="text-xs text-zinc-500">
            {t("sceneMinDuration")}
          </span>
          <span className="text-xs tabular-nums text-zinc-400">
            {minDuration.toFixed(1)}s
          </span>
        </div>
        <SliderPrimitive.Root
          value={minDuration}
          onValueChange={(v) => setMinDuration(v as number)}
          min={0.5}
          max={10}
          step={0.5}
        >
          <SliderPrimitive.Control className="relative flex h-5 w-full cursor-pointer items-center">
            <SliderPrimitive.Track className="h-1.5 w-full rounded-full bg-zinc-200 dark:bg-zinc-800">
              <SliderPrimitive.Indicator className="rounded-full bg-primary" />
            </SliderPrimitive.Track>
            <SliderPrimitive.Thumb className="block size-4 rounded-full border-2 border-primary bg-background shadow-sm" />
          </SliderPrimitive.Control>
        </SliderPrimitive.Root>
      </div>

      {/* 감지 버튼 */}
      <Button
        size="sm"
        className="w-full gap-1.5"
        onClick={handleDetect}
        disabled={!sourceUrl || isPending}
      >
        {detectMutation.isPending ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <ScanSearch className="size-3.5" />
        )}
        {t("detectScenes")}
      </Button>

      {/* 장면 목록 */}
      {scenes.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium">
              {t("scenesFound", { count: scenes.length })}
            </span>
            <span className="text-[10px] text-zinc-400">
              {t("totalDuration", {
                duration: formatTime(duration),
              })}
            </span>
          </div>
          <div className="max-h-64 space-y-1 overflow-y-auto pr-1">
            {scenes.map((scene) => {
              const isExtracting = extractingIdx === scene.index;
              const isSaving = savingIdx === scene.index;
              const busy = isExtracting || isSaving;

              return (
                <div
                  key={scene.index}
                  className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 p-2 dark:border-zinc-700 dark:bg-zinc-900/50"
                >
                  {/* 장면 정보 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="flex size-5 shrink-0 items-center justify-center rounded bg-primary/10 text-[10px] font-medium text-primary">
                        {scene.index + 1}
                      </span>
                      <span className="text-[11px] tabular-nums text-zinc-600 dark:text-zinc-300">
                        {formatTime(scene.start)} – {formatTime(scene.end)}
                      </span>
                      <span className="text-[10px] text-zinc-400">
                        ({scene.duration.toFixed(1)}s)
                      </span>
                    </div>
                    {/* 타임라인 바 */}
                    <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                      <div
                        className="h-full rounded-full bg-primary/60"
                        style={{
                          marginLeft: `${(scene.start / duration) * 100}%`,
                          width: `${(scene.duration / duration) * 100}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* 액션 버튼 */}
                  <div className="flex shrink-0 gap-1">
                    <button
                      onClick={() => handleExtract(scene)}
                      disabled={busy}
                      className="flex size-7 items-center justify-center rounded text-zinc-400 transition-colors hover:bg-zinc-200 hover:text-zinc-700 disabled:opacity-40 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                      title={t("sceneExtract")}
                    >
                      {isExtracting && !isSaving ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Scissors className="size-3.5" />
                      )}
                    </button>
                    <button
                      onClick={() => handleSave(scene)}
                      disabled={busy}
                      className="flex size-7 items-center justify-center rounded text-zinc-400 transition-colors hover:bg-zinc-200 hover:text-zinc-700 disabled:opacity-40 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                      title={t("sceneSave")}
                    >
                      {isSaving ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Save className="size-3.5" />
                      )}
                    </button>
                    <button
                      onClick={() => handleDownload(scene)}
                      disabled={busy}
                      className="flex size-7 items-center justify-center rounded text-zinc-400 transition-colors hover:bg-zinc-200 hover:text-zinc-700 disabled:opacity-40 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
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
