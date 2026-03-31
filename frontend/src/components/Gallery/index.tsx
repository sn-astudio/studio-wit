import { Badge } from "@/components/ui/Badge";
import { useTranslations } from "next-intl";
import { Eye, Heart } from "lucide-react";
import { GALLERY_ITEMS, SIZE_CLASSES, STYLE_TAG_KEYS } from "./const";

export function Gallery() {
  const t = useTranslations("Gallery");

  return (
    <section id="gallery" className="border-t border-border/60 pt-24 pb-32">
      <div className="mx-auto max-w-7xl px-5 md:px-6">
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

        <div className="grid auto-rows-[220px] gap-3 sm:grid-cols-2 lg:grid-cols-3 [grid-auto-flow:dense]">
          {GALLERY_ITEMS.map((item) => (
            <div
              key={item.titleKey}
              className={`group relative cursor-pointer overflow-hidden rounded-xl bg-gradient-to-br ${item.gradient} transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 ${SIZE_CLASSES[item.size]}`}
            >
              {/* 장식 원 */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-20 w-20 rounded-full bg-white/10 backdrop-blur-sm transition-transform duration-500 group-hover:scale-110" />
              </div>

              {/* 호버 오버레이 */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

              {/* 호버 시 정보 */}
              <div className="absolute inset-x-0 bottom-0 translate-y-2 p-4 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                <h3 className="text-base font-semibold text-white">
                  {t(item.titleKey)}
                </h3>
                <p className="mt-0.5 text-sm text-white/70">@{item.author}</p>
                <div className="mt-2 flex gap-3">
                  <span className="flex items-center gap-1 text-xs text-white/60">
                    <Eye className="h-3.5 w-3.5" />
                    {item.views}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-white/60">
                    <Heart className="h-3.5 w-3.5" />
                    {item.likes}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
