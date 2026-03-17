import { Button } from "@/components/ui/Button";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { ArrowRight, Sparkles } from "lucide-react";

const STAT_KEYS = ["stat1", "stat2", "stat3"] as const;

export function Hero() {
  const t = useTranslations("Hero");

  return (
    <section className="relative flex min-h-[90vh] items-center justify-center overflow-hidden pt-16">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-0 h-[600px] w-[800px] -translate-x-1/2 rounded-full bg-primary/15 blur-[120px]" />
        <div className="absolute bottom-0 left-1/4 h-[400px] w-[600px] rounded-full bg-primary/10 blur-[100px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-4xl px-6 text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border/80 bg-secondary/80 px-4 py-1.5 text-sm text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <span>{t("poweredByAI")}</span>
        </div>

        <h1 className="mb-6 text-5xl font-bold leading-tight tracking-tight sm:text-6xl lg:text-7xl">
          {t("whatWillYou")}
          <br />
          <span className="bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
            {t("createToday")}
          </span>
        </h1>

        <p className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
          {t("description")}
        </p>

        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link href="/image">
            <Button size="lg" className="gap-2 px-8 text-base">
              {t("exploreAllTools")}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="/gallery">
            <Button
              variant="outline"
              size="lg"
              className="gap-2 px-8 text-base"
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
