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
    <section className="relative flex min-h-[90vh] items-center justify-center">

      <div className="relative z-10 mx-auto w-full max-w-5xl px-5 text-center md:px-6">
        <div className="mb-6 inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-secondary/80 px-4 py-1.5 text-sm font-bold text-muted-foreground dark:border-white dark:bg-white dark:text-black">
          <Bot className="size-5 text-primary" strokeWidth={2.5} />
          <span>{t("poweredByAI")}</span>
        </div>

        <h1 className="mb-6 min-h-[2.4em] text-[clamp(3.5rem,6.5vw,7.75rem)] font-bold leading-tight tracking-tight">
          {t("whatWillYou")}
          <br />
          <RotatingText
            words={ROTATING_WORDS}
            className="text-primary"
            interval={3000}
          />
        </h1>

        <p className="mx-auto mb-10 max-w-[50vw] text-lg leading-relaxed text-muted-foreground sm:text-xl">
          {t("description")}
        </p>

        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          {/* 도구 살펴보기 드롭다운 */}
          <div className="relative" ref={menuRef}>
            <Button
              size="lg"
              className="h-12 gap-2 px-8 text-base"
              onClick={() => setMenuOpen((prev) => !prev)}
            >
              {t("exploreAllTools")}
              <ChevronDown
                className={`h-4 w-4 transition-transform duration-200 ${menuOpen ? "rotate-180" : ""}`}
              />
            </Button>

            {menuOpen && (
              <div className="absolute left-1/2 top-full z-20 mt-2 w-52 -translate-x-1/2 rounded-xl border border-border/80 bg-popover p-1.5 shadow-xl">
                <Link
                  href="/image"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm transition-colors hover:bg-secondary"
                >
                  <ImageIcon className="h-4 w-4 text-primary" />
                  {t("imageGeneration")}
                  <ArrowRight className="ml-auto h-3.5 w-3.5 text-muted-foreground" />
                </Link>
                <Link
                  href="/video"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm transition-colors hover:bg-secondary"
                >
                  <Video className="h-4 w-4 text-primary" />
                  {t("videoGeneration")}
                  <ArrowRight className="ml-auto h-3.5 w-3.5 text-muted-foreground" />
                </Link>
              </div>
            )}
          </div>

          <Link href="/gallery">
            <Button
              variant="outline"
              size="lg"
              className="h-12 gap-2 px-8 text-base"
            >
              {t("viewGallery")}
            </Button>
          </Link>
        </div>

        <div className="mt-20 grid grid-cols-3 gap-8 border-t border-border/60 pt-10">
          {STAT_KEYS.map((key) => (
            <div key={key}>
              <div className="text-2xl font-bold sm:text-3xl">
                {t(`${key}Value`)}
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                {t(`${key}Label`)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
