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
  ChevronDownCircle,
  Globe,
  LayoutGrid,
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
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
      document.body.style.position = "fixed";
      document.body.style.width = "100%";
      document.body.style.top = `-${window.scrollY}px`;
    } else {
      const scrollY = document.body.style.top;
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.width = "";
      document.body.style.top = "";
      window.scrollTo(0, parseInt(scrollY || "0") * -1);
    }
    return () => {
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.width = "";
      document.body.style.top = "";
    };
  }, [mobileOpen]);

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
    <>
    <header className={`fixed top-0 z-50 w-full ${mobileOpen ? "bg-background" : "bg-background/80 backdrop-blur-xl"}`}>
      <div className="relative z-10 mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon-lg"
            className="md:hidden"
            onClick={() => setMobileOpen((prev) => !prev)}
          >
            {mobileOpen ? <X className="size-6" /> : <Menu className="size-5" />}
          </Button>
          <Link href="/" className="flex items-center">
            <span className="text-2xl font-bold tracking-tight">Wit</span>
          </Link>
        </div>

        <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-1 md:flex">
          {NAV_ITEMS.map((item) =>
            item.children ? (
              <div
                key={item.labelKey}
                className="relative"
                data-nav-dropdown
                onMouseEnter={() => setNavDropdown(item.labelKey)}
                onMouseLeave={() => setNavDropdown(null)}
              >
                <button
                  className={`flex cursor-pointer items-center gap-1 rounded-[12px] px-2.5 py-1.5 text-base font-medium transition-colors hover:bg-[rgba(0,0,0,0.05)] dark:hover:bg-[rgba(255,255,255,0.05)] ${pathname.startsWith(item.href) ? "text-white" : "text-muted-foreground hover:text-foreground"}`}
                >
                  {t(item.labelKey)}
                  <ChevronDown className={`size-3.5 transition-transform ${navDropdown === item.labelKey ? "rotate-180" : ""}`} />
                </button>

                {navDropdown === item.labelKey && (
                  <div className="absolute -left-6 top-full pt-2">
                  <div className="min-w-[280px] rounded-xl border border-border/50 bg-popover p-2 shadow-lg">
                    <div className="flex flex-col gap-1">
                      {item.children.map((child) => (
                        <Link
                          key={child.labelKey}
                          href={child.href}
                          className="flex items-center gap-3 rounded-lg px-2.5 py-2 transition-colors hover:bg-[rgba(0,0,0,0.05)] dark:hover:bg-[rgba(255,255,255,0.05)]"
                          onClick={() => setNavDropdown(null)}
                        >
                          {child.icon && (
                            <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-[rgba(0,0,0,0.06)] dark:bg-[rgba(255,255,255,0.06)]">
                              <child.icon className="size-5 text-muted-foreground" strokeWidth={2} />
                            </div>
                          )}
                          <div className="flex flex-col gap-1">
                            <p className="text-sm font-medium text-foreground">
                              {t(child.labelKey)}
                            </p>
                            {child.descKey && (
                              <p className="text-[13px] text-muted-foreground">
                                {t(child.descKey)}
                              </p>
                            )}
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                  </div>
                )}
              </div>
            ) : (
              <Link
                key={item.labelKey}
                href={item.href}
                className={`rounded-[12px] px-2.5 py-1.5 text-base font-medium transition-colors hover:bg-[rgba(0,0,0,0.05)] dark:hover:bg-[rgba(255,255,255,0.05)] ${pathname.startsWith(item.href) ? "text-white" : "text-muted-foreground hover:text-foreground"}`}
              >
                {t(item.labelKey)}
              </Link>
            ),
          )}
        </nav>

        {/* 데스크탑: 프로필 드롭다운 */}
        <div className="hidden items-center gap-2 md:flex">
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
                    <p className="text-base font-medium">{session.user?.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {session.user?.email}
                    </p>
                  </div>
                  <Separator className="my-1" />
                  {/* 마이페이지 */}
                  <Link
                    href="/mypage"
                    onClick={() => setProfileOpen(false)}
                    className="flex w-full items-center gap-2 rounded-[12px] px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-[rgba(0,0,0,0.05)] dark:hover:bg-[rgba(255,255,255,0.05)] hover:text-foreground"
                  >
                    <LayoutGrid className="h-4 w-4" />
                    {t("myPage")}
                  </Link>
                  <Separator className="my-1" />
                  {/* 테마 변경 */}
                  <button
                    onClick={toggleTheme}
                    className="flex w-full cursor-pointer items-center gap-2 rounded-[12px] px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-[rgba(0,0,0,0.05)] dark:hover:bg-[rgba(255,255,255,0.05)] hover:text-foreground"
                  >
                    <Sun className="hidden h-4 w-4 dark:block" />
                    <Moon className="block h-4 w-4 dark:hidden" />
                    <span className="hidden dark:inline">{t("lightMode")}</span>
                    <span className="inline dark:hidden">{t("darkMode")}</span>
                  </button>
                  {/* 언어 변경 */}
                  <button
                    onClick={switchLocale}
                    className="flex w-full cursor-pointer items-center gap-2 rounded-[12px] px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-[rgba(0,0,0,0.05)] dark:hover:bg-[rgba(255,255,255,0.05)] hover:text-foreground"
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
                    className="flex w-full cursor-pointer items-center gap-2 rounded-[12px] px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-[rgba(0,0,0,0.05)] dark:hover:bg-[rgba(255,255,255,0.05)] hover:text-foreground"
                  >
                    <LogOut className="h-4 w-4" />
                    {t("signOut")}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <button
                onClick={toggleTheme}
                className="flex cursor-pointer items-center justify-center rounded-[12px] p-2 text-muted-foreground transition-colors hover:bg-[rgba(0,0,0,0.05)] hover:text-foreground dark:hover:bg-[rgba(255,255,255,0.05)]"
              >
                <Sun className="hidden size-5 dark:block" />
                <Moon className="block size-5 dark:hidden" />
              </button>
              <Button
                variant="outline"
                size="lg"
                onClick={() =>
                  signIn("google", { callbackUrl: window.location.href })
                }
                className="px-4 text-sm font-medium"
              >
                {t("signIn")}
              </Button>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <button
            onClick={toggleTheme}
            className="flex cursor-pointer items-center justify-center rounded-[12px] p-2 text-muted-foreground transition-colors hover:bg-[rgba(0,0,0,0.05)] hover:text-foreground dark:hover:bg-[rgba(255,255,255,0.05)]"
          >
            <Sun className="hidden size-5 dark:block" />
            <Moon className="block size-5 dark:hidden" />
          </button>
          {!session && (
            <Button
              variant="outline"
              size="lg"
              onClick={() =>
                signIn("google", { callbackUrl: window.location.href })
              }
              className="px-4 text-sm font-medium"
            >
              {t("signIn")}
            </Button>
          )}
        </div>
      </div>

      {/* 모바일 메뉴 */}
      {mobileOpen && (
        <div className="relative z-10 border-b border-transparent bg-background px-5 pb-6 dark:border-border/50 md:hidden">
          <nav className="flex flex-col gap-1 pt-1">
            {NAV_ITEMS.map((item) =>
              item.children ? (
                <div key={item.labelKey}>
                  <span className="block px-3 py-2.5 text-base font-medium text-foreground">
                    {t(item.labelKey)}
                  </span>
                  {item.children.map((child) => (
                    <Link
                      key={child.labelKey}
                      href={child.href}
                      className="block rounded-[12px] px-4 py-2.5 text-base text-muted-foreground transition-colors hover:bg-[rgba(0,0,0,0.05)] hover:text-foreground dark:hover:bg-[rgba(255,255,255,0.05)]"
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
                  className="block rounded-[12px] px-3 py-2.5 text-base font-medium text-foreground transition-colors hover:bg-[rgba(0,0,0,0.05)] dark:hover:bg-[rgba(255,255,255,0.05)]"
                  onClick={() => setMobileOpen(false)}
                >
                  {t(item.labelKey)}
                </Link>
              ),
            )}
          </nav>
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
                    <p className="text-base font-medium">{session.user?.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {session.user?.email}
                    </p>
                  </div>
                </div>
                <Link
                  href="/mypage"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2 rounded-[12px] px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-[rgba(0,0,0,0.05)] dark:hover:bg-[rgba(255,255,255,0.05)] hover:text-foreground"
                >
                  <LayoutGrid className="h-4 w-4" />
                  {t("myPage")}
                </Link>
                <button
                  onClick={toggleTheme}
                  className="flex items-center gap-2 rounded-[12px] px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-[rgba(0,0,0,0.05)] dark:hover:bg-[rgba(255,255,255,0.05)] hover:text-foreground"
                >
                  <Sun className="hidden h-4 w-4 dark:block" />
                  <Moon className="block h-4 w-4 dark:hidden" />
                  <span className="hidden dark:inline">{t("lightMode")}</span>
                  <span className="inline dark:hidden">{t("darkMode")}</span>
                </button>
                <button
                  onClick={() => {
                    setMobileOpen(false);
                    signOut({ callbackUrl: window.location.href });
                  }}
                  className="flex items-center gap-2 rounded-[12px] px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-[rgba(0,0,0,0.05)] dark:hover:bg-[rgba(255,255,255,0.05)] hover:text-foreground"
                >
                  <LogOut className="h-4 w-4" />
                  {t("signOut")}
                </button>
              </>
            ) : (
              <></>
            )}
          </div>
        </div>
      )}
    </header>
    {mobileOpen && (
      <div
        className="fixed inset-0 z-[49] bg-black/50 md:hidden"
        onClick={() => setMobileOpen(false)}
      />
    )}
    </>
  );
}
