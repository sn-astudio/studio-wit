"use client";

import { forwardRef, useEffect, useImperativeHandle, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  BarChart3,
  Cctv,
  CircleHelp,
  Download,
  Globe,
  Lock,
  Newspaper,
  Tv,
  Drone,
  Timer,
  Film,
  Video,
  Loader2,
  Plus,
  Save,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/Button";
import { videoEditApi } from "@/services/api";

import type { CreativePresetPanelProps, CreativePresetPanelRef, PresetDefinition } from "./types";

const PRESETS: PresetDefinition[] = [
  {
    id: "camcorder",
    labelKey: "presetCamcorder",
    descKey: "presetCamcorderDesc",
    icon: "camera",
    cssFilter: "saturate(0.85) contrast(1.1) brightness(1.05)",
    fields: [
      { key: "date_text", labelKey: "presetDate", type: "text", defaultValue: "2025.03.28" },
      { key: "cam_name", labelKey: "presetCamName", type: "text", defaultValue: "CAM-01" },
      { key: "text_color", labelKey: "presetTextColor", type: "color", defaultValue: "#ffffff" },
    ],
  },
  {
    id: "vintage_cam",
    labelKey: "presetVintageCam",
    descKey: "presetVintageCamDesc",
    icon: "video",
    cssFilter: "saturate(0.75) contrast(1.15) brightness(1.03) sepia(0.15)",
    fields: [
      { key: "date_text", labelKey: "presetDate", type: "text", defaultValue: "2025.03.28" },
      { key: "text_color", labelKey: "presetTextColor", type: "color", defaultValue: "#ffffff" },
    ],
  },
  {
    id: "cctv",
    labelKey: "presetCctv",
    descKey: "presetCctvDesc",
    icon: "cctv",
    cssFilter: "grayscale(1) contrast(1.3) brightness(0.97)",
    fields: [
      { key: "date_text", labelKey: "presetDate", type: "text", defaultValue: "2025.03.28" },
      { key: "cam_name", labelKey: "presetCamName", type: "text", defaultValue: "CAM-03" },
      { key: "text_color", labelKey: "presetTextColor", type: "color", defaultValue: "#ffffff" },
    ],
  },
  {
    id: "breaking_news",
    labelKey: "presetBreakingNews",
    descKey: "presetBreakingNewsDesc",
    icon: "newspaper",
    fields: [
      { key: "custom_text", labelKey: "presetHeadline", type: "text", defaultValue: "BREAKING NEWS" },
      { key: "text_color", labelKey: "presetTextColor", type: "color", defaultValue: "#ffffff" },
    ],
  },
  {
    id: "old_tv",
    labelKey: "presetOldTv",
    descKey: "presetOldTvDesc",
    icon: "tv",
    cssFilter: "saturate(0.6) contrast(1.2) brightness(1.03) sepia(0.1)",
    fields: [],
  },
  {
    id: "drone_view",
    labelKey: "presetDroneView",
    descKey: "presetDroneViewDesc",
    icon: "navigation",
    fields: [
      { key: "lat", labelKey: "presetLat", type: "text", defaultValue: "37.5665° N" },
      { key: "lng", labelKey: "presetLng", type: "text", defaultValue: "126.9780° E" },
      { key: "alt", labelKey: "presetAlt", type: "text", defaultValue: "120m" },
      { key: "date_text", labelKey: "presetDate", type: "text", defaultValue: "2025.03.28" },
      { key: "text_color", labelKey: "presetTextColor", type: "color", defaultValue: "#ffffff" },
    ],
  },
  {
    id: "countdown",
    labelKey: "presetCountdown",
    descKey: "presetCountdownDesc",
    icon: "timer",
    cssFilter: "saturate(0.5) contrast(1.3)",
    fields: [
      { key: "text_color", labelKey: "presetTextColor", type: "color", defaultValue: "#ffffff" },
    ],
  },
  {
    id: "film_credits",
    labelKey: "presetFilmCredits",
    descKey: "presetFilmCreditsDesc",
    icon: "film",
    fields: [
      { key: "custom_text", labelKey: "presetCreditText", type: "text", defaultValue: "Directed by\nStudio Wit" },
    ],
  },
  {
    id: "poll",
    labelKey: "pollTitle",
    descKey: "pollDesc",
    icon: "vote",
    customUI: true,
    fields: [],
  },
  {
    id: "quiz",
    labelKey: "quizTitle",
    descKey: "quizDesc",
    icon: "message",
    customUI: true,
    fields: [],
  },
];

const ICON_MAP: Record<string, typeof Video> = {
  camera: Video,
  video: Video,
  cctv: Cctv,
  newspaper: Newspaper,
  tv: Tv,
  navigation: Drone,
  timer: Timer,
  film: Film,
  vote: BarChart3,
  message: CircleHelp,
};

// ── 프리뷰 오버레이 렌더러 ──

function RecBlink() {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const id = setInterval(() => setVisible((v) => !v), 750);
    return () => clearInterval(id);
  }, []);
  return visible ? (
    <span className="font-mono text-sm font-bold text-red-500 drop-shadow-md">● REC</span>
  ) : <span className="text-sm">&nbsp;</span>;
}

function RunningTimecode({ color = "#ffffff" }: { color?: string }) {
  const [sec, setSec] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setSec((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);
  const h = String(Math.floor(sec / 3600)).padStart(2, "0");
  const m = String(Math.floor((sec % 3600) / 60)).padStart(2, "0");
  const s = String(sec % 60).padStart(2, "0");
  return <span className="font-mono text-xs drop-shadow-md" style={{ color }}>{h}:{m}:{s}</span>;
}

function buildOverlay(presetId: string, fields: Record<string, string>) {
  const date = fields.date_text || "2025.03.28";
  const cam = fields.cam_name || "CAM-01";
  const headline = fields.custom_text || "BREAKING NEWS";
  const lat = fields.lat || "37.5665° N";
  const lng = fields.lng || "126.9780° E";
  const alt = fields.alt || "120m";
  const tc = fields.text_color || "#ffffff";

  switch (presetId) {
    case "camcorder":
      return (
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 rounded-lg shadow-[inset_0_0_80px_rgba(0,0,0,0.5)]" />
          <div className="absolute left-4 top-3"><RecBlink /></div>
          <div className="absolute right-4 top-3"><RunningTimecode color={tc} /></div>
          <div className="absolute bottom-4 left-4">
            <span className="font-mono text-xs drop-shadow-md" style={{ color: tc, opacity: 0.8 }}>{date}</span>
          </div>
          <div className="absolute bottom-4 right-4">
            <span className="font-mono text-xs drop-shadow-md" style={{ color: tc, opacity: 0.8 }}>{cam}</span>
          </div>
        </div>
      );

    case "vintage_cam":
      return (
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 rounded-lg shadow-[inset_0_0_60px_rgba(0,0,0,0.45)]" />
          <div className="absolute left-3 top-2"><RecBlink /></div>
          <div className="absolute right-3 top-2"><RunningTimecode color={tc} /></div>
          <div className="absolute right-3 top-7">
            <span className="font-mono text-[10px] text-yellow-300 drop-shadow-md">SP</span>
          </div>
          <div className="absolute bottom-3 left-3">
            <span className="font-mono text-xs drop-shadow-md" style={{ color: tc, opacity: 0.9 }}>{date}</span>
          </div>
        </div>
      );

    case "cctv":
      return (
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-3 top-2">
            <span className="font-mono text-xs drop-shadow-md" style={{ color: tc }}>{date}  <RunningTimecode color={tc} /></span>
          </div>
          <div className="absolute right-3 top-2">
            <span className="font-mono text-xs drop-shadow-md" style={{ color: tc }}>{cam}</span>
          </div>
        </div>
      );

    case "breaking_news":
      return (
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-0 top-0 h-[3px] w-full bg-red-600" />
          <div className="absolute right-3 top-2 rounded bg-red-600 px-2 py-0.5">
            <span className="font-mono text-xs font-bold" style={{ color: tc }}>LIVE</span>
          </div>
          <div className="absolute bottom-0 left-0 flex h-14 w-full items-center bg-red-700/85 px-4">
            <span className="mr-4 text-sm font-bold" style={{ color: tc }}>BREAKING</span>
            <span className="text-xs" style={{ color: tc }}>{headline}</span>
          </div>
          <div className="absolute bottom-[3px] left-3">
            <span className="font-mono text-[10px]" style={{ color: tc, opacity: 0.7 }}><RunningTimecode color={tc} /></span>
          </div>
        </div>
      );

    case "old_tv":
      return (
        <div className="pointer-events-none absolute inset-0">
          {/* 비네팅 */}
          <div className="absolute inset-0 rounded-lg shadow-[inset_0_0_80px_rgba(0,0,0,0.5)]" />
          {/* 스캔라인 흉내 */}
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.3) 2px, rgba(0,0,0,0.3) 4px)",
            }}
          />
        </div>
      );

    case "drone_view":
      return (
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute bottom-10 left-3">
            <span className="font-mono text-xs drop-shadow-md" style={{ color: tc }}>{lat}  {lng}</span>
          </div>
          <div className="absolute bottom-5 left-3">
            <span className="font-mono text-xs drop-shadow-md" style={{ color: tc }}>ALT {alt}</span>
          </div>
          <div className="absolute right-3 top-2">
            <span className="font-mono text-xs text-green-400 drop-shadow-md">BAT 87%</span>
          </div>
          <div className="absolute bottom-5 right-3"><RunningTimecode color={tc} /></div>
          <div className="absolute bottom-10 right-3">
            <span className="font-mono text-[10px] drop-shadow-md" style={{ color: tc, opacity: 0.7 }}>{date}</span>
          </div>
        </div>
      );

    case "countdown":
      return (
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 rounded-lg shadow-[inset_0_0_60px_rgba(0,0,0,0.4)]" />
          <CountdownOverlay color={tc} />
        </div>
      );

    case "film_credits": {
      const lines = (fields.custom_text || "Directed by\nStudio Wit").split("\\n").join("\n").split("\n");
      return (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            {lines.map((line, i) => (
              <div key={i} className="text-lg font-light drop-shadow-md" style={{ color: tc }}>{line}</div>
            ))}
          </div>
        </div>
      );
    }

    default:
      return null;
  }
}

function CountdownOverlay({ color = "#ffffff" }: { color?: string }) {
  const [num, setNum] = useState(3);
  useEffect(() => {
    const id = setInterval(() => setNum((n) => (n <= 1 ? 3 : n - 1)), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <span className="font-mono text-6xl font-bold drop-shadow-lg" style={{ color }}>{num}</span>
    </div>
  );
}

// ── 메인 컴포넌트 ──

export const CreativePresetPanel = forwardRef<CreativePresetPanelRef, CreativePresetPanelProps>(function CreativePresetPanel({ sourceUrl, onApplied, onPreviewOverlay, onPreviewFilter, onSave, onStateChange }, ref) {
  const t = useTranslations("VideoEdit");
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [isPublicSave, setIsPublicSave] = useState(false);
  const [saving, setSaving] = useState(false);

  // 투표 상태 (다중 질문 세트)
  const [pollQuestions, setPollQuestions] = useState([
    { question: "", option_a: "", option_b: "", start: 0, end: 5 },
  ]);
  const [pollLoading, setPollLoading] = useState(false);

  // 퀴즈 상태 (다중 질문 세트)
  const [quizQuestions, setQuizQuestions] = useState([
    { question: "", choices: ["", ""], answer_index: 0, start: 0, end: 10, reveal_after: 5 },
  ]);
  const [quizLoading, setQuizLoading] = useState(false);

  const preset = PRESETS.find((p) => p.id === selectedPreset);

  // 프리뷰 업데이트
  const updatePreview = useCallback((presetId: string | null, fields: Record<string, string>) => {
    if (!presetId) {
      onPreviewOverlay?.(null);
      onPreviewFilter?.("");
      return;
    }
    const p = PRESETS.find((pr) => pr.id === presetId);
    onPreviewOverlay?.(buildOverlay(presetId, fields));
    onPreviewFilter?.(p?.cssFilter || "");
  }, [onPreviewOverlay, onPreviewFilter]);

  const handleSelect = (presetId: string) => {
    if (selectedPreset === presetId) {
      setSelectedPreset(null);
      setFieldValues({});
      updatePreview(null, {});
      return;
    }
    setSelectedPreset(presetId);
    const p = PRESETS.find((pr) => pr.id === presetId);
    if (p) {
      const defaults: Record<string, string> = {};
      for (const f of p.fields) {
        defaults[f.key] = f.defaultValue;
      }
      setFieldValues(defaults);
      updatePreview(presetId, defaults);
    }
  };

  const handleFieldChange = (key: string, value: string) => {
    const next = { ...fieldValues, [key]: value };
    setFieldValues(next);
    if (selectedPreset) updatePreview(selectedPreset, next);
  };

  // 언마운트 시 프리뷰 클리어
  useEffect(() => {
    return () => {
      onPreviewOverlay?.(null);
      onPreviewFilter?.("");
    };
  }, [onPreviewOverlay, onPreviewFilter]);

  const handleApply = async () => {
    if (!sourceUrl || !selectedPreset) return;
    setLoading(true);
    try {
      const res = await videoEditApi.creativePreset({
        source_url: sourceUrl,
        preset: selectedPreset,
        params: fieldValues,
      });
      // 적용 성공 시 프리뷰 클리어
      onPreviewOverlay?.(null);
      onPreviewFilter?.("");
      setResultUrl(res.result_url);
      onApplied?.(res.result_url);
    } catch {
      toast.error(t("presetError"));
    } finally {
      setLoading(false);
    }
  };

  const handleReset = useCallback(() => {
    setSelectedPreset(null);
    setFieldValues({});
    setResultUrl(null);
    updatePreview(null, {});
  }, [updatePreview]);

  const isPending = loading || pollLoading || quizLoading;

  useImperativeHandle(ref, () => ({
    reset: handleReset,
    apply: handleApply,
  }));

  useEffect(() => {
    onStateChange?.({ canApply: !!selectedPreset && !isPending, isPending });
  }, [selectedPreset, isPending, onStateChange]);

  // 투표 질문 세트 관리
  const addPollQuestion = () => {
    const last = pollQuestions[pollQuestions.length - 1];
    setPollQuestions([
      ...pollQuestions,
      { question: "", option_a: "", option_b: "", start: last.end, end: last.end + 5 },
    ]);
  };

  const removePollQuestion = (idx: number) => {
    if (pollQuestions.length <= 1) return;
    setPollQuestions(pollQuestions.filter((_, i) => i !== idx));
  };

  const updatePollQuestion = (idx: number, field: string, value: string | number) => {
    const next = [...pollQuestions];
    next[idx] = { ...next[idx], [field]: value };
    setPollQuestions(next);
  };

  // 투표 적용
  const handlePoll = async () => {
    if (!sourceUrl) return;
    const invalid = pollQuestions.some((q) => !q.question || !q.option_a || !q.option_b);
    if (invalid) {
      toast.error(t("interactiveFillAll"));
      return;
    }
    setPollLoading(true);
    try {
      const res = await videoEditApi.pollOverlay({
        source_url: sourceUrl,
        questions: pollQuestions,
      });
      setResultUrl(res.result_url);
      onApplied?.(res.result_url);
      toast.success(t("pollSuccess"));
    } catch {
      toast.error(t("pollError"));
    } finally {
      setPollLoading(false);
    }
  };

  // 퀴즈 질문 세트 관리
  const addQuizQuestion = () => {
    const last = quizQuestions[quizQuestions.length - 1];
    setQuizQuestions([
      ...quizQuestions,
      { question: "", choices: ["", ""], answer_index: 0, start: last.end, end: last.end + 10, reveal_after: 5 },
    ]);
  };

  const removeQuizQuestion = (idx: number) => {
    if (quizQuestions.length <= 1) return;
    setQuizQuestions(quizQuestions.filter((_, i) => i !== idx));
  };

  const updateQuizQuestion = (idx: number, field: string, value: unknown) => {
    const next = [...quizQuestions];
    next[idx] = { ...next[idx], [field]: value };
    setQuizQuestions(next);
  };

  // 퀴즈 적용
  const handleQuiz = async () => {
    if (!sourceUrl) return;
    const invalid = quizQuestions.some((q) => !q.question || q.choices.some((c) => !c.trim()));
    if (invalid) {
      toast.error(t("interactiveFillAll"));
      return;
    }
    setQuizLoading(true);
    try {
      const res = await videoEditApi.quizOverlay({
        source_url: sourceUrl,
        questions: quizQuestions,
      });
      setResultUrl(res.result_url);
      onApplied?.(res.result_url);
      toast.success(t("quizSuccess"));
    } catch {
      toast.error(t("quizError"));
    } finally {
      setQuizLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* 프리셋 선택 그리드 */}
      <div>
        <p className="mb-3 text-[13px] font-[600] text-foreground">{t("tabCreative")}</p>
        <div className="grid grid-cols-4 gap-2">
          {PRESETS.map((p) => {
            const Icon = ICON_MAP[p.icon] ?? Video;
            const isActive = selectedPreset === p.id;
            return (
              <button
                key={p.id}
                onClick={() => handleSelect(p.id)}
                className={`flex cursor-pointer flex-col items-center gap-2 rounded-lg py-3.5 text-[12px] font-[500] transition-all active:opacity-80 ${
                  isActive
                    ? "bg-foreground text-background"
                    : "bg-neutral-50 text-muted-foreground hover:bg-neutral-100 hover:text-foreground dark:bg-neutral-800/60 dark:hover:bg-neutral-800 dark:hover:text-white"
                }`}
              >
                <Icon className="size-5" strokeWidth={1.5} />
                {t(p.labelKey)}
              </button>
            );
          })}
        </div>
      </div>

      {/* 선택된 프리셋 커스텀 필드 */}
      {preset && preset.fields.length > 0 && (
        <div className="space-y-3">
          <p className="text-[13px] font-[600] text-foreground">{t("presetCustomize")}</p>
          {preset.fields.map((f) => (
            <div key={f.key} className="space-y-2">
              <label className="text-[12px] font-[500] text-muted-foreground">{t(f.labelKey)}</label>
              {f.type === "color" ? (
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={fieldValues[f.key] ?? f.defaultValue}
                    onChange={(e) => handleFieldChange(f.key, e.target.value)}
                    className="size-9 cursor-pointer rounded-lg border-0 bg-transparent p-0.5"
                  />
                  <input
                    value={fieldValues[f.key] ?? f.defaultValue}
                    onChange={(e) => handleFieldChange(f.key, e.target.value)}
                    placeholder="#ffffff"
                    className="w-full rounded-lg bg-neutral-50 px-3 py-2 font-mono text-[13px] text-foreground outline-none dark:bg-neutral-800/60"
                  />
                </div>
              ) : (
                <input
                  value={fieldValues[f.key] ?? f.defaultValue}
                  onChange={(e) => handleFieldChange(f.key, e.target.value)}
                  className="w-full rounded-lg bg-neutral-50 px-3 py-2 text-[13px] text-foreground outline-none dark:bg-neutral-800/60"
                />
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── A/B 투표 (다중 질문 세트) ── */}
      {selectedPreset === "poll" && (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-[13px] font-[600] text-foreground">{t("pollTitle")}</p>
          <span className="text-[11px] text-muted-foreground/50">{pollQuestions.length}개 질문</span>
        </div>

        <div className="space-y-2.5">
          {pollQuestions.map((q, idx) => (
            <div key={idx} className="space-y-2 rounded-xl bg-neutral-50 p-3 dark:bg-neutral-800/60">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-[600] text-muted-foreground">질문 {idx + 1}</span>
                {pollQuestions.length > 1 && (
                  <button type="button" onClick={() => removePollQuestion(idx)} className="cursor-pointer text-muted-foreground/40 hover:text-red-400">
                    <X className="size-3.5" />
                  </button>
                )}
              </div>
              <input
                value={q.question}
                onChange={(e) => updatePollQuestion(idx, "question", e.target.value)}
                placeholder={t("pollQuestionPlaceholder")}
                className="w-full rounded-lg bg-white px-3 py-2 text-[13px] text-foreground outline-none dark:bg-neutral-900/80"
              />
              <div className="flex gap-2">
                <input
                  value={q.option_a}
                  onChange={(e) => updatePollQuestion(idx, "option_a", e.target.value)}
                  placeholder={t("pollOptionA")}
                  className="w-full flex-1 rounded-lg bg-white px-3 py-2 text-[13px] text-foreground outline-none dark:bg-neutral-900/80"
                />
                <input
                  value={q.option_b}
                  onChange={(e) => updatePollQuestion(idx, "option_b", e.target.value)}
                  placeholder={t("pollOptionB")}
                  className="w-full flex-1 rounded-lg bg-white px-3 py-2 text-[13px] text-foreground outline-none dark:bg-neutral-900/80"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <label className="shrink-0 text-[11px] text-muted-foreground">시작</label>
                <input type="number" min={0} step={0.5} value={q.start}
                  onChange={(e) => updatePollQuestion(idx, "start", Number(e.target.value))}
                  className="w-0 min-w-0 flex-1 rounded-lg bg-white px-2 py-1.5 text-[12px] tabular-nums text-foreground outline-none dark:bg-neutral-900/80" />
                <label className="shrink-0 text-[11px] text-muted-foreground">종료</label>
                <input type="number" min={0} step={0.5} value={q.end}
                  onChange={(e) => updatePollQuestion(idx, "end", Number(e.target.value))}
                  className="w-0 min-w-0 flex-1 rounded-lg bg-white px-2 py-1.5 text-[12px] tabular-nums text-foreground outline-none dark:bg-neutral-900/80" />
              </div>
            </div>
          ))}
        </div>

        <button onClick={addPollQuestion} className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-neutral-50 py-2.5 text-[12px] font-[500] text-muted-foreground transition-colors hover:bg-neutral-100 hover:text-foreground dark:bg-neutral-800/60 dark:hover:bg-neutral-800 dark:hover:text-white">
          <Plus className="size-3.5" />
          질문 추가
        </button>
      </div>
      )}

      {/* ── 퀴즈 ── */}
      {selectedPreset === "quiz" && (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-[13px] font-[600] text-foreground">{t("quizTitle")}</p>
          <span className="text-[11px] text-muted-foreground/50">{quizQuestions.length}개 퀴즈</span>
        </div>

        <div className="space-y-2.5">
          {quizQuestions.map((q, qIdx) => (
            <div key={qIdx} className="space-y-2 rounded-xl bg-neutral-50 p-3 dark:bg-neutral-800/60">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-[600] text-muted-foreground">퀴즈 {qIdx + 1}</span>
                {quizQuestions.length > 1 && (
                  <button type="button" onClick={() => removeQuizQuestion(qIdx)} className="cursor-pointer text-muted-foreground/40 hover:text-red-400">
                    <X className="size-3.5" />
                  </button>
                )}
              </div>
              <input
                value={q.question}
                onChange={(e) => updateQuizQuestion(qIdx, "question", e.target.value)}
                placeholder={t("quizQuestionPlaceholder")}
                className="w-full rounded-lg bg-white px-3 py-2 text-[13px] text-foreground outline-none dark:bg-neutral-900/80"
              />

              {/* 보기 */}
              <div className="space-y-1.5">
                {q.choices.map((c, cIdx) => (
                  <div key={cIdx} className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => updateQuizQuestion(qIdx, "answer_index", cIdx)}
                      className={`flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-md text-[10px] font-[700] transition-colors ${
                        q.answer_index === cIdx
                          ? "bg-green-500 text-white"
                          : "bg-neutral-200 text-neutral-500 dark:bg-neutral-700 dark:text-neutral-400"
                      }`}
                    >
                      {["A", "B", "C", "D"][cIdx]}
                    </button>
                    <input
                      value={c}
                      onChange={(e) => {
                        const next = [...q.choices];
                        next[cIdx] = e.target.value;
                        updateQuizQuestion(qIdx, "choices", next);
                      }}
                      placeholder={`${t("quizChoice")} ${cIdx + 1}`}
                      className="w-full flex-1 rounded-lg bg-white px-3 py-1.5 text-[12px] text-foreground outline-none dark:bg-neutral-900/80"
                    />
                    {q.choices.length > 2 && (
                      <button type="button" onClick={() => {
                        const next = q.choices.filter((_, i) => i !== cIdx);
                        updateQuizQuestion(qIdx, "choices", next);
                        if (q.answer_index >= next.length) updateQuizQuestion(qIdx, "answer_index", 0);
                      }} className="cursor-pointer text-muted-foreground/40 hover:text-red-400">
                        <X className="size-3" />
                      </button>
                    )}
                  </div>
                ))}
                {q.choices.length < 4 && (
                  <button type="button" onClick={() => updateQuizQuestion(qIdx, "choices", [...q.choices, ""])}
                    className="cursor-pointer text-[11px] font-[500] text-primary hover:opacity-80">
                    + 보기 추가
                  </button>
                )}
              </div>

              {/* 시간 + 정답 공개 */}
              <div className="flex items-center gap-1.5">
                <label className="shrink-0 text-[11px] text-muted-foreground">시작</label>
                <input type="number" min={0} step={0.5} value={q.start}
                  onChange={(e) => updateQuizQuestion(qIdx, "start", Number(e.target.value))}
                  className="w-0 min-w-0 flex-1 rounded-lg bg-white px-2 py-1.5 text-[12px] tabular-nums text-foreground outline-none dark:bg-neutral-900/80" />
                <label className="shrink-0 text-[11px] text-muted-foreground">종료</label>
                <input type="number" min={0} step={0.5} value={q.end}
                  onChange={(e) => updateQuizQuestion(qIdx, "end", Number(e.target.value))}
                  className="w-0 min-w-0 flex-1 rounded-lg bg-white px-2 py-1.5 text-[12px] tabular-nums text-foreground outline-none dark:bg-neutral-900/80" />
                <label className="shrink-0 text-[11px] text-muted-foreground">정답</label>
                <input type="number" min={1} value={q.reveal_after}
                  onChange={(e) => updateQuizQuestion(qIdx, "reveal_after", Number(e.target.value))}
                  className="w-0 min-w-0 flex-1 rounded-lg bg-white px-2 py-1.5 text-[12px] tabular-nums text-foreground outline-none dark:bg-neutral-900/80" />
              </div>
            </div>
          ))}
        </div>

        <button onClick={addQuizQuestion} className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-neutral-50 py-2.5 text-[12px] font-[500] text-muted-foreground transition-colors hover:bg-neutral-100 hover:text-foreground dark:bg-neutral-800/60 dark:hover:bg-neutral-800 dark:hover:text-white">
          <Plus className="size-3.5" />
          퀴즈 추가
        </button>
      </div>
      )}

    </div>
  );
});
