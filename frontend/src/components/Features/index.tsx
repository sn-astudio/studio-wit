import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { useTranslations } from "next-intl";
import { TOOLS } from "./const";

export function Features() {
  const t = useTranslations("Features");

  return (
    <section id="features" className="py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
            {t("title")}
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            {t("description")}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {TOOLS.map((tool) => (
            <Card
              key={tool.titleKey}
              className="group cursor-pointer border-border/40 bg-card/50 transition-all duration-300 hover:border-primary/30 hover:bg-card"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary/20">
                    <tool.icon className="h-5 w-5" />
                  </div>
                  {tool.badgeKey && (
                    <Badge
                      variant="secondary"
                      className="text-xs font-medium text-primary"
                    >
                      {t(tool.badgeKey)}
                    </Badge>
                  )}
                </div>
                <CardTitle className="mt-3 text-base">
                  {t(tool.titleKey)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>{t(tool.descriptionKey)}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
