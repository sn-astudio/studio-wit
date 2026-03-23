"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";

import type { RotatingTextProps } from "./types";
import { FRAME_MS } from "./const";
import { randomChar, ease } from "./utils";

export function RotatingText({
  words,
  interval = 3000,
  className,
}: RotatingTextProps) {
  const [display, setDisplay] = useState(words[0]);
  const indexRef = useRef(0);
  const rafRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const bufferRef = useRef<string[]>([]);

  const scrambleTo = useCallback((target: string) => {
    const outMs = 480;
    const inMs = 720;
    const totalMs = outMs + inMs;
    const totalFrames = Math.ceil(totalMs / FRAME_MS);
    const outFrames = Math.ceil(outMs / FRAME_MS);
    let frame = 0;

    /* 버퍼 초기화 — 프레임 사이에 글자를 유지하기 위해 사용 */
    bufferRef.current = target.split("").map(() => randomChar());

    const tick = () => {
      frame++;

      if (frame <= outFrames) {
        /* ── scramble-out: 오른쪽부터 천천히 랜덤화 ── */
        const progress = frame / outFrames;
        const scrambled = Math.floor(progress * target.length);

        setDisplay((prev) => {
          const src = prev.padEnd(target.length);
          return src
            .split("")
            .map((ch, i) => {
              if (ch === " " && target[i] === " ") return "\u00A0";
              if (i >= src.length - scrambled) {
                /* 매 프레임마다 30%만 새 랜덤 글자로 교체 → 차분한 느낌 */
                if (Math.random() < 0.3) {
                  bufferRef.current[i] = randomChar();
                }
                return bufferRef.current[i];
              }
              return ch;
            })
            .join("");
        });
      } else {
        /* ── scramble-in: 왼쪽부터 디코딩 ── */
        const progress = (frame - outFrames) / (totalFrames - outFrames);
        const revealed = Math.floor(ease(progress) * target.length);

        const text = target
          .split("")
          .map((ch, i) => {
            if (ch === " ") return "\u00A0";
            if (i < revealed) return ch;
            /* 미확정 글자 중 25%만 매 프레임 교체 */
            if (Math.random() < 0.25) {
              bufferRef.current[i] = randomChar();
            }
            return bufferRef.current[i];
          })
          .join("");

        setDisplay(text);
      }

      if (frame < totalFrames) {
        rafRef.current = setTimeout(tick, FRAME_MS);
      } else {
        setDisplay(target);
      }
    };

    tick();
  }, []);

  useEffect(() => {
    const loop = setInterval(() => {
      indexRef.current = (indexRef.current + 1) % words.length;
      scrambleTo(words[indexRef.current]);
    }, interval);

    return () => {
      clearInterval(loop);
      if (rafRef.current) clearTimeout(rafRef.current);
    };
  }, [words, interval, scrambleTo]);

  return (
    <span className={cn("inline-block", className)}>
      {display}
    </span>
  );
}
