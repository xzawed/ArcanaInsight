import type { Metadata } from "next";
import { Suspense } from "react";
import { Noto_Sans_KR, Gothic_A1, Noto_Serif_KR } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { MobileNav } from "@/components/layout/MobileNav";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import { FocusReset } from "@/components/layout/FocusReset";

const notoSansKr = Noto_Sans_KR({
  subsets: ["latin"],
  variable: "--font-noto-sans-kr",
  display: "swap",
});

const gothicA1 = Gothic_A1({
  weight: ["400", "700", "900"],
  subsets: ["latin"],
  variable: "--font-gothic-a1",
  display: "swap",
});

const notoSerifKr = Noto_Serif_KR({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-noto-serif-kr",
  display: "swap",
});

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
    <html
      lang="ko"
      className={`dark ${notoSansKr.variable} ${gothicA1.variable} ${notoSerifKr.variable}`}
    >
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
