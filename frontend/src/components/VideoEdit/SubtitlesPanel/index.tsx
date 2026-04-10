"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from "react";
import {
  FileUp,
  MessageCircle,
  Plus,
  Trash2,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { useNotifyOnComplete } from "@/hooks/useNotifyOnComplete";
import { useSubtitlesVideo } from "@/hooks/queries/useVideoEdit";

import type { SubtitlesPanelProps, SubtitlesPanelRef } from "./types";

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
    style: { fontSize: 36, color: "white", borderW: 2, borderColor: "black@0.6", boxColor: null, position: "bottom" },
    preview: { bg: "transparent", text: "#ffffff", border: "#000000" },
  },
  {
    id: "youtube",
    nameKey: "presetYoutube",
    style: { fontSize: 42, color: "yellow", borderW: 3, borderColor: "black@0.8", boxColor: null, position: "bottom" },
    preview: { bg: "transparent", text: "#eab308", border: "#000000" },
  },
  {
    id: "news",
    nameKey: "presetNews",
    style: { fontSize: 32, color: "white", borderW: 0, borderColor: "black@0", boxColor: "black@0.7", position: "bottom" },
    preview: { bg: "transparent", text: "#ffffff", border: "transparent", boxBg: "rgba(0,0,0,0.7)" },
  },
  {
    id: "neon",
    nameKey: "presetNeon",
    style: { fontSize: 40, color: "#39ff14", borderW: 2, borderColor: "#ff00ff@0.8", boxColor: null, position: "center" },
    preview: { bg: "transparent", text: "#39ff14", border: "#ff00ff" },
  },
  {
    id: "minimal",
    nameKey: "presetMinimal",
    style: { fontSize: 24, color: "white", borderW: 0, borderColor: "black@0", boxColor: "black@0.4", position: "bottom" },
    preview: { bg: "transparent", text: "#ffffff", border: "transparent", boxBg: "rgba(0,0,0,0.4)" },
  },
  {
    id: "shorts",
    nameKey: "presetShorts",
    style: { fontSize: 52, color: "white", borderW: 4, borderColor: "#eab308@0.9", boxColor: null, position: "center" },
    preview: { bg: "transparent", text: "#ffffff", border: "#eab308" },
  },
];

const COLOR_PRESETS = ["white", "black", "#ef4444", "#eab308", "#39ff14", "#3b82f6"] as const;

let nextId = Date.now();

/** SRT 타임코드 "HH:MM:SS,mmm" 또는 VTT "HH:MM:SS.mmm" → 초 */
function parseTimecode(tc: string): number {
  const cleaned = tc.trim().replace(",", ".");
  const parts = cleaned.split(":");
  if (parts.length === 3) return parseFloat(parts[0]) * 3600 + parseFloat(parts[1]) * 60 + parseFloat(parts[2]);
  if (parts.length === 2) return parseFloat(parts[0]) * 60 + parseFloat(parts[1]);
  return parseFloat(cleaned) || 0;
}

/** SRT/VTT 파일 텍스트를 SubtitleEntry 배열로 파싱 */
function parseSubtitleFile(content: string): SubtitleEntry[] {
  const entries: SubtitleEntry[] = [];
  const blocks = content.split(/\n\s*\n/).filter((b) => b.trim());
  for (const block of blocks) {
    const lines = block.trim().split("\n");
    if (lines[0]?.trim() === "WEBVTT") continue;
    const timeLine = lines.find((l) => l.includes("-->"));
    if (!timeLine) continue;
    const [startStr, endStr] = timeLine.split("-->").map((s) => s.trim());
    const startTime = parseTimecode(startStr);
    const endTime = parseTimecode(endStr);
    const timeIdx = lines.indexOf(timeLine);
    const text = lines.slice(timeIdx + 1).join("\n").replace(/<[^>]+>/g, "").trim();
    if (text) {
      entries.push({ id: String(nextId++), text, startTime: String(startTime), endTime: String(endTime) });
    }
  }
  return entries;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export const SubtitlesPanel = forwardRef<SubtitlesPanelRef, SubtitlesPanelProps>(function SubtitlesPanel({
  sourceUrl,
  duration,
  onSubtitlesApplied,
  onPreviewSubtitles,
  onDirty,
  onStateChange,
}, ref) {
  const t = useTranslations("VideoEdit");
  const notify = useNotifyOnComplete();

  const [subtitles, setSubtitles] = useState<SubtitleEntry[]>([]);
  const [selectedPreset, setSelectedPreset] = useState("default");
  const [style, setStyle] = useState<SubtitleStyle>(STYLE_PRESETS[0].style);

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

  const canApply = !!sourceUrl && subtitles.length > 0 && subtitles.some((s) => s.text.trim()) && !subtitlesMutation.isPending;

  const handleReset = useCallback(() => {
    setSubtitles([]);
    setSelectedPreset("default");
    setStyle(STYLE_PRESETS[0].style);
    onPreviewSubtitles?.([]);
  }, [onPreviewSubtitles]);

  useEffect(() => {
    onStateChange?.({ canApply, isPending: subtitlesMutation.isPending });
  }, [canApply, subtitlesMutation.isPending, onStateChange]);

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
      { id: newId, text: "", startTime: "0", endTime: String(Math.min(5, duration)) },
    ]);
    onDirty?.();
    requestAnimationFrame(() => {
      const el = document.querySelector<HTMLInputElement>(`[data-subtitle-id="${newId}"]`);
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
      setSubtitles((prev) => prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
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
    } catch {
      toast.error(t("subtitlesError"));
    }
  }, [sourceUrl, subtitles, style, subtitlesMutation, onSubtitlesApplied, onPreviewSubtitles, t, notify]);

  useImperativeHandle(ref, () => ({ reset: handleReset, apply: handleApply }), [handleReset, handleApply]);

  return (
    <div className="flex flex-1 flex-col gap-5">
      {/* 자막 추가 */}
      <div className="space-y-2.5">
        <p className="text-[13px] font-[600] text-foreground">{t("addSubtitle")}</p>
      {subtitles.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl bg-neutral-50 py-8 dark:bg-neutral-800/60">
          <MessageCircle className="size-6 text-muted-foreground/40" />
          <span className="text-[12px] text-muted-foreground/60">{t("noSubtitles")}</span>
        </div>
      ) : (
        <div className="space-y-2">
          {subtitles.map((sub, idx) => (
            <div
              key={sub.id}
              className="space-y-1.5 rounded-xl bg-neutral-50 p-3 dark:bg-neutral-800/60"
            >
              <div className="flex items-center gap-1.5">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-md bg-foreground text-[10px] font-[600] text-background">
                  {idx + 1}
                </span>
                <input
                  data-subtitle-id={sub.id}
                  value={sub.text}
                  onChange={(e) => handleUpdate(sub.id, "text", e.target.value)}
                  placeholder={t("subtitleText")}
                  maxLength={200}
                  className="h-8 flex-1 rounded-lg bg-white px-2.5 text-[12px] text-foreground placeholder:text-muted-foreground/40 focus:outline-none dark:bg-neutral-900/60"
                />
                <button
                  onClick={() => handleRemove(sub.id)}
                  className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-lg text-muted-foreground/40 transition-colors hover:text-red-500"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
              <div className="flex items-center gap-1.5 pl-6">
                <span className="text-[11px] text-muted-foreground/60">{t("subtitleStartTime")}</span>
                <input
                  type="number"
                  value={sub.startTime}
                  onChange={(e) => handleUpdate(sub.id, "startTime", e.target.value)}
                  className="h-6 w-14 rounded-md bg-white px-1.5 text-center text-[11px] tabular-nums text-foreground focus:outline-none dark:bg-neutral-900/60"
                  min={0}
                  max={duration}
                  step={0.1}
                />
                <span className="text-[11px] text-muted-foreground/60">{t("subtitleEndTime")}</span>
                <input
                  type="number"
                  value={sub.endTime}
                  onChange={(e) => handleUpdate(sub.id, "endTime", e.target.value)}
                  className="h-6 w-14 rounded-md bg-white px-1.5 text-center text-[11px] tabular-nums text-foreground focus:outline-none dark:bg-neutral-900/60"
                  min={0}
                  max={duration}
                  step={0.1}
                />
                <span className="ml-auto text-[10px] tabular-nums text-muted-foreground/40">
                  {formatTime(parseFloat(sub.startTime) || 0)} – {formatTime(parseFloat(sub.endTime) || 0)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 자막 추가 / 파일 업로드 */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={handleAdd}
          className="flex cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-neutral-50 py-2.5 text-[12px] font-[500] text-muted-foreground transition-all hover:bg-neutral-100 hover:text-foreground active:opacity-80 dark:bg-neutral-800/60 dark:hover:bg-neutral-800 dark:hover:text-white"
        >
          <Plus className="size-4" strokeWidth={1.5} />
          {t("addSubtitle")}
        </button>
        <label className="flex cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-neutral-50 py-2.5 text-[12px] font-[500] text-muted-foreground transition-all hover:bg-neutral-100 hover:text-foreground active:opacity-80 dark:bg-neutral-800/60 dark:hover:bg-neutral-800 dark:hover:text-white">
          <FileUp className="size-4" strokeWidth={1.5} />
          {t("uploadSubtitleFile")}
          <input type="file" accept=".srt,.vtt,.txt" className="hidden" onChange={handleFileUpload} />
        </label>
      </div>
      </div>

      {/* 스타일 프리셋 */}
      <div className="space-y-2.5">
        <p className="text-[13px] font-[600] text-foreground">{t("subtitleStylePreset")}</p>
        <div className="grid grid-cols-3 gap-2">
          {STYLE_PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => handlePresetSelect(preset.id)}
              className={`flex cursor-pointer flex-col items-center gap-1.5 rounded-lg py-2.5 text-[11px] font-[500] transition-all active:opacity-80 ${
                selectedPreset === preset.id
                  ? "bg-foreground text-background"
                  : "bg-neutral-50 text-muted-foreground hover:bg-neutral-100 hover:text-foreground dark:bg-neutral-800/60 dark:hover:bg-neutral-800 dark:hover:text-white"
              }`}
            >
              <div className="flex h-6 items-center justify-center">
                <span
                  className="truncate text-[10px] font-bold leading-none"
                  style={{
                    color: selectedPreset === preset.id ? "inherit" : preset.preview.text,
                    WebkitTextStroke: preset.preview.border !== "transparent" && selectedPreset !== preset.id
                      ? `1px ${preset.preview.border}` : undefined,
                    backgroundColor: preset.preview.boxBg && selectedPreset !== preset.id ? preset.preview.boxBg : undefined,
                    padding: preset.preview.boxBg ? "1px 4px" : undefined,
                    borderRadius: preset.preview.boxBg ? "2px" : undefined,
                  }}
                >
                  Aa가나
                </span>
              </div>
              {t(preset.nameKey)}
            </button>
          ))}
        </div>
      </div>

      {/* 커스텀 설정 */}
      <div className="space-y-4">
        {/* 폰트 크기 */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-[600] text-foreground">{t("fontSize")}</span>
            <span className="text-[12px] font-[500] tabular-nums text-muted-foreground">{style.fontSize}px</span>
          </div>
          <input
            type="range"
            min={10}
            max={100}
            step={2}
            value={style.fontSize}
            onChange={(e) => {
              setStyle((s) => ({ ...s, fontSize: Number(e.target.value) }));
              setSelectedPreset("custom");
            }}
            className="filter-slider h-1.5 w-full cursor-pointer appearance-none rounded-full bg-neutral-300 accent-white dark:bg-neutral-700"
            style={{ "--slider-pct": `${((style.fontSize - 10) / 90) * 100}%` } as React.CSSProperties}
          />
        </div>

        {/* 위치 */}
        <div className="space-y-2.5">
          <p className="text-[13px] font-[600] text-foreground">{t("subtitlePosition")}</p>
          <div className="flex flex-wrap gap-2">
            {(["top", "center", "bottom"] as const).map((pos) => (
              <button
                key={pos}
                onClick={() => {
                  setStyle((s) => ({ ...s, position: pos }));
                  setSelectedPreset("custom");
                }}
                className={`cursor-pointer rounded-lg px-3.5 py-2 text-[12px] font-[500] transition-all active:opacity-80 ${
                  style.position === pos
                    ? "bg-foreground text-background"
                    : "bg-neutral-50 text-muted-foreground hover:bg-neutral-100 hover:text-foreground dark:bg-neutral-800/60 dark:hover:bg-neutral-800 dark:hover:text-white"
                }`}
              >
                {t(`position_${pos}`)}
              </button>
            ))}
          </div>
        </div>

        {/* 색상 */}
        <div className="space-y-2.5">
          <p className="text-[13px] font-[600] text-foreground">{t("textColor")}</p>
          <div className="flex items-center gap-2">
            {COLOR_PRESETS.map((c) => (
              <button
                key={c}
                onClick={() => {
                  setStyle((s) => ({ ...s, color: c }));
                  setSelectedPreset("custom");
                }}
                className={`size-7 cursor-pointer rounded-full border-2 transition-all ${
                  style.color === c
                    ? "border-foreground scale-110"
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
              className="size-7 cursor-pointer rounded-full border-2 border-neutral-300 bg-transparent p-0 dark:border-neutral-700"
            />
          </div>
        </div>
      </div>

    </div>
  );
});
