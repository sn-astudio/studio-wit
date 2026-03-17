import { Link } from "@/i18n/routing";
import { Separator } from "@/components/ui/Separator";
import { useTranslations } from "next-intl";
import { LINK_GROUPS, SOCIAL_LINKS } from "./const";

export function Footer() {
  const t = useTranslations("Footer");

  return (
    <footer className="border-t border-border/40 bg-background">
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-1">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <span className="text-sm font-bold text-primary-foreground">
                  W
                </span>
              </div>
              <span className="text-lg font-semibold tracking-tight">Wit</span>
            </Link>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              {t("description")}
            </p>
          </div>

          {LINK_GROUPS.map((group) => (
            <div key={group.categoryKey}>
              <h3 className="mb-3 text-sm font-semibold">
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

        <Separator className="my-8 bg-border/40" />

        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} {t("allRightsReserved")}
          </p>
          <div className="flex items-center gap-4">
            {SOCIAL_LINKS.map((social) => (
              <Link
                key={social}
                href="#"
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {social}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
