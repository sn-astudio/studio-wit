"use client";

import NextImage from "next/image";
import { useState, useRef, useEffect } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter, usePathname } from "@/i18n/routing";
import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/Button";
import { Separator } from "@/components/ui/Separator";
import {
  ChevronDown,
  Globe,
  LogOut,
  Menu,
  Moon,
  Sun,
  User,
  X,
} from "lucide-react";
import { useTheme } from "next-themes";
import { NAV_ITEMS } from "./const";

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [navDropdown, setNavDropdown] = useState<string | null>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const { data: session } = useSession();
  const t = useTranslations("Header");
  const tLang = useTranslations("LanguageSwitcher");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const nextLocale = locale === "ko" ? "en" : "ko";
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
    setProfileOpen(false);
    setMobileOpen(false);
  };

  const switchLocale = () => {
    router.replace(pathname, { locale: nextLocale });
    setProfileOpen(false);
    setMobileOpen(false);
  };

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        profileRef.current &&
        !profileRef.current.contains(e.target as Node)
      ) {
        setProfileOpen(false);
      }
      if (
        navDropdown &&
        !(e.target as HTMLElement).closest?.("[data-nav-dropdown]")
      ) {
        setNavDropdown(null);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [navDropdown]);

  return (
    <header className="fixed top-0 z-50 w-full border-b border-border/60 bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <span className="text-sm font-bold text-primary-foreground">
              W
            </span>
          </div>
          <span className="text-lg font-semibold tracking-tight">Wit</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV_ITEMS.map((item) =>
            item.children ? (
              <div
                key={item.labelKey}
                className="relative"
                data-nav-dropdown
              >
                <button
                  onClick={() =>
                    setNavDropdown((prev) =>
                      prev === item.labelKey ? null : item.labelKey,
                    )
                  }
                  className="flex cursor-pointer items-center gap-1 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  {t(item.labelKey)}
                  <ChevronDown
                    className={`size-3.5 transition-transform ${navDropdown === item.labelKey ? "rotate-180" : ""}`}
                  />
                </button>

                {navDropdown === item.labelKey && (
                  <div className="absolute left-0 top-full mt-1 min-w-[140px] rounded-lg border border-border/80 bg-popover p-1 shadow-lg">
                    {item.children.map((child) => (
                      <Link
                        key={child.labelKey}
                        href={child.href}
                        className="block rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                        onClick={() => setNavDropdown(null)}
                      >
                        {t(child.labelKey)}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <Link
                key={item.labelKey}
                href={item.href}
                className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {t(item.labelKey)}
              </Link>
            ),
          )}
        </nav>

        {/* 데스크탑: 프로필 드롭다운 */}
        <div className="hidden items-center gap-3 md:flex">
          {session ? (
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setProfileOpen((prev) => !prev)}
                className="flex cursor-pointer items-center gap-2 rounded-full p-1 transition-colors hover:bg-secondary"
              >
                {session.user?.image ? (
                  <NextImage
                    src={session.user.image}
                    alt={session.user.name ?? ""}
                    width={32}
                    height={32}
                    className="rounded-full"
                  />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary">
                    <User className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
              </button>

              {profileOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 rounded-lg border border-border/80 bg-popover p-2 shadow-lg">
                  {/* 유저 정보 */}
                  <div className="px-3 py-2">
                    <p className="text-sm font-medium">{session.user?.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {session.user?.email}
                    </p>
                  </div>
                  <Separator className="my-1" />
                  {/* 테마 변경 */}
                  <button
                    onClick={toggleTheme}
                    className="flex w-full cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                  >
                    {theme === "dark" ? (
                      <Sun className="h-4 w-4" />
                    ) : (
                      <Moon className="h-4 w-4" />
                    )}
                    {theme === "dark" ? t("lightMode") : t("darkMode")}
                  </button>
                  {/* 언어 변경 */}
                  <button
                    onClick={switchLocale}
                    className="flex w-full cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                  >
                    <Globe className="h-4 w-4" />
                    {tLang(nextLocale)}
                  </button>
                  {/* 로그아웃 */}
                  <button
                    onClick={() => {
                      setProfileOpen(false);
                      signOut({ callbackUrl: window.location.href });
                    }}
                    className="flex w-full cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                  >
                    <LogOut className="h-4 w-4" />
                    {t("signOut")}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Button
              size="sm"
              onClick={() =>
                signIn("google", { callbackUrl: window.location.href })
              }
              className="gap-2"
            >
              {t("signInWithGoogle")}
            </Button>
          )}
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setMobileOpen((prev) => !prev)}
        >
          {mobileOpen ? <X /> : <Menu />}
        </Button>
      </div>

      {/* 모바일 메뉴 */}
      {mobileOpen && (
        <div className="border-t border-border/60 bg-background px-6 pb-4 md:hidden">
          <nav className="flex flex-col gap-1 pt-2">
            {NAV_ITEMS.map((item) =>
              item.children ? (
                <div key={item.labelKey}>
                  <span className="block px-3 py-2 text-sm font-medium text-foreground">
                    {t(item.labelKey)}
                  </span>
                  {item.children.map((child) => (
                    <Link
                      key={child.labelKey}
                      href={child.href}
                      className="block rounded-md px-6 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
                      onClick={() => setMobileOpen(false)}
                    >
                      {t(child.labelKey)}
                    </Link>
                  ))}
                </div>
              ) : (
                <Link
                  key={item.labelKey}
                  href={item.href}
                  className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
                  onClick={() => setMobileOpen(false)}
                >
                  {t(item.labelKey)}
                </Link>
              ),
            )}
          </nav>
          <Separator className="my-3" />
          <div className="flex flex-col gap-1">
            {session ? (
              <>
                <div className="flex items-center gap-2 px-3 py-2">
                  {session.user?.image ? (
                    <NextImage
                      src={session.user.image}
                      alt={session.user.name ?? ""}
                      width={28}
                      height={28}
                      className="rounded-full"
                    />
                  ) : (
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary">
                      <User className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium">{session.user?.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {session.user?.email}
                    </p>
                  </div>
                </div>
                <button
                  onClick={toggleTheme}
                  className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                >
                  {theme === "dark" ? (
                    <Sun className="h-4 w-4" />
                  ) : (
                    <Moon className="h-4 w-4" />
                  )}
                  {theme === "dark" ? t("lightMode") : t("darkMode")}
                </button>
                <button
                  onClick={switchLocale}
                  className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                >
                  <Globe className="h-4 w-4" />
                  {tLang(nextLocale)}
                </button>
                <button
                  onClick={() => {
                    setMobileOpen(false);
                    signOut({ callbackUrl: window.location.href });
                  }}
                  className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                >
                  <LogOut className="h-4 w-4" />
                  {t("signOut")}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={toggleTheme}
                  className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                >
                  {theme === "dark" ? (
                    <Sun className="h-4 w-4" />
                  ) : (
                    <Moon className="h-4 w-4" />
                  )}
                  {theme === "dark" ? t("lightMode") : t("darkMode")}
                </button>
                <button
                  onClick={switchLocale}
                  className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                >
                  <Globe className="h-4 w-4" />
                  {tLang(nextLocale)}
                </button>
                <Button
                  size="sm"
                  onClick={() =>
                    signIn("google", { callbackUrl: window.location.href })
                  }
                  className="gap-2"
                >
                  {t("signInWithGoogle")}
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
