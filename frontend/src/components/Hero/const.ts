import type { Stat } from "./types";

export const STATS: Stat[] = [
  { value: "10M+", label: "Images Created" },
  { value: "500K+", label: "Videos Generated" },
  { value: "100K+", label: "Creators" },
];

export const STAT_KEYS = ["stat1", "stat2", "stat3"] as const;

export const ROTATING_WORDS = [
  { action: "create", suffix: " today?" },
  { action: "imagine", suffix: " next?" },
  { action: "design", suffix: " today?" },
  { action: "build", suffix: " next?" },
  { action: "generate", suffix: " now?" },
];
