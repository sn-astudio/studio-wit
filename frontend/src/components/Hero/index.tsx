"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { RotatingText } from "@/components/RotatingText";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import {
  ArrowRight,
  ChevronDown,
  ImageIcon,
  Bot,
  Sparkles,
  Video,
} from "lucide-react";
import { CountUp } from "@/components/CountUp";
import { ROTATING_WORDS, STAT_KEYS } from "./const";

export function Hero() {
  const t = useTranslations("Hero");
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <>
    <section className="relative flex h-dvh items-center justify-center overflow-hidden">

      <div className="relative z-10 mx-auto w-full max-w-7xl -translate-y-8 px-5 text-center md:px-6">
        <div className="mb-6 inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-secondary/80 px-4 py-1.5 text-sm font-bold text-muted-foreground dark:border-white dark:bg-white dark:text-black">
          <Bot className="size-5 text-primary" strokeWidth={2.5} />
          <span>{t("poweredByAI")}</span>
        </div>

        <h1 className="mb-6 min-h-[2.4em] text-[clamp(3.5rem,8.5vw,9.75rem)] font-bold leading-[1.05] tracking-tight">
          {t("whatWillYou")}
          <br />
          <RotatingText
            words={ROTATING_WORDS}
            className="text-primary"
            interval={3000}
          />
        </h1>

        <p className="mx-auto mb-14 max-w-full text-lg md:max-w-[50vw] leading-relaxed text-muted-foreground sm:text-xl">
          {t("description")}
        </p>

        <div className="flex w-full gap-3 sm:w-auto sm:justify-center sm:gap-4">
          <Link href="/image" className="flex-1 sm:flex-none">
            <Button
              variant="outline"
              size="lg"
              className="h-14 w-full gap-2 px-0 text-base sm:w-auto sm:px-8"
            >
              <ImageIcon className="h-4 w-4" />
              {t("imageGeneration")}
            </Button>
          </Link>
          <Link href="/video" className="flex-1 sm:flex-none">
            <Button
              variant="outline"
              size="lg"
              className="h-14 w-full gap-2 px-0 text-base sm:w-auto sm:px-8"
            >
              <Video className="h-4 w-4" />
              {t("videoGeneration")}
            </Button>
          </Link>
        </div>

      </div>
    </section>

    <section className="py-16">
      <div className="mx-auto flex max-w-7xl items-center justify-center px-5 md:px-6">
        {STAT_KEYS.map((key, i) => (
          <div key={key} className="flex items-center">
            {i > 0 && (
              <div className="mx-4 h-10 w-px bg-border/60 sm:mx-14" />
            )}
            <div className="text-center">
              <div className="text-3xl font-bold sm:text-4xl">
                <CountUp value={t(`${key}Value`)} />
              </div>
              <div className="mt-2.5 text-base text-muted-foreground">
                {t(`${key}Label`)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
    </>
  );
}
