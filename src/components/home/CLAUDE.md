# src/components/home/ 가이드

홈 페이지(`src/app/page.tsx`)에서 사용하는 섹션 컴포넌트 모음. 각 컴포넌트는 독립적인 섹션을 담당한다.

## 컴포넌트 목록

| 파일 | 역할 |
|------|------|
| `HeroSection.tsx` | 최상단 히어로 배너, 캐릭터 소개 |
| `CharacterGallery.tsx` | 12캐릭터 갤러리, 캐릭터 선택 UI |
| `SkinGallery.tsx` | 카드 스타일(4종) + 팔레트 스킨(6종) 선택 — 홈 전용, 총 10개 |
| `DailyFortune.tsx` | 오늘의 운세 (5개 영역: 종합·연애·직장·건강·재물) |
| `ServiceFlow.tsx` | 서비스 이용 흐름 설명 |
| `GenderFilter.tsx` | 캐릭터 성별 필터 |
| `BottomCTA.tsx` | 하단 CTA 버튼 |
| `FAQ.tsx` | 자주 묻는 질문 |

## SkinGallery 핵심 패턴

카드 스타일(아트)과 팔레트 스킨은 **상호 배타적 단일 선택**이며, 이 모드는 `useCardStyleStore.useSkinMode`로 전역 관리한다 (로컬 state 금지 — 카드 렌더링 컴포넌트가 같은 모드를 참조해야 동기화된다).

```tsx
const { useSkinMode, setStyleOverride, enableSkinMode, resolvedStyle } = useCardStyleStore();
const isStyleMode = !useSkinMode;
const currentStyleId = resolvedStyle(activeTheme); // 스킨 모드면 null

// 스타일 선택 → setStyleOverride가 자동으로 useSkinMode를 false로 초기화
const handleStyleSelect = (styleId: CardStyleId) => {
  setStyleOverride(styleId);
};

// 스킨 선택 → enableSkinMode() 호출로 카드 렌더링이 styleId 대신 skinId를 사용
const handleSkinSelect = (skinId: string) => {
  setSkin(skinId);
  enableSkinMode();
};
```

선택 강조 조건: `isStyleMode && currentStyleId === style.id` (스타일) / `useSkinMode && selectedSkinId === skin.id` (스킨).

**중요**: 카드 consumer(`CardDeck`, `CardSpread`, `DailyFortune`, `ShuffleCeremony`, `ResultCardFace`)는 `resolvedStyle()`이 `null`이면 `styleId`를 `undefined`로 전달해 `CardFace`/`CardBack`이 `skinId` 경로를 타도록 한다.

## 스토어 의존성

```
useSkinStore         → selectedSkinId, setSkin (persist: arcana-skin)
useCardStyleStore    → styleOverride, useSkinMode, setStyleOverride, clearOverride, enableSkinMode, resolvedStyle (persist: arcana-card-style)
useThemeStore        → activeTheme (테마 → 스타일 자동 매핑에 사용)
```

## 레이아웃 규칙

- 캐릭터가 등장하는 섹션(CharacterGallery 등)은 데스크탑 5:5 규칙 준수 (좌: 캐릭터, 우: 콘텐츠)
- 모바일에서는 세로 스택 배치
- `100dvh` 사용 (`100vh` 금지)
- `<Image fill>` 사용 시 `sizes` prop 필수

## 주의사항

- `SkinGallery`는 홈 페이지 전용이며 **10개** 버튼(아트 스타일 4 + 팔레트 스킨 6). 설정 페이지의 `src/app/settings/page.tsx`는 테마 자동 매핑 버튼 1개가 추가되어 **11개**.
- 홈 페이지에서 `useSkinMode` 모드 전환 패턴을 수정하면 설정 페이지도 동일하게 수정해야 한다 (두 곳에 같은 패턴 존재).
- 텍스트는 `useT()` / `t()` 훅으로 노출. 하드코딩 금지.
