"use client";

import { Link, useRouter, usePathname } from "@/i18n/routing";
import { Separator } from "@/components/ui/Separator";
import { useTranslations, useLocale } from "next-intl";
import { Globe } from "lucide-react";
import { LINK_GROUPS } from "./const";

export function Footer() {
  const t = useTranslations("Footer");
  const tLang = useTranslations("LanguageSwitcher");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const nextLocale = locale === "ko" ? "en" : "ko";

  return (
    <footer className="border-t border-border/60 bg-background">
      <div className="mx-auto max-w-7xl px-5 py-8 md:px-6">
        {/* 모바일: 로고 + 설명 */}
        <div className="mb-6 md:hidden">
          <Link href="/" className="flex items-center">
            <span className="text-2xl font-bold tracking-tight">Wit</span>
          </Link>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
            {t("description")}
          </p>
        </div>

        {/* 모바일: 링크 가로 배치 */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 md:hidden">
          {LINK_GROUPS.map((group) => (
            <div key={group.categoryKey}>
              <h3 className="mb-2 text-[13px] font-semibold">
                {t(group.categoryKey)}
              </h3>
              <ul className="space-y-1.5">
                {group.linkKeys.map((linkKey) => (
                  <li key={linkKey}>
                    <Link
                      href="#"
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {t(linkKey)}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* 데스크탑: 기존 레이아웃 */}
        <div className="hidden md:flex md:justify-between">
          <div>
            <Link href="/" className="flex items-center">
              <span className="text-2xl font-bold tracking-tight">Wit</span>
            </Link>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {t("description")}
            </p>
          </div>

          <div className="flex gap-12">
            {LINK_GROUPS.map((group) => (
              <div key={group.categoryKey} className="w-[156px]">
                <h3 className="mb-2 text-[13px] font-semibold">
                  {t(group.categoryKey)}
                </h3>
                <ul className="space-y-2">
                  {group.linkKeys.map((linkKey) => (
                    <li key={linkKey}>
                      <Link
                        href="#"
                        className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {t(linkKey)}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <Separator className="my-6 bg-border/60 md:my-10" />

        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground md:text-sm">
            &copy; {new Date().getFullYear()} {t("allRightsReserved")}
          </p>
          <div className="flex items-center gap-3">
            <Globe className="size-3.5 text-muted-foreground md:size-4" />
            <button
              onClick={() => locale !== "ko" && router.replace(pathname, { locale: "ko" })}
              className={`cursor-pointer text-xs transition-colors md:text-sm ${locale === "ko" ? "font-medium text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              한국어
            </button>
            <span className="text-xs text-border md:text-sm">|</span>
            <button
              onClick={() => locale !== "en" && router.replace(pathname, { locale: "en" })}
              className={`cursor-pointer text-xs transition-colors md:text-sm ${locale === "en" ? "font-medium text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              English
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
