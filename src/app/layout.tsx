import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { cookies } from "next/headers";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { MobileNav } from "@/components/layout/MobileNav";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import { FocusReset } from "@/components/layout/FocusReset";
import { LocaleProvider } from "@/i18n/LocaleProvider";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, type Locale } from "@/i18n/config";
import { t as translate } from "@/i18n/translations";
import { ToastHost } from "@/components/common/Toast";
import { LocaleConfirmModal } from "@/components/common/LocaleConfirmModal";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "ArcanaInsight — 타로 & 운세 상담",
  description:
    "애니메이션 캐릭터와 함께하는 타로 리딩, 사주, 신점 종합 운세 플랫폼",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
      <body className="bg-arcana-bg text-arcana-text font-sans min-h-screen antialiased flex flex-col">
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-arcana-purple focus:text-white focus:rounded-lg">
          {translate("common.skip-link", locale)}
        </a>
        <LocaleProvider initial={locale}>
          <ThemeProvider>
            <Suspense fallback={null}>
              <FocusReset />
            </Suspense>
            <Header />
            <main id="main-content" className="flex-1 pt-14 pb-14 md:pb-0">
              {children}
            </main>
            <Footer />
            <MobileNav />
            <ToastHost />
            <LocaleConfirmModal />
          </ThemeProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
