---
name: page-builder
description: 새 페이지를 ArcanaInsight 레이아웃 규칙에 맞게 생성한다. "페이지 만들어줘", "새 페이지 추가" 등의 요청에 사용한다.
---

# page-builder 에이전트

ArcanaInsight의 디자인 시스템과 레이아웃 규칙을 준수하는 새 페이지를 생성한다.

## 참조 파일

- `src/app/layout.tsx` — 루트 레이아웃: **`html`/`body`(sticky-footer 컨테이너) + Provider + `Header` + 전역 오버레이만** 담당. ⚠️ `main`/`Footer`/`MobileNav`는 **라우트 그룹 레이아웃**이 소유(루트엔 없음).
- `src/app/(immersive)/layout.tsx` — 몰입형 그룹: **Footer 미렌더**(100dvh 풀스크린, 이중 스크롤 방지)
- `src/app/(site)/layout.tsx` — 일반 그룹: `main` + `Footer` + `MobileNav` 포함
- `src/app/globals.css` — Tailwind v4 @theme 커스텀 컬러
- `src/app/(immersive)/tarot/page.tsx` — 캐릭터가 있는 몰입형 진입 페이지 패턴
- `src/app/(immersive)/saju/page.tsx` — 멀티스텝 + 카테고리 선택 패턴
- `src/app/(site)/terms/page.tsx` — 정적 콘텐츠 페이지 패턴
- `src/app/(site)/mypage/page.tsx` — 서버 컴포넌트 + Supabase 데이터 페이지 패턴
- `src/components/layout/Header.tsx` — 네비게이션 링크
- `src/components/layout/MobileNav.tsx` — 모바일 탭
- `src/components/layout/Footer.tsx` — 푸터 링크

## 라우트 그룹 배치 (먼저 결정)

새 페이지는 **어느 그룹에 둘지 먼저 결정**한다:

- **`(immersive)`** — 타로·사주·신점 세션/진입, `character/[id]` 등 100dvh 풀스크린 몰입 경험. **Footer 미렌더.** 스테이지가 높이를 지배(`h-[calc(100dvh-7rem)]`)하며 outer 래퍼엔 min-height를 두지 않는다(`relative overflow-hidden`).
- **`(site)`** — 홈·결과·마이페이지·약관 등 일반 페이지. Footer 포함. ⚠️ **`min-h-screen`(=100vh) 금지**(PR #428 — `main` 패딩과 합산돼 유령 스크롤+Footer 가림). 높이는 sticky-footer 컨테이너에 위임하고, 중앙정렬이 필요하면 `min-h-[calc(100dvh-7rem)] md:min-h-[calc(100dvh-3.5rem)]`.

## 필수 레이아웃 규칙

### 캐릭터가 등장하는 페이지
- **데스크탑(md 이상)**: 좌측 캐릭터 50% + 우측 콘텐츠 50% — 가로 5:5 비율
- **모바일(md 미만)**: 위에서 아래로 세로 배치 — 캐릭터 → 콘텐츠
- 캐릭터 이미지: CSS mask로 투명도 그라디언트 (배경 블렌딩)

```tsx
<div className="flex flex-col md:flex-row">
  <div className="h-[25%] md:h-auto w-full md:w-[50%]">
    <CharacterDisplay character={...} mood={...} />
  </div>
  <div className="flex-1 md:w-[50%] px-4">
    {/* 콘텐츠 */}
  </div>
</div>
```

### 정적 콘텐츠 페이지 (약관, 개인정보 등) — `(site)` 그룹
- ⚠️ **`min-h-screen` 금지 (PR #428)** — 높이는 sticky-footer 컨테이너에 위임(페이지 래퍼에 min 높이 두지 않음)
- `bg-arcana-bg`
- `max-w-3xl mx-auto px-4 py-12`
- "← 홈으로" 뒤로가기 링크
- `font-serif font-bold text-arcana-purple` 제목
- `text-arcana-text text-sm leading-relaxed` 본문

### 배경 이미지가 있는 페이지 (주로 `(immersive)`)
⚠️ 외부 lazy 이미지(`ServiceBackground`) 페이지엔 **dvh 기반 min-height 금지**(E2E `load` 지연, PR #428). outer는 min-height 없이 `relative overflow-hidden`으로 두고, 높이는 스테이지(`h-[calc(100dvh-7rem)]`)가 지배하게 한다.
```tsx
<div className="relative overflow-hidden">
  <div className="fixed inset-0 -z-10">
    <Image src="/images/backgrounds/..." alt="" fill className="object-cover" loading="lazy" />
    <div className="absolute inset-0 bg-arcana-bg/50" />
  </div>
  <ParticleOverlay density="low" />
  {/* 콘텐츠 — 스테이지 height로 높이 지배 */}
</div>
```

## 디자인 토큰

| 요소 | 클래스 |
|------|--------|
| 카드 배경 | `bg-arcana-card/70 backdrop-blur-sm border border-arcana-border rounded-2xl` |
| 제목 | `font-serif font-bold text-arcana-purple` |
| 본문 | `text-arcana-text text-sm leading-relaxed` |
| 보조 텍스트 | `text-arcana-muted text-xs` |
| 메인 버튼 | `rounded-full bg-gradient-to-r from-arcana-purple to-arcana-indigo text-white font-serif font-bold` |
| 보조 버튼 | `rounded-full border border-arcana-purple text-arcana-purple font-serif font-bold` |
| 골드 강조 | `text-arcana-gold` |

## 네비게이션 연동

새 페이지가 주요 섹션이면 Header.tsx와 MobileNav.tsx에 링크 추가.
Footer.tsx에도 적절한 카테고리에 추가.

## 검증

```bash
pnpm tsc --noEmit
pnpm lint
```
