"use client";

import { useCallback, useEffect, useState } from "react";
import {
  FileUp,
  Loader2,
  MessageCircle,
  Plus,
  Trash2,
  Type,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Slider as SliderPrimitive } from "@base-ui/react/slider";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useNotifyOnComplete } from "@/hooks/useNotifyOnComplete";
import { useSubtitlesVideo } from "@/hooks/queries/useVideoEdit";

import type { SubtitlesPanelProps } from "./types";

interface SubtitleEntry {
  id: string;
  text: string;
  startTime: string;
  endTime: string;
}

interface SubtitleStyle {
  fontSize: number;
  color: string;
  borderW: number;
  borderColor: string;
  boxColor: string | null;
  position: "top" | "center" | "bottom";
}

interface StylePreset {
  id: string;
  nameKey: string;
  style: SubtitleStyle;
  preview: {
    bg: string;
    text: string;
    border: string;
    boxBg?: string;
  };
}

const STYLE_PRESETS: StylePreset[] = [
  {
    id: "default",
    nameKey: "presetDefault",
    style: {
      fontSize: 36,
      color: "white",
      borderW: 2,
      borderColor: "black@0.6",
      boxColor: null,
      position: "bottom",
    },
    preview: { bg: "transparent", text: "#ffffff", border: "#000000" },
  },
  {
    id: "youtube",
    nameKey: "presetYoutube",
    style: {
      fontSize: 42,
      color: "yellow",
      borderW: 3,
      borderColor: "black@0.8",
      boxColor: null,
      position: "bottom",
    },
    preview: { bg: "transparent", text: "#eab308", border: "#000000" },
  },
  {
    id: "news",
    nameKey: "presetNews",
    style: {
      fontSize: 32,
      color: "white",
      borderW: 0,
      borderColor: "black@0",
      boxColor: "black@0.7",
      position: "bottom",
    },
    preview: {
      bg: "transparent",
      text: "#ffffff",
      border: "transparent",
      boxBg: "rgba(0,0,0,0.7)",
    },
  },
  {
    id: "neon",
    nameKey: "presetNeon",
    style: {
      fontSize: 40,
      color: "#39ff14",
      borderW: 2,
      borderColor: "#ff00ff@0.8",
      boxColor: null,
      position: "center",
    },
    preview: { bg: "transparent", text: "#39ff14", border: "#ff00ff" },
  },
  {
    id: "minimal",
    nameKey: "presetMinimal",
    style: {
      fontSize: 24,
      color: "white",
      borderW: 0,
      borderColor: "black@0",
      boxColor: "black@0.4",
      position: "bottom",
    },
    preview: {
      bg: "transparent",
      text: "#ffffff",
      border: "transparent",
      boxBg: "rgba(0,0,0,0.4)",
    },
  },
  {
    id: "shorts",
    nameKey: "presetShorts",
    style: {
      fontSize: 52,
      color: "white",
      borderW: 4,
      borderColor: "#eab308@0.9",
      boxColor: null,
      position: "center",
    },
    preview: { bg: "transparent", text: "#ffffff", border: "#eab308" },
  },
];

let nextId = Date.now();

/** SRT 타임코드 "HH:MM:SS,mmm" 또는 VTT "HH:MM:SS.mmm" → 초 */
function parseTimecode(tc: string): number {
  const cleaned = tc.trim().replace(",", ".");
  const parts = cleaned.split(":");
  if (parts.length === 3) {
    return parseFloat(parts[0]) * 3600 + parseFloat(parts[1]) * 60 + parseFloat(parts[2]);
  }
  if (parts.length === 2) {
    return parseFloat(parts[0]) * 60 + parseFloat(parts[1]);
  }
  return parseFloat(cleaned) || 0;
}

/** SRT/VTT 파일 텍스트를 SubtitleEntry 배열로 파싱 */
function parseSubtitleFile(content: string): SubtitleEntry[] {
  const entries: SubtitleEntry[] = [];
  // SRT/VTT 공통: "시간 --> 시간" 패턴으로 분리
  const blocks = content.split(/\n\s*\n/).filter((b) => b.trim());

  for (const block of blocks) {
    const lines = block.trim().split("\n");
    // "WEBVTT" 헤더 스킵
    if (lines[0]?.trim() === "WEBVTT") continue;

    // "-->" 포함하는 줄 찾기
    const timeLine = lines.find((l) => l.includes("-->"));
    if (!timeLine) continue;

    const [startStr, endStr] = timeLine.split("-->").map((s) => s.trim());
    const startTime = parseTimecode(startStr);
    const endTime = parseTimecode(endStr);

    // 시간 줄 이후의 텍스트
    const timeIdx = lines.indexOf(timeLine);
    const text = lines
      .slice(timeIdx + 1)
      .join("\n")
      .replace(/<[^>]+>/g, "") // HTML 태그 제거
      .trim();

    if (text) {
      entries.push({
        id: String(nextId++),
        text,
        startTime: String(startTime),
        endTime: String(endTime),
      });
    }
  }
  return entries;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function SubtitlesPanel({
  sourceUrl,
  duration,
  onSubtitlesApplied,
  onPreviewSubtitles,
  onDirty,
}: SubtitlesPanelProps) {
  const t = useTranslations("VideoEdit");
  const notify = useNotifyOnComplete();

  const [subtitles, setSubtitles] = useState<SubtitleEntry[]>([]);
  const [selectedPreset, setSelectedPreset] = useState("default");
  const [style, setStyle] = useState<SubtitleStyle>(
    STYLE_PRESETS[0].style,
  );

  // 자막/스타일 변경 시 프리뷰 업데이트
  useEffect(() => {
    const validSubs = subtitles.filter((s) => s.text.trim());
    if (validSubs.length === 0) {
      onPreviewSubtitles?.([]);
      return;
    }
    onPreviewSubtitles?.(
      validSubs.map((s) => ({
        text: s.text.trim(),
        startTime: parseFloat(s.startTime) || 0,
        endTime: parseFloat(s.endTime) || 5,
        position: style.position,
        fontSize: style.fontSize,
        color: style.color,
      })),
    );
  }, [subtitles, style, onPreviewSubtitles]);

  const subtitlesMutation = useSubtitlesVideo();

  const handlePresetSelect = useCallback(
    (presetId: string) => {
      const preset = STYLE_PRESETS.find((p) => p.id === presetId);
      if (preset) {
        setSelectedPreset(presetId);
        setStyle(preset.style);
        onDirty?.();
      }
    },
    [onDirty],
  );

  const handleFileUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const text = reader.result as string;
        const parsed = parseSubtitleFile(text);
        if (parsed.length === 0) {
          toast.error(t("subtitleFileEmpty"));
          return;
        }
        setSubtitles((prev) => [...prev, ...parsed]);
        onDirty?.();
        toast.success(t("subtitleFileLoaded", { count: parsed.length }));
      };
      reader.readAsText(file);
      e.target.value = "";
    },
    [onDirty, t],
  );

  const handleAdd = useCallback(() => {
    const newId = String(nextId++);
    setSubtitles((prev) => [
      ...prev,
      {
        id: newId,
        text: "",
        startTime: "0",
        endTime: String(Math.min(5, duration)),
      },
    ]);
    onDirty?.();
    // 새 자막의 텍스트 입력으로 포커스
    requestAnimationFrame(() => {
      const el = document.querySelector<HTMLInputElement>(
        `[data-subtitle-id="${newId}"]`,
      );
      el?.focus();
      el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  }, [duration, onDirty]);

  const handleRemove = useCallback(
    (id: string) => {
      setSubtitles((prev) => prev.filter((s) => s.id !== id));
      onDirty?.();
    },
    [onDirty],
  );

  const handleUpdate = useCallback(
    (id: string, field: keyof SubtitleEntry, value: string) => {
      setSubtitles((prev) =>
        prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)),
      );
      onDirty?.();
    },
    [onDirty],
  );

  const handleApply = useCallback(async () => {
    if (!sourceUrl || subtitles.length === 0) return;

    const validSubs = subtitles.filter((s) => s.text.trim());
    if (validSubs.length === 0) return;

    try {
      const result = await subtitlesMutation.mutateAsync({
        source_url: sourceUrl,
        subtitles: validSubs.map((s) => ({
          text: s.text.trim(),
          start_time: parseFloat(s.startTime) || 0,
          end_time: parseFloat(s.endTime) || 5,
          position: style.position,
          font_size: style.fontSize,
          color: style.color,
          border_w: style.borderW,
          border_color: style.borderColor,
          ...(style.boxColor ? { box_color: style.boxColor } : {}),
        })),
      });
      onSubtitlesApplied?.(result.result_url);
      onPreviewSubtitles?.([]);
      setSubtitles([]);
      toast.success(t("subtitlesApplied"));
      notify(t("subtitlesApplied"));
    } catch {
      toast.error(t("subtitlesError"));
    }
  }, [
    sourceUrl,
    subtitles,
    style,
    subtitlesMutation,
    onSubtitlesApplied,
    t,
    notify,
  ]);

  return (
    <div className="space-y-3">
      {/* 자막 목록 */}
      {subtitles.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-neutral-300 py-6 dark:border-neutral-700">
          <MessageCircle className="size-6 text-neutral-400" />
          <span className="text-xs text-neutral-500">{t("noSubtitles")}</span>
        </div>
      ) : (
        <div className="max-h-60 space-y-2 overflow-y-auto pr-1">
          {subtitles.map((sub, idx) => (
            <div
              key={sub.id}
              className="space-y-1.5 rounded-lg border border-neutral-200 bg-neutral-50 p-2 dark:border-neutral-700 dark:bg-neutral-900/50"
            >
              <div className="flex items-center gap-1.5">
                <span className="w-5 text-center text-[10px] font-medium text-neutral-400">
                  {idx + 1}
                </span>
                <Input
                  data-subtitle-id={sub.id}
                  value={sub.text}
                  onChange={(e) =>
                    handleUpdate(sub.id, "text", e.target.value)
                  }
                  placeholder={t("subtitleText")}
                  className="h-7 flex-1 text-xs"
                  maxLength={200}
                />
                <button
                  onClick={() => handleRemove(sub.id)}
                  className="flex size-7 shrink-0 items-center justify-center rounded text-neutral-400 transition-colors hover:text-red-500"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
              <div className="flex items-center gap-1.5 pl-5">
                <span className="text-[10px] text-neutral-500">
                  {t("subtitleStartTime")}
                </span>
                <Input
                  type="number"
                  value={sub.startTime}
                  onChange={(e) =>
                    handleUpdate(sub.id, "startTime", e.target.value)
                  }
                  className="h-6 w-16 text-center text-[11px]"
                  min={0}
                  max={duration}
                  step={0.1}
                />
                <span className="text-[10px] text-neutral-500">
                  {t("subtitleEndTime")}
                </span>
                <Input
                  type="number"
                  value={sub.endTime}
                  onChange={(e) =>
                    handleUpdate(sub.id, "endTime", e.target.value)
                  }
                  className="h-6 w-16 text-center text-[11px]"
                  min={0}
                  max={duration}
                  step={0.1}
                />
                <span className="ml-auto text-[10px] tabular-nums text-neutral-400">
                  {formatTime(parseFloat(sub.startTime) || 0)} –{" "}
                  {formatTime(parseFloat(sub.endTime) || 0)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 자막 추가 / 파일 업로드 */}
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          className="flex-1 gap-1.5"
          onClick={handleAdd}
        >
          <Plus className="size-3.5" />
          {t("addSubtitle")}
        </Button>
        <label className="flex-1 cursor-pointer">
          <Button
            size="sm"
            variant="outline"
            className="w-full gap-1.5"
            nativeButton={false}
            render={<span />}
          >
            <FileUp className="size-3.5" />
            {t("uploadSubtitleFile")}
          </Button>
          <input
            type="file"
            accept=".srt,.vtt,.txt"
            className="hidden"
            onChange={handleFileUpload}
          />
        </label>
      </div>

      {/* 스타일 프리셋 */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5">
          <Type className="size-3.5 text-neutral-400" />
          <span className="text-xs font-medium">{t("subtitleStylePreset")}</span>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {STYLE_PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => handlePresetSelect(preset.id)}
              className={`flex flex-col items-center gap-1 rounded-lg border p-2 transition-colors ${
                selectedPreset === preset.id
                  ? "border-primary bg-primary/5"
                  : "border-neutral-200 hover:border-neutral-400 dark:border-neutral-700 dark:hover:border-neutral-500"
              }`}
            >
              <div className="flex h-7 w-full items-center justify-center rounded bg-neutral-200 dark:bg-neutral-800">
                <span
                  className="truncate text-[10px] font-bold leading-none"
                  style={{
                    color: preset.preview.text,
                    WebkitTextStroke: preset.preview.border !== "transparent"
                      ? `1px ${preset.preview.border}`
                      : undefined,
                    backgroundColor: preset.preview.boxBg,
                    padding: preset.preview.boxBg ? "1px 4px" : undefined,
                    borderRadius: preset.preview.boxBg ? "2px" : undefined,
                  }}
                >
                  Aa가나
                </span>
              </div>
              <span className="text-[10px] text-neutral-500">
                {t(preset.nameKey)}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* 커스텀 설정 */}
      <div className="space-y-2 rounded-lg border border-neutral-200 p-2 dark:border-neutral-700">
        {/* 폰트 크기 */}
        <div className="flex items-center gap-2">
          <span className="w-16 text-[11px] text-neutral-500">
            {t("fontSize")}
          </span>
          <SliderPrimitive.Root
            value={style.fontSize}
            onValueChange={(v) => {
              setStyle((s) => ({ ...s, fontSize: v as number }));
              setSelectedPreset("custom");
            }}
            min={10}
            max={100}
            step={2}
            className="flex-1"
          >
            <SliderPrimitive.Control className="relative flex h-4 w-full cursor-pointer items-center">
              <SliderPrimitive.Track className="h-1 w-full rounded-full bg-neutral-200 dark:bg-neutral-800">
                <SliderPrimitive.Indicator className="rounded-full bg-primary" />
              </SliderPrimitive.Track>
              <SliderPrimitive.Thumb className="block size-3 rounded-full border-2 border-primary bg-background shadow-sm" />
            </SliderPrimitive.Control>
          </SliderPrimitive.Root>
          <span className="w-8 text-right text-[11px] tabular-nums text-neutral-400">
            {style.fontSize}
          </span>
        </div>

        {/* 위치 */}
        <div className="flex items-center gap-2">
          <span className="w-16 text-[11px] text-neutral-500">
            {t("subtitlePosition")}
          </span>
          <div className="flex gap-1">
            {(["top", "center", "bottom"] as const).map((pos) => (
              <button
                key={pos}
                onClick={() => {
                  setStyle((s) => ({ ...s, position: pos }));
                  setSelectedPreset("custom");
                }}
                className={`rounded px-2 py-0.5 text-[10px] transition-colors ${
                  style.position === pos
                    ? "bg-primary text-primary-foreground"
                    : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700"
                }`}
              >
                {t(`position_${pos}`)}
              </button>
            ))}
          </div>
        </div>

        {/* 색상 */}
        <div className="flex items-center gap-2">
          <span className="w-16 text-[11px] text-neutral-500">
            {t("textColor")}
          </span>
          <div className="flex items-center gap-1">
            {(["white", "black", "#ef4444", "#eab308", "#39ff14", "#3b82f6"] as const).map((c) => (
              <button
                key={c}
                onClick={() => {
                  setStyle((s) => ({ ...s, color: c }));
                  setSelectedPreset("custom");
                }}
                className={`size-5 rounded-full border-2 transition-colors ${
                  style.color === c
                    ? "border-primary"
                    : "border-neutral-300 hover:border-neutral-500 dark:border-neutral-700 dark:hover:border-neutral-500"
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
            <input
              type="color"
              value={style.color.startsWith("#") ? style.color : style.color === "white" ? "#ffffff" : "#000000"}
              onChange={(e) => {
                setStyle((s) => ({ ...s, color: e.target.value }));
                setSelectedPreset("custom");
              }}
              className="size-5 cursor-pointer rounded-full border-2 border-neutral-300 bg-transparent p-0 dark:border-neutral-700"
            />
          </div>
        </div>
      </div>

      {/* 적용 버튼 */}
      <Button
        size="sm"
        variant="outline"
        className="w-full gap-1.5"
        onClick={handleApply}
        disabled={
          !sourceUrl ||
          subtitles.length === 0 ||
          subtitles.every((s) => !s.text.trim()) ||
          subtitlesMutation.isPending
        }
      >
        {subtitlesMutation.isPending ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <MessageCircle className="size-3.5" />
        )}
        {t("applySubtitles")}
      </Button>
    </div>
  );
}
