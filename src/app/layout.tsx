import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { cookies } from "next/headers";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import { FocusReset } from "@/components/layout/FocusReset";
import { LocaleProvider } from "@/i18n/LocaleProvider";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, type Locale } from "@/i18n/config";
import { t as translate } from "@/i18n/translations";
import { ToastHost } from "@/components/common/Toast";
import { LocaleConfirmModal } from "@/components/common/LocaleConfirmModal";
import { SessionClaimer } from "@/components/common/SessionClaimer";
import { InteractionClickParticles } from "@/components/effects/InteractionEffects";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

const OG_LOCALE_MAP: Record<string, string> = {
  ko: "ko_KR",
  en: "en_US",
  ja: "ja_JP",
};

export async function generateMetadata(): Promise<Metadata> {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(LOCALE_COOKIE)?.value;
  const locale: Locale = isLocale(cookieLocale) ? cookieLocale : DEFAULT_LOCALE;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://arcanainsight-production.up.railway.app";
  return {
    title: `ArcanaInsight — ${translate("home.hero.title", locale)}`,
    description: translate("meta.site-description", locale),
    alternates: {
      canonical: siteUrl,
      languages: {
        "ko": siteUrl,
        "en": siteUrl,
        "ja": siteUrl,
        "x-default": siteUrl,
      },
    },
    openGraph: {
      locale: OG_LOCALE_MAP[locale] ?? "ko_KR",
      alternateLocale: Object.values(OG_LOCALE_MAP).filter((l) => l !== (OG_LOCALE_MAP[locale] ?? "ko_KR")),
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(LOCALE_COOKIE)?.value;
  const locale: Locale = isLocale(cookieLocale) ? cookieLocale : DEFAULT_LOCALE;
  return (
    <html lang={locale} className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700&family=Gothic+A1:wght@700;900&family=Noto+Serif+KR:wght@400;700&family=Noto+Sans+JP:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-arcana-bg text-arcana-text font-sans min-h-dvh antialiased flex flex-col">
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-arcana-purple focus:text-white focus:rounded-lg">
          {translate("common.skip-link", locale)}
        </a>
        <LocaleProvider initial={locale}>
          <ThemeProvider>
            <Suspense fallback={null}>
              <FocusReset />
            </Suspense>
            <Header />
            {children}
            <ToastHost />
            <LocaleConfirmModal />
            <SessionClaimer />
            <InteractionClickParticles />
          </ThemeProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
