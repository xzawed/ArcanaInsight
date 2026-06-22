import { MobileNav } from "@/components/layout/MobileNav";

/**
 * 몰입형(풀스크린) 라우트 레이아웃 — 타로/사주/신점 진입·세션, 캐릭터 상세.
 * 각 페이지가 h-[calc(100dvh-7rem)] 스테이지로 화면을 정확히 채우는 몰입형 경험이므로
 * 전역 Footer를 렌더하지 않는다(Footer가 스테이지 아래 쌓여 document가 추가로 스크롤되는
 * '이중 스크롤'을 구조적으로 제거). 모바일 하단 네비는 유지(이탈 동선 + pb-14가 그대로 정합).
 * RootLayout(app/layout.tsx)이 html/body·Provider·Header를 제공한다.
 */
export default function ImmersiveLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <main id="main-content" className="flex-1 pt-14 pb-14 md:pb-0">
        {children}
      </main>
      <MobileNav />
    </>
  );
}
