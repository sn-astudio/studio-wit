"use client";

import { useCallback, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

import type { VideoTimelineProps } from "./types";
import { formatTime, positionToTime } from "./utils";

type DragTarget = "start" | "end" | "playhead" | null;

export function VideoTimeline({
  duration,
  currentTime,
  trimStart,
  trimEnd,
  isTrimming,
  onTrimStartChange,
  onTrimEndChange,
  onSeek,
  onHandleDragging,
}: VideoTimelineProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<DragTarget>(null);
  const [frozenTime, setFrozenTime] = useState<number | null>(null);

  const toPercent = (time: number) =>
    duration > 0 ? (time / duration) * 100 : 0;

  const handlePointerDown = useCallback(
    (target: DragTarget) => (e: React.PointerEvent) => {
      e.preventDefault();
      setDragging(target);
      if (target === "start" || target === "end") {
        setFrozenTime(currentTime);
        onHandleDragging?.(true);
      }
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [currentTime, onHandleDragging],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging || !trackRef.current) return;
      const time = positionToTime(
        e.clientX,
        trackRef.current.getBoundingClientRect(),
        duration,
      );

      if (dragging === "start") {
        onTrimStartChange(Math.min(time, trimEnd - 0.1));
      } else if (dragging === "end") {
        onTrimEndChange(Math.max(time, trimStart + 0.1));
      } else if (dragging === "playhead") {
        onSeek(time);
      }
    },
    [dragging, duration, trimStart, trimEnd, onTrimStartChange, onTrimEndChange, onSeek],
  );

  const handlePointerUp = useCallback(() => {
    if (dragging === "start" || dragging === "end") {
      onHandleDragging?.(false);
    }
    setDragging(null);
    setFrozenTime(null);
  }, [dragging, onHandleDragging]);

  const handleTrackClick = useCallback(
    (_e: React.MouseEvent) => {
      // 트랙 클릭으로는 플레이헤드 이동하지 않음 — 플레이헤드 직접 드래그만 허용
    },
    [duration, dragging, onSeek],
  );

  if (duration <= 0) return null;

  const startPct = toPercent(trimStart);
  const endPct = toPercent(trimEnd);
  const isHandleDrag = dragging === "start" || dragging === "end";
  const displayTime = isHandleDrag && frozenTime !== null ? frozenTime : currentTime;
  const playheadPct = toPercent(displayTime);

  return (
    <div className="space-y-2 touch-none">
      {/* 타임라인 트랙 */}
      <div
        ref={trackRef}
        className="relative h-12 cursor-pointer select-none rounded-lg bg-neutral-200 sm:h-10 dark:bg-neutral-800"
        onClick={handleTrackClick}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {/* 비활성 구간 (왼쪽) */}
        <div
          className="absolute inset-y-0 left-0 rounded-l-lg bg-neutral-300/70 dark:bg-neutral-900/70"
          style={{ width: `${startPct}%` }}
        />

        {/* 활성 구간 */}
        <div
          className="absolute inset-y-0 border-y-2 border-primary/50 bg-primary/10"
          style={{ left: `${startPct}%`, width: `${endPct - startPct}%` }}
        />

        {/* 비활성 구간 (오른쪽) */}
        <div
          className="absolute inset-y-0 right-0 rounded-r-lg bg-neutral-300/70 dark:bg-neutral-900/70"
          style={{ width: `${100 - endPct}%` }}
        />

        {/* 시작 핸들 */}
        <div
          className="absolute top-0 z-10 h-full w-5 -translate-x-1/2 cursor-col-resize sm:w-3"
          style={{ left: `${startPct}%` }}
          onPointerDown={handlePointerDown("start")}
        >
          <div
            className={`absolute inset-y-0 left-1/2 -translate-x-1/2 rounded-l shadow-lg transition-all ${
              dragging === "start"
                ? "w-3.5 bg-primary sm:w-5"
                : "w-2.5 bg-primary hover:bg-primary/80 sm:w-4 sm:rounded-l"
            }`}
          />
          <div className="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-neutral-600/50 dark:bg-white/50" />

          {/* 시작 핸들 툴팁 */}
          <div
            className={`pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 rounded bg-neutral-900 px-1.5 py-0.5 text-[10px] font-[600] tabular-nums text-white whitespace-nowrap transition-opacity dark:bg-white dark:text-neutral-900 ${
              dragging === "start" ? "opacity-100" : "opacity-0"
            }`}
          >
            {formatTime(trimStart)}
          </div>
        </div>

        {/* 끝 핸들 */}
        <div
          className="absolute top-0 z-10 h-full w-5 -translate-x-1/2 cursor-col-resize sm:w-3"
          style={{ left: `${endPct}%` }}
          onPointerDown={handlePointerDown("end")}
        >
          <div
            className={`absolute inset-y-0 left-1/2 -translate-x-1/2 rounded-r shadow-lg transition-all ${
              dragging === "end"
                ? "w-3.5 bg-primary sm:w-5"
                : "w-2.5 bg-primary hover:bg-primary/80 sm:w-4 sm:rounded-r"
            }`}
          />
          <div className="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-neutral-600/50 dark:bg-white/50" />

          {/* 끝 핸들 툴팁 */}
          <div
            className={`pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 rounded bg-neutral-900 px-1.5 py-0.5 text-[10px] font-[600] tabular-nums text-white whitespace-nowrap transition-opacity dark:bg-white dark:text-neutral-900 ${
              dragging === "end" ? "opacity-100" : "opacity-0"
            }`}
          >
            {formatTime(trimEnd)}
          </div>
        </div>

        {/* 재생 헤드 */}
        <div
          className="absolute top-0 z-20 h-full w-6 -translate-x-1/2 cursor-col-resize sm:w-3"
          style={{ left: `${playheadPct}%` }}
          onPointerDown={handlePointerDown("playhead")}
        >
          <div className="absolute inset-y-0 left-1/2 w-[3px] -translate-x-1/2 bg-neutral-700 shadow-lg dark:bg-white" />
          <div className="absolute -top-2 left-1/2 size-4 -translate-x-1/2 rounded-full bg-neutral-700 shadow sm:-top-1.5 sm:size-3 dark:bg-white" />

          {/* 재생 헤드 툴팁 */}
          <div
            className={`pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 rounded bg-neutral-700 px-1.5 py-0.5 text-[10px] font-[600] tabular-nums text-white whitespace-nowrap transition-opacity dark:bg-neutral-300 dark:text-neutral-900 ${
              dragging === "playhead" ? "opacity-100" : "opacity-0"
            }`}
          >
            {formatTime(displayTime)}
          </div>
        </div>

        {/* 트리밍 중 오버레이 */}
        {isTrimming && (
          <div className="absolute inset-0 z-30 flex items-center justify-center rounded-lg bg-neutral-900/60 dark:bg-neutral-950/70">
            <div className="flex items-center gap-2 text-[12px] font-[500] text-white">
              <Loader2 className="size-4 animate-spin" />
              <span>트리밍 중...</span>
            </div>
          </div>
        )}
      </div>

      {/* 전체 duration */}
      <div className="flex items-center justify-between text-[10px] tabular-nums text-neutral-500">
        <span>{formatTime(0)}</span>
        <span>{formatTime(duration)}</span>
      </div>
    </div>
  );
}
