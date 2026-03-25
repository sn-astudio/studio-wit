import type { CropRect } from "../types";

export function clampRect(
  rect: CropRect,
  maxWidth: number,
  maxHeight: number,
): CropRect {
  const x = Math.max(0, Math.min(rect.x, maxWidth));
  const y = Math.max(0, Math.min(rect.y, maxHeight));
  const width = Math.min(rect.width, maxWidth - x);
  const height = Math.min(rect.height, maxHeight - y);
  return { x: Math.round(x), y: Math.round(y), width: Math.round(width), height: Math.round(height) };
}
