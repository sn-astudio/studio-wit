"use client";

import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import type { RotatingTextProps } from "./types";

export function RotatingText({
  words,
  interval = 3000,
  className,
}: RotatingTextProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipping, setIsFlipping] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    const loop = setInterval(() => {
      setIsFlipping(true);
      timeoutRef.current = setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % words.length);
        setIsFlipping(false);
      }, 300);
    }, interval);

    return () => {
      clearInterval(loop);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [words, interval]);

  const maskStyle = isFlipping
    ? {
        WebkitMaskImage:
          "linear-gradient(to bottom, black 40%, transparent 100%)",
        maskImage: "linear-gradient(to bottom, black 40%, transparent 100%)",
      }
    : undefined;

  return (
    <span
      className={cn(
        "inline-block transition-all duration-300",
        isFlipping
          ? "translate-y-[0.2em] opacity-0"
          : "translate-y-0 opacity-100",
        className,
      )}
      style={maskStyle}
    >
      {words[currentIndex]}
    </span>
  );
}
