"use client";

import { Button } from "@/components/ui/Button";
import { RotatingText } from "@/components/RotatingText";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import {
  ArrowRight,
  Bot,
} from "lucide-react";
import { CountUp } from "@/components/CountUp";
import { ROTATING_WORDS, STAT_KEYS } from "./const";

export function Hero() {
  const t = useTranslations("Hero");

  return (
    <>
    <section className="relative flex h-dvh items-center justify-center overflow-hidden">

      {/* Warped Grid Background */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1400 900" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <radialGradient id="grid-fade" cx="50%" cy="45%" r="55%">
              <stop offset="0%" stopColor="black" />
              <stop offset="55%" stopColor="black" />
              <stop offset="62%" stopColor="#111" />
              <stop offset="68%" stopColor="#888" />
              <stop offset="75%" stopColor="white" />
              <stop offset="85%" stopColor="white" />
              <stop offset="100%" stopColor="black" />
            </radialGradient>
            <mask id="grid-mask">
              <rect width="100%" height="100%" fill="url(#grid-fade)" />
            </mask>
          </defs>
          {/* 흐르는 모션 라인 */}
          <g mask="url(#grid-mask)" fill="none" strokeLinecap="round">
            {/* 가로 → (굵) */}
            <path
              d="M0,180 C250,110 400,260 600,150 C750,80 950,260 1100,170 C1300,100 1380,240 1400,180"
              className="stroke-primary/20 [animation:grid-flow-h_9s_ease-in-out_infinite] dark:stroke-white/7"
              strokeDasharray="140 1400" strokeWidth="2.4"
            />
            {/* 가로 ← (얇) */}
            <path
              d="M0,480 C180,550 350,400 550,510 C720,570 900,400 1050,500 C1220,560 1350,410 1400,480"
              className="stroke-primary/15 [animation:grid-flow-h_12s_ease-in-out_infinite_reverse] dark:stroke-white/10"
              strokeDasharray="126 1400" strokeWidth="1.2"
            />
            {/* 세로 ↓ (중) */}
            <path
              d="M300,0 C230,170 370,310 250,470 C190,580 360,720 280,900"
              className="stroke-primary/15 [animation:grid-flow-v_11s_ease-in-out_infinite] dark:stroke-white/12"
              strokeDasharray="105 1000" strokeWidth="1.8"
            />
            {/* 세로 ↑ (굵) */}
            <path
              d="M700,0 C630,170 770,310 650,470 C580,580 760,720 680,900"
              className="stroke-primary/20 [animation:grid-flow-v_10.5s_ease-in-out_infinite_reverse] dark:stroke-white/7"
              strokeDasharray="126 1000" strokeWidth="2.6"
            />
            {/* 큰 아크 (중) */}
            <path
              d="M0,100 C100,500 500,700 700,450 C900,200 1200,400 1400,800"
              className="stroke-primary/15 [animation:grid-flow-d_13s_ease-in-out_infinite] dark:stroke-white/10"
              strokeDasharray="140 2200" strokeWidth="1.5"
            />
            {/* S커브 (굵) */}
            <path
              d="M0,450 C200,100 400,800 700,300 C1000,-100 1100,700 1400,450"
              className="stroke-primary/18 [animation:grid-flow-d_16s_ease-in-out_infinite] dark:stroke-white/12"
              strokeDasharray="133 2400" strokeWidth="2.4"
            />
            {/* S커브 반대 (얇) */}
            <path
              d="M1400,500 C1200,850 1000,100 700,600 C400,1000 300,200 0,500"
              className="stroke-primary/8 [animation:grid-flow-d_14.5s_ease-in-out_infinite_reverse] dark:stroke-white/7"
              strokeDasharray="119 2400" strokeWidth="1"
            />
            {/* 루프형 (굵) */}
            <path
              d="M200,0 C-100,300 300,600 700,450 C1100,300 1500,600 1200,900"
              className="stroke-primary/12 [animation:grid-flow-d_25s_ease-in-out_infinite] dark:stroke-white/8"
              strokeDasharray="140 2400" strokeWidth="2.2"
            />
            {/* 역루프 (얇) */}
            <path
              d="M1200,0 C1500,300 1100,600 700,450 C300,300 -100,600 200,900"
              className="stroke-primary/8 [animation:grid-flow-d_22s_ease-in-out_infinite_reverse] dark:stroke-white/7"
              strokeDasharray="126 2400" strokeWidth="1.2"
            />
          </g>
        </svg>
      </div>

      <div className="relative z-10 mx-auto w-full max-w-7xl -translate-y-8 px-5 text-center md:px-6">
        <div className="mb-6 inline-flex items-center gap-1.5 rounded-full bg-foreground/[0.06] px-4 py-1.5 text-sm font-medium text-muted-foreground dark:bg-white/[0.08] dark:text-muted-foreground">
          <Bot className="size-5 text-primary" strokeWidth={2.5} />
          <span>{t("poweredByAI")}</span>
        </div>

        <h1 className="mb-4 min-h-[2.4em] text-[clamp(3.5rem,8.5vw,9.75rem)] font-bold leading-[1.05] tracking-tight">
          {t("whatWillYou")}
          <br />
          <RotatingText
            words={ROTATING_WORDS}
            className="whitespace-nowrap"
            highlightClassName="text-primary"
            interval={4000}
          />
        </h1>

        <p className="mx-auto mb-16 max-w-full text-lg font-semibold md:max-w-[38vw] leading-loose sm:text-xl whitespace-pre-line animate-text-brighten">
          {t("description")}
        </p>

        <div className="flex w-full gap-3 sm:w-auto sm:justify-center sm:gap-4">
          <Link href="/image" className="flex-1 sm:flex-none">
            <Button
              size="lg"
              className="group relative h-14 w-full bg-neutral-900 px-0 text-[17px] font-bold text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200 sm:w-auto sm:px-12"
            >
              <span className="transition-transform duration-200 group-hover:-translate-x-3">{t("imageGeneration")}</span>
              <ArrowRight className="absolute right-8 h-5 w-5 opacity-0 transition-all duration-200 translate-x-1 group-hover:opacity-100 group-hover:translate-x-0" strokeWidth={2.5} />
            </Button>
          </Link>
          <Link href="/video" className="flex-1 sm:flex-none">
            <Button
              size="lg"
              className="group relative h-14 w-full bg-neutral-900 px-0 text-[17px] font-bold text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200 sm:w-auto sm:px-12"
            >
              <span className="transition-transform duration-200 group-hover:-translate-x-3">{t("videoGeneration")}</span>
              <ArrowRight className="absolute right-8 h-5 w-5 opacity-0 transition-all duration-200 translate-x-1 group-hover:opacity-100 group-hover:translate-x-0" strokeWidth={2.5} />
            </Button>
          </Link>
        </div>

      </div>
    </section>

    <section className="py-8">
      <div className="mx-auto flex max-w-4xl flex-col items-center justify-center px-5 sm:flex-row md:px-6">
        {STAT_KEYS.map((key, i) => (
          <div key={key} className="flex w-full flex-col items-center sm:w-auto sm:flex-row">
            {i > 0 && (
              <>
                <div className="mx-12 hidden h-12 w-px bg-neutral-300 dark:bg-white/10 sm:block" />
                <div className="my-4 h-px w-full max-w-16 bg-neutral-300 dark:bg-white/10 sm:hidden" />
              </>
            )}
            <div className="py-5 text-center sm:py-8">
              <div className="text-6xl font-bold tracking-tight sm:text-6xl">
                <CountUp value={t(`${key}Value`)} />
              </div>
              <div className="mt-3 text-base tracking-wide text-muted-foreground sm:mt-4 sm:text-base">
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
