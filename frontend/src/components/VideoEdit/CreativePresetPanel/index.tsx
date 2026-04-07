"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  Camera,
  Cctv,
  Download,
  Globe,
  Lock,
  Newspaper,
  Tv,
  Navigation,
  Timer,
  Film,
  Video,
  Loader2,
  MessageSquare,
  Plus,
  Save,
  Vote,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
} from "@/components/ui/Select";
import { videoEditApi } from "@/services/api";

import type { CreativePresetPanelProps, PresetDefinition } from "./types";

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

const ICON_MAP: Record<string, typeof Camera> = {
  camera: Camera,
  video: Video,
  cctv: Cctv,
  newspaper: Newspaper,
  tv: Tv,
  navigation: Navigation,
  timer: Timer,
  film: Film,
  vote: Vote,
  message: MessageSquare,
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

export function CreativePresetPanel({ sourceUrl, onApplied, onPreviewOverlay, onPreviewFilter, onSave }: CreativePresetPanelProps) {
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
      toast.success(t("presetApplied"));
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
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">{t("presetDescription")}</p>
      <p className="rounded-md bg-amber-50 px-2.5 py-1.5 text-xs font-medium text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">⚠ {t("presetPreviewDisclaimer")}</p>

      {/* 프리셋 선택: 미선택 시 그리드, 선택 후 셀렉트 박스 */}
      {!selectedPreset ? (
        <div className="grid grid-cols-2 gap-2">
          {PRESETS.map((p) => {
            const Icon = ICON_MAP[p.icon] ?? Camera;
            return (
              <button
                key={p.id}
                onClick={() => handleSelect(p.id)}
                className="flex flex-col items-center gap-1.5 rounded-lg border border-border bg-card p-3 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
              >
                <Icon className="size-5" />
                <span className="font-medium">{t(p.labelKey)}</span>
                <span className="text-[10px] leading-tight opacity-70">{t(p.descKey)}</span>
              </button>
            );
          })}
        </div>
      ) : (
        <Select
          value={selectedPreset}
          onValueChange={(value) => handleSelect(value)}
        >
          <SelectTrigger className="h-9 w-full">
            {(() => {
              const p = PRESETS.find((pr) => pr.id === selectedPreset);
              const Icon = ICON_MAP[p?.icon ?? ""] ?? Camera;
              return (
                <span className="flex items-center gap-2">
                  <Icon className="size-3.5" />
                  {p ? t(p.labelKey) : ""}
                </span>
              );
            })()}
          </SelectTrigger>
          <SelectContent>
            {PRESETS.map((p) => {
              const Icon = ICON_MAP[p.icon] ?? Camera;
              return (
                <SelectItem key={p.id} value={p.id}>
                  <span className="flex items-center gap-2">
                    <Icon className="size-3.5" />
                    {t(p.labelKey)}
                    <span className="text-[10px] text-muted-foreground">{t(p.descKey)}</span>
                  </span>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      )}

      {/* 선택된 프리셋 커스텀 필드 */}
      {preset && preset.fields.length > 0 && (
        <div className="space-y-2 rounded-lg border border-border bg-card p-3">
          <span className="text-xs font-medium">{t("presetCustomize")}</span>
          {preset.fields.map((f) => (
            <div key={f.key} className="space-y-1">
              <label className="text-[11px] text-muted-foreground">{t(f.labelKey)}</label>
              {f.type === "color" ? (
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={fieldValues[f.key] ?? f.defaultValue}
                    onChange={(e) => handleFieldChange(f.key, e.target.value)}
                    className="h-7 w-10 cursor-pointer rounded border border-border bg-transparent p-0.5"
                  />
                  <Input
                    value={fieldValues[f.key] ?? f.defaultValue}
                    onChange={(e) => handleFieldChange(f.key, e.target.value)}
                    placeholder="#ffffff"
                    className="h-7 flex-1 font-mono text-xs"
                  />
                </div>
              ) : (
                <Input
                  value={fieldValues[f.key] ?? f.defaultValue}
                  onChange={(e) => handleFieldChange(f.key, e.target.value)}
                  className="h-7 text-xs"
                />
              )}
            </div>
          ))}
        </div>
      )}

      {/* 적용 버튼 (일반 프리셋만) */}
      {selectedPreset && !preset?.customUI && (
        <Button
          onClick={handleApply}
          disabled={!sourceUrl || !selectedPreset || loading}
          className="w-full"
        >
          {loading ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : null}
          {loading ? t("presetApplying") : t("presetApply")}
        </Button>
      )}

      {/* ── A/B 투표 (다중 질문 세트) ── */}
      {selectedPreset === "poll" && (
      <div className="space-y-2 rounded-lg border border-border p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-medium">
            <Vote className="size-3.5" />
            {t("pollTitle")}
          </div>
          <span className="text-[10px] text-muted-foreground">
            {pollQuestions.length}개 질문
          </span>
        </div>

        <div className="max-h-64 space-y-3 overflow-y-auto">
          {pollQuestions.map((q, idx) => (
            <div key={idx} className="space-y-1.5 rounded-md border border-border/50 bg-muted/30 p-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-medium text-muted-foreground">
                  질문 {idx + 1}
                </span>
                {pollQuestions.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removePollQuestion(idx)}
                    className="text-neutral-400 hover:text-red-500"
                  >
                    <X className="size-3" />
                  </button>
                )}
              </div>
              <Input
                value={q.question}
                onChange={(e) => updatePollQuestion(idx, "question", e.target.value)}
                placeholder={t("pollQuestionPlaceholder")}
                className="h-7 text-xs"
              />
              <div className="flex gap-2">
                <Input
                  value={q.option_a}
                  onChange={(e) => updatePollQuestion(idx, "option_a", e.target.value)}
                  placeholder={t("pollOptionA")}
                  className="h-7 flex-1 text-xs"
                />
                <Input
                  value={q.option_b}
                  onChange={(e) => updatePollQuestion(idx, "option_b", e.target.value)}
                  placeholder={t("pollOptionB")}
                  className="h-7 flex-1 text-xs"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-[10px] text-muted-foreground">시작</label>
                <Input
                  type="number"
                  min={0}
                  step={0.5}
                  value={q.start}
                  onChange={(e) => updatePollQuestion(idx, "start", Number(e.target.value))}
                  className="h-6 w-16 text-[11px]"
                />
                <label className="text-[10px] text-muted-foreground">종료</label>
                <Input
                  type="number"
                  min={0}
                  step={0.5}
                  value={q.end}
                  onChange={(e) => updatePollQuestion(idx, "end", Number(e.target.value))}
                  className="h-6 w-16 text-[11px]"
                />
                <span className="text-[10px] text-muted-foreground">초</span>
              </div>
            </div>
          ))}
        </div>

        <Button
          size="sm"
          variant="outline"
          className="w-full gap-1 text-xs"
          onClick={addPollQuestion}
        >
          <Plus className="size-3" />
          질문 추가
        </Button>

        <Button
          size="sm"
          className="w-full gap-1.5"
          onClick={handlePoll}
          disabled={!sourceUrl || pollLoading}
        >
          {pollLoading ? <Loader2 className="size-3.5 animate-spin" /> : <Vote className="size-3.5" />}
          {t("applyPoll")}
        </Button>
      </div>
      )}

      {/* ── 퀴즈 ── */}
      {selectedPreset === "quiz" && (
      <div className="space-y-2 rounded-lg border border-border p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-medium">
            <MessageSquare className="size-3.5" />
            {t("quizTitle")}
          </div>
          <span className="text-[10px] text-muted-foreground">
            {quizQuestions.length}개 퀴즈
          </span>
        </div>

        <div className="max-h-72 space-y-3 overflow-y-auto">
          {quizQuestions.map((q, qIdx) => (
            <div key={qIdx} className="space-y-1.5 rounded-md border border-border/50 bg-muted/30 p-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-medium text-muted-foreground">
                  퀴즈 {qIdx + 1}
                </span>
                {quizQuestions.length > 1 && (
                  <button type="button" onClick={() => removeQuizQuestion(qIdx)} className="text-neutral-400 hover:text-red-500">
                    <X className="size-3" />
                  </button>
                )}
              </div>
              <Input
                value={q.question}
                onChange={(e) => updateQuizQuestion(qIdx, "question", e.target.value)}
                placeholder={t("quizQuestionPlaceholder")}
                className="h-7 text-xs"
              />

              {/* 보기 */}
              <div className="space-y-1">
                {q.choices.map((c, cIdx) => (
                  <div key={cIdx} className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => updateQuizQuestion(qIdx, "answer_index", cIdx)}
                      className={`flex size-5 shrink-0 items-center justify-center rounded text-[9px] font-bold ${
                        q.answer_index === cIdx
                          ? "bg-green-500 text-white"
                          : "bg-neutral-200 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300"
                      }`}
                    >
                      {["A", "B", "C", "D"][cIdx]}
                    </button>
                    <Input
                      value={c}
                      onChange={(e) => {
                        const next = [...q.choices];
                        next[cIdx] = e.target.value;
                        updateQuizQuestion(qIdx, "choices", next);
                      }}
                      placeholder={`${t("quizChoice")} ${cIdx + 1}`}
                      className="h-6 flex-1 text-[11px]"
                    />
                    {q.choices.length > 2 && (
                      <button
                        type="button"
                        onClick={() => {
                          const next = q.choices.filter((_, i) => i !== cIdx);
                          updateQuizQuestion(qIdx, "choices", next);
                          if (q.answer_index >= next.length) updateQuizQuestion(qIdx, "answer_index", 0);
                        }}
                        className="text-neutral-400 hover:text-red-500"
                      >
                        <X className="size-3" />
                      </button>
                    )}
                  </div>
                ))}
                {q.choices.length < 4 && (
                  <button
                    type="button"
                    onClick={() => updateQuizQuestion(qIdx, "choices", [...q.choices, ""])}
                    className="text-[10px] text-primary hover:underline"
                  >
                    + 보기 추가
                  </button>
                )}
              </div>

              {/* 시간 + 정답 공개 */}
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <label className="text-[10px] text-muted-foreground">시작</label>
                <Input type="number" min={0} step={0.5} value={q.start}
                  onChange={(e) => updateQuizQuestion(qIdx, "start", Number(e.target.value))}
                  className="h-6 w-14 text-[11px]" />
                <label className="text-[10px] text-muted-foreground">종료</label>
                <Input type="number" min={0} step={0.5} value={q.end}
                  onChange={(e) => updateQuizQuestion(qIdx, "end", Number(e.target.value))}
                  className="h-6 w-14 text-[11px]" />
                <label className="text-[10px] text-muted-foreground">정답공개</label>
                <Input type="number" min={1} value={q.reveal_after}
                  onChange={(e) => updateQuizQuestion(qIdx, "reveal_after", Number(e.target.value))}
                  className="h-6 w-14 text-[11px]" />
                <span className="text-[10px] text-muted-foreground">초</span>
              </div>
            </div>
          ))}
        </div>

        <Button size="sm" variant="outline" className="w-full gap-1 text-xs" onClick={addQuizQuestion}>
          <Plus className="size-3" />
          퀴즈 추가
        </Button>

        <Button
          size="sm"
          className="w-full gap-1.5"
          onClick={handleQuiz}
          disabled={!sourceUrl || quizLoading}
        >
          {quizLoading ? <Loader2 className="size-3.5 animate-spin" /> : <MessageSquare className="size-3.5" />}
          {t("applyQuiz")}
        </Button>
      </div>
      )}

      {/* 적용 후: 저장/다운로드 */}
      {resultUrl && (
        <div className="space-y-2 rounded-lg border border-border bg-card p-3">
          {/* 공개/비공개 토글 */}
          <button
            onClick={() => setIsPublicSave(!isPublicSave)}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors hover:bg-muted"
          >
            {isPublicSave ? (
              <Globe className="size-3.5 text-primary" />
            ) : (
              <Lock className="size-3.5 text-muted-foreground" />
            )}
            <span>{isPublicSave ? t("public") : t("private")}</span>
          </button>

          <div className="flex gap-2">
            {/* DB 저장 */}
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              disabled={saving}
              onClick={async () => {
                if (!resultUrl) return;
                setSaving(true);
                try {
                  await onSave?.(resultUrl, isPublicSave);
                  toast.success(t("saved"));
                } catch {
                  toast.error(t("saveFailed"));
                } finally {
                  setSaving(false);
                }
              }}
            >
              {saving ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : <Save className="mr-1.5 size-3.5" />}
              {t("dbSave")}
            </Button>

            {/* 로컬 다운로드 */}
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={async () => {
                if (!resultUrl) return;
                try {
                  const res = await fetch(resultUrl);
                  const blob = await res.blob();
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `preset_${selectedPreset}_${Date.now()}.mp4`;
                  a.click();
                  URL.revokeObjectURL(url);
                } catch {
                  toast.error(t("downloadFailed"));
                }
              }}
            >
              <Download className="mr-1.5 size-3.5" />
              {t("localDownload")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
