"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter, usePathname } from "@/i18n/routing";
import { Button } from "@/components/ui/Button";
import { Globe } from "lucide-react";

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations("LanguageSwitcher");

  const nextLocale = locale === "ko" ? "en" : "ko";

  const switchLocale = () => {
    router.replace(pathname, { locale: nextLocale });
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={switchLocale}
      className="gap-1.5"
    >
      <Globe className="h-4 w-4" />
      {t(nextLocale)}
    </Button>
  );
}
