import { create } from "zustand";

export interface EffectsSnapshot {
  // 속도
  speed: number;
  // 필터
  selectedFilter: string;
  brightness: number;
  contrast: number;
  saturation: number;
  // 텍스트 오버레이
  overlayText: string;
  textPosition: string;
  fontSize: number;
  textColor: string;
  selectedTextPreset: string;
  // 워터마크
  wmMode: "text" | "image";
  wmText: string;
  wmPosition: string;
  wmOpacity: number;
  wmFontSize: number;
  wmColor: string;
  wmImageScale: number;
  // 해상도
  resolution: string;
  // 회전
  rotateTransform: string | null;
  // FPS
  targetFps: number;
}

const DEFAULT_SNAPSHOT: EffectsSnapshot = {
  speed: 1,
  selectedFilter: "none",
  brightness: 0,
  contrast: 1,
  saturation: 1,
  overlayText: "",
  textPosition: "bottom",
  fontSize: 36,
  textColor: "white",
  selectedTextPreset: "default",
  wmMode: "text",
  wmText: "",
  wmPosition: "bottom-right",
  wmOpacity: 0.5,
  wmFontSize: 24,
  wmColor: "white",
  wmImageScale: 25,
  resolution: "1080p",
  rotateTransform: null,
  targetFps: 30,
};

export interface HistoryEntry {
  url: string | null;
  snapshot: EffectsSnapshot;
}

interface VideoEditStore {
  // 이펙트 상태
  effects: EffectsSnapshot;
  setEffect: <K extends keyof EffectsSnapshot>(key: K, value: EffectsSnapshot[K]) => void;
  setEffects: (partial: Partial<EffectsSnapshot>) => void;
  resetEffects: () => void;
  restoreEffects: (snapshot: EffectsSnapshot) => void;

  // Undo/Redo 히스토리
  history: HistoryEntry[];
  historyIdx: number;
  pushHistory: (url: string | null) => void;
  undo: () => HistoryEntry | null;
  redo: () => HistoryEntry | null;
  canUndo: () => boolean;
  canRedo: () => boolean;
  clearHistory: () => void;
}

export const useVideoEditStore = create<VideoEditStore>((set, get) => ({
  effects: { ...DEFAULT_SNAPSHOT },

  setEffect: (key, value) =>
    set((state) => ({
      effects: { ...state.effects, [key]: value },
    })),

  setEffects: (partial) =>
    set((state) => ({
      effects: { ...state.effects, ...partial },
    })),

  resetEffects: () => set({ effects: { ...DEFAULT_SNAPSHOT } }),

  restoreEffects: (snapshot) => set({ effects: { ...snapshot } }),

  // 히스토리
  history: [],
  historyIdx: -1,

  pushHistory: (url) => {
    const { effects, history, historyIdx } = get();
    const entry: HistoryEntry = { url, snapshot: { ...effects } };
    const newHistory = history.slice(0, historyIdx + 1);
    newHistory.push(entry);
    set({ history: newHistory, historyIdx: newHistory.length - 1 });
  },

  undo: () => {
    const { history, historyIdx } = get();
    if (historyIdx < 0) return null;
    const newIdx = historyIdx - 1;
    set({ historyIdx: newIdx });
    if (newIdx >= 0) {
      const entry = history[newIdx];
      set({ effects: { ...entry.snapshot } });
      return entry;
    }
    // idx -1 → 원본으로 복원
    set({ effects: { ...DEFAULT_SNAPSHOT } });
    return { url: null, snapshot: { ...DEFAULT_SNAPSHOT } };
  },

  redo: () => {
    const { history, historyIdx } = get();
    if (historyIdx >= history.length - 1) return null;
    const newIdx = historyIdx + 1;
    const entry = history[newIdx];
    set({ historyIdx: newIdx, effects: { ...entry.snapshot } });
    return entry;
  },

  canUndo: () => get().historyIdx >= 0,
  canRedo: () => get().historyIdx < get().history.length - 1,
  clearHistory: () => set({ history: [], historyIdx: -1 }),
}));
