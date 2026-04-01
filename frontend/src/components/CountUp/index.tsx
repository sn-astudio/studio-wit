"use client";

import { useState, useEffect, useRef } from "react";
import type { CountUpProps } from "./types";

function parseValue(value: string): { num: number; suffix: string } {
  const match = value.match(/^([\d.]+)(.*)$/);
  if (!match) return { num: 0, suffix: value };
  return { num: parseFloat(match[1]), suffix: match[2] };
}

export function CountUp({ value, duration = 2000 }: CountUpProps) {
  const { num, suffix } = parseValue(value);
  const [display, setDisplay] = useState(0);
  const rafRef = useRef<number>(undefined);
  const startRef = useRef<number>(undefined);

  useEffect(() => {
    const animate = (timestamp: number) => {
      if (!startRef.current) startRef.current = timestamp;
      const elapsed = timestamp - startRef.current;
      const progress = Math.min(elapsed / duration, 1);

      // ease-out
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(eased * num);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        setDisplay(num);
      }
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [num, duration]);

  const formatted = num >= 1 ? Math.floor(display).toLocaleString() : display.toFixed(1);

  return (
    <span>
      {formatted}
      {suffix}
    </span>
  );
}
