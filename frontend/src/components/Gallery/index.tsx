import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { useTranslations } from "next-intl";
import { Eye, Heart } from "lucide-react";
import { GALLERY_ITEMS, STYLE_TAG_KEYS } from "./const";

export function Gallery() {
  const t = useTranslations("Gallery");

  return (
    <section id="gallery" className="border-t border-border/60 py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="mb-2 text-3xl font-bold tracking-tight sm:text-4xl">
              {t("title")}
            </h2>
            <p className="text-muted-foreground">{t("description")}</p>
          </div>
        </div>

        <div className="mb-8 flex flex-wrap gap-2">
          {STYLE_TAG_KEYS.map((key) => (
            <Badge
              key={key}
              variant="outline"
              className="cursor-pointer px-3 py-1 transition-colors hover:bg-secondary"
            >
              {t(key)}
            </Badge>
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {GALLERY_ITEMS.map((item) => (
            <Card
              key={item.titleKey}
              className="group cursor-pointer overflow-hidden border-border/60 bg-card/80 transition-all duration-300 hover:border-primary/40"
            >
              <div
                className={`relative aspect-[4/3] bg-gradient-to-br ${item.gradient}`}
              >
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-16 w-16 rounded-full bg-white/10 backdrop-blur-sm" />
                </div>
                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between opacity-0 transition-opacity group-hover:opacity-100">
                  <div className="flex gap-3">
                    <span className="flex items-center gap-1 text-xs text-white/80">
                      <Eye className="h-3.5 w-3.5" />
                      {item.views}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-white/80">
                      <Heart className="h-3.5 w-3.5" />
                      {item.likes}
                    </span>
                  </div>
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-medium">{t(item.titleKey)}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  @{item.author}
                </p>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
