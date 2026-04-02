"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";
import type { RotatingTextProps, RotatingWord } from "./types";

function renderWord(
  word: RotatingWord,
  highlightClassName?: string,
  glitchClassName?: string,
  suffixFlip?: boolean,
) {
  if (typeof word === "string") return word;
  return (
    <>
      <span className={cn(highlightClassName, glitchClassName)}>
        {word.action}
      </span>
      {" "}
      <span
        className={cn(
          "inline-block",
          suffixFlip ? "animate-suffix-in" : "animate-suffix-out",
        )}
      >
        {word.suffix.trimStart()}
      </span>
    </>
  );
}

function renderChannelWord(word: RotatingWord) {
  if (typeof word === "string") return word;
  return (
    <>
      {word.action}
      <span className="invisible">{word.suffix}</span>
    </>
  );
}

export function RotatingText({
  words,
  interval = 3000,
  className,
  highlightClassName,
}: RotatingTextProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [nextIndex, setNextIndex] = useState(1);
  const [phase, setPhase] = useState<"idle" | "out" | "pause" | "in" | "reveal">("idle");
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const startTransition = useCallback(() => {
    setNextIndex((currentIndex + 1) % words.length);
    setPhase("out");
  }, [currentIndex, words.length]);

  useEffect(() => {
    const timer = setInterval(startTransition, interval);
    return () => clearInterval(timer);
  }, [startTransition, interval]);

  const handleOutEnd = () => {
    setCurrentIndex(nextIndex);
    setPhase("in");
  };

  const handleInEnd = () => {
    setPhase("idle");
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const isActive = phase === "out" || phase === "in";
  const displayWord = phase === "out" ? words[currentIndex] : words[nextIndex];

  return (
    <span className={cn("relative inline-block", className)}>
      {/* 공간 확보 */}
      <span className="invisible inline-block">
        {renderWord(
          phase === "in" || phase === "pause"
            ? words[nextIndex]
            : words[currentIndex],
          undefined, undefined, true,
        )}
      </span>

      {/* 메인 텍스트 */}
      <span
        className={cn(
          "absolute left-0 top-0 inline-block w-full text-center",
          (phase === "idle" || phase === "reveal" || phase === "in") && "opacity-100",
          phase === "pause" && "opacity-0",
        )}
        onAnimationEnd={phase === "out" ? handleOutEnd : phase === "in" ? handleInEnd : undefined}
      >
        {renderWord(
          words[currentIndex],
          highlightClassName,
          phase === "out" ? "animate-glitch-out" : phase === "in" ? "animate-glitch-in" : undefined,
          phase === "idle" || phase === "in",
        )}
      </span>

      {/* 블루 채널 (메인) */}
      {isActive && (
        <span
          className="pointer-events-none absolute left-0 top-0 inline-block w-full text-center animate-glitch-ch-blue"
          aria-hidden
        >
          {renderChannelWord(displayWord)}
        </span>
      )}

      {/* 시안 채널 (서브) */}
      {isActive && (
        <span
          className="pointer-events-none absolute left-0 top-0 inline-block w-full text-center animate-glitch-ch-cyan"
          aria-hidden
        >
          {renderChannelWord(displayWord)}
        </span>
      )}
    </span>
  );
}
