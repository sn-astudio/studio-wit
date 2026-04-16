"use client";

import { useEffect, useRef, useState } from "react";
import type { FollowingBotProps } from "./types";

export function FollowingBot({
  className,
  size = 20,
  strokeWidth = 2.5,
}: FollowingBotProps) {
  const ref = useRef<SVGSVGElement>(null);
  const rafRef = useRef<number | null>(null);
  const [eye, setEye] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        const el = ref.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dx = e.clientX - cx;
        const dy = e.clientY - cy;
        const dist = Math.hypot(dx, dy) || 1;
        const max = 1.6;
        const ratio = Math.min(dist / 220, 1);
        setEye({
          x: (dx / dist) * max * ratio,
          y: (dy / dist) * max * ratio,
        });
      });
    };
    window.addEventListener("mousemove", handleMove);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <svg
      ref={ref}
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <g strokeWidth={1.7}>
        <path d="M12 8V4H8" />
        <rect width="16" height="12" x="4" y="8" rx="2" />
        <path d="M2 14h2" />
        <path d="M20 14h2" />
      </g>
      <g style={{ transform: `translate(${eye.x}px, ${eye.y}px)`, transition: "transform 80ms linear" }}>
        <circle cx={9} cy={14} r={1.4} fill="currentColor" stroke="none" />
        <circle cx={15} cy={14} r={1.4} fill="currentColor" stroke="none" />
      </g>
    </svg>
  );
}
