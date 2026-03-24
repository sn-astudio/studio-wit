/** 초 → MM:SS.ms 포맷 */
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toFixed(1).padStart(4, "0")}`;
}

/** 타임라인 X 좌표 → 시간(초) 변환 */
export function positionToTime(
  clientX: number,
  trackRect: DOMRect,
  duration: number,
): number {
  const ratio = Math.max(0, Math.min(1, (clientX - trackRect.left) / trackRect.width));
  return ratio * duration;
}
