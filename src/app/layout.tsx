import type { Metadata } from "next";
import { Noto_Sans_KR, Gothic_A1 } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { MobileNav } from "@/components/layout/MobileNav";

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
      className={`dark ${notoSansKr.variable} ${gothicA1.variable}`}
    >
      <body className="bg-arcana-bg text-arcana-text font-sans min-h-screen antialiased flex flex-col">
        <Header />
        <main className="flex-1 pt-14 pb-14 md:pb-0">
          {children}
        </main>
        <Footer />
        <MobileNav />
      </body>
    </html>
  );
}
