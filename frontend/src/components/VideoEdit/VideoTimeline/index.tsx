"use client";

import { useCallback, useRef, useState } from "react";

import type { VideoTimelineProps } from "./types";
import { formatTime, positionToTime } from "./utils";

type DragTarget = "start" | "end" | "playhead" | null;

export function VideoTimeline({
  duration,
  currentTime,
  trimStart,
  trimEnd,
  onTrimStartChange,
  onTrimEndChange,
  onSeek,
}: VideoTimelineProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<DragTarget>(null);

  const toPercent = (time: number) =>
    duration > 0 ? (time / duration) * 100 : 0;

  const handlePointerDown = useCallback(
    (target: DragTarget) => (e: React.PointerEvent) => {
      e.preventDefault();
      setDragging(target);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [],
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
    setDragging(null);
  }, []);

  const handleTrackClick = useCallback(
    (e: React.MouseEvent) => {
      if (!trackRef.current || dragging) return;
      const time = positionToTime(
        e.clientX,
        trackRef.current.getBoundingClientRect(),
        duration,
      );
      onSeek(time);
    },
    [duration, dragging, onSeek],
  );

  if (duration <= 0) return null;

  const startPct = toPercent(trimStart);
  const endPct = toPercent(trimEnd);
  const playheadPct = toPercent(currentTime);

  return (
    <div className="space-y-2">
      {/* 시간 라벨 */}
      <div className="flex items-center justify-between text-[10px] text-zinc-500">
        <span>{formatTime(trimStart)}</span>
        <span>{formatTime(currentTime)}</span>
        <span>{formatTime(trimEnd)}</span>
      </div>

      {/* 타임라인 트랙 */}
      <div
        ref={trackRef}
        className="relative h-10 cursor-pointer select-none rounded-lg bg-zinc-800"
        onClick={handleTrackClick}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {/* 비활성 구간 (왼쪽) */}
        <div
          className="absolute inset-y-0 left-0 rounded-l-lg bg-zinc-900/70"
          style={{ width: `${startPct}%` }}
        />

        {/* 활성 구간 */}
        <div
          className="absolute inset-y-0 border-y-2 border-primary/50 bg-primary/10"
          style={{ left: `${startPct}%`, width: `${endPct - startPct}%` }}
        />

        {/* 비활성 구간 (오른쪽) */}
        <div
          className="absolute inset-y-0 right-0 rounded-r-lg bg-zinc-900/70"
          style={{ width: `${100 - endPct}%` }}
        />

        {/* 시작 핸들 */}
        <div
          className="absolute top-0 z-10 h-full w-3 -translate-x-1/2 cursor-col-resize rounded-l bg-primary shadow-lg transition-colors hover:bg-primary/80"
          style={{ left: `${startPct}%` }}
          onPointerDown={handlePointerDown("start")}
        >
          <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-white/50" />
        </div>

        {/* 끝 핸들 */}
        <div
          className="absolute top-0 z-10 h-full w-3 -translate-x-1/2 cursor-col-resize rounded-r bg-primary shadow-lg transition-colors hover:bg-primary/80"
          style={{ left: `${endPct}%` }}
          onPointerDown={handlePointerDown("end")}
        >
          <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-white/50" />
        </div>

        {/* 재생 헤드 */}
        <div
          className="absolute top-0 z-20 h-full w-0.5 -translate-x-1/2 bg-white shadow-lg"
          style={{ left: `${playheadPct}%` }}
          onPointerDown={handlePointerDown("playhead")}
        >
          <div className="absolute -top-1 left-1/2 size-2 -translate-x-1/2 rounded-full bg-white shadow" />
        </div>
      </div>

      {/* 전체 duration */}
      <div className="text-right text-[10px] text-zinc-600">
        {formatTime(duration)}
      </div>
    </div>
  );
}
