import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { MobileNav } from "@/components/layout/MobileNav";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import { FocusReset } from "@/components/layout/FocusReset";

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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700&family=Gothic+A1:wght@700;900&family=Noto+Serif+KR:wght@700&display=optional"
          rel="stylesheet"
        />
      </head>
      <body className="bg-arcana-bg text-arcana-text font-sans min-h-screen antialiased flex flex-col">
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-arcana-purple focus:text-white focus:rounded-lg">
          메인 콘텐츠로 이동
        </a>
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
        </ThemeProvider>
      </body>
    </html>
  );
}
