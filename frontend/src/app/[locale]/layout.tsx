import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import { SessionProvider } from "next-auth/react";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { ThemeProvider } from "@/components/ThemeProvider";
import { QueryProvider } from "@/components/QueryProvider";
import { AuthSync } from "@/components/AuthSync";
import { Toaster } from "sonner";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata" });
  return {
    title: t("title"),
    description: t("description"),
  };
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as "ko" | "en")) {
    notFound();
  }

  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <link
          rel="stylesheet"
          as="style"
          crossOrigin="anonymous"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body
        className={`${geistMono.variable} antialiased`}
      >
        <ThemeProvider>
          <NextIntlClientProvider messages={messages}>
            <SessionProvider>
              <QueryProvider>
                <AuthSync />
                {children}
                <Toaster
                  position="top-center"
                  offset={76}
                  duration={3000}
                  toastOptions={{
                    classNames: {
                      toast:
                        "!rounded-xl !bg-neutral-900 !px-5 !py-4 !shadow-2xl !border !border-neutral-800 !gap-2",
                      title: "!text-[14px] !font-[500] !leading-snug !text-white",
                      description: "!text-[13px] !text-white/50 !mt-0.5",
                      icon: "!text-white/80",
                      success: "[&_[data-icon]]:!text-green-500",
                      error: "[&_[data-icon]]:!text-red-400",
                      warning: "[&_[data-icon]]:!text-amber-400",
                      info: "[&_[data-icon]]:!text-blue-400",
                      actionButton:
                        "!rounded-lg !bg-white/15 !px-3 !py-1.5 !text-[13px] !font-[500] !text-white",
                      cancelButton:
                        "!rounded-lg !bg-white/10 !px-3 !py-1.5 !text-[13px] !font-[500] !text-white/70",
                    },
                  }}
                />
              </QueryProvider>
            </SessionProvider>
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
