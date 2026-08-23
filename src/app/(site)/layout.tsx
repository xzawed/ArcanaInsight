import { Footer } from "@/components/layout/Footer";
import { ServiceClosureBanner } from "@/components/common/ServiceClosureBanner";
import { MobileNav } from "@/components/layout/MobileNav";

/**
 * 일반(비몰입형) 라우트 레이아웃 — 홈, 결과 페이지, 마이페이지, 약관 등.
 * 전역 Footer + 모바일 하단 네비 + 서비스 종료 배너를 포함한다. RootLayout(app/layout.tsx)이
 * html/body·Provider·Header를 제공하므로 여기서는 main 래퍼와 페이지 chrome만 담당한다.
 */
export default function SiteLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <main id="main-content" className="flex-1 pt-14 pb-14 md:pb-0">
        <ServiceClosureBanner />
        {children}
      </main>
      <Footer />
      <MobileNav />
    </>
  );
}
