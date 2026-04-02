import type { TypeFilter, StatusFilter } from "./types";

export const TYPE_FILTERS: TypeFilter[] = ["all", "image", "video"];

export const STATUS_FILTERS: StatusFilter[] = [
  "all",
  "completed",
  "processing",
  "failed",
];
