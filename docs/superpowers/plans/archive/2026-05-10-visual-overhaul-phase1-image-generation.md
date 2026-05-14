# Visual Overhaul Phase 1: 이미지 재생성 시스템 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Replicate API(Flux 1.1 Pro Ultra)로 타로 카드 312장·배경 21장·데코 12장을 4가지 아트 스타일로 자동 생성하고, 테마-스타일 자동 매핑 + 사용자 오버라이드가 가능한 카드 스타일 시스템을 구축한다.

**Architecture:** scripts/generate-assets/ 오케스트레이터가 Replicate API를 5개 병렬로 호출해 이미지를 생성·저장한다. useCardStyleStore(Zustand+persist)가 활성 테마 → 스타일 자동 매핑을 제공하고 사용자 오버라이드를 localStorage에 저장한다. CardFace/CardItem이 styleId를 받아 /images/cards/[style]/[suit]/[id].webp 경로에서 이미지를 로드한다.

**Tech Stack:** Replicate API, TypeScript, Zustand, Next.js Image, WebP

---

## 사전 조건

- `REPLICATE_API_KEY` 환경변수 설정 필요 (`.env.local`에 추가)
- `pnpm add -D replicate` 설치 필요 (Task 5에서 처리)
- 기존 `useSkinStore` / `cardSkins` 데이터는 삭제하지 않고 유지

---

## 이미지 경로 구조

```
public/images/cards/[styleId]/major/[00-21].webp      (22장 × 4 = 88장)
public/images/cards/[styleId]/cups/[01-14].webp       (14장 × 4 = 56장)
public/images/cards/[styleId]/wands/[01-14].webp      (14장 × 4 = 56장)
public/images/cards/[styleId]/swords/[01-14].webp     (14장 × 4 = 56장)
public/images/cards/[styleId]/pentacles/[01-14].webp  (14장 × 4 = 56장)
public/images/cards/[styleId]/card-back.webp          (4장)
public/images/backgrounds/[service]/[theme].webp      (3×7=21장)
public/images/backgrounds/deco/[styleId].webp         (4장)
```

총 생성 수: 78장 × 4스타일 = 312장 + 카드뒷면 4장 + 배경 21장 + 데코 4장 = **341장**

---

## Task 1: CardStyle 타입 및 데이터 정의

**파일:** `src/data/cardStyles.ts` (신규)

- [x] `CardStyleId` 타입 정의 (`'dark-fantasy' | 'art-nouveau' | 'anime-mystical' | 'modern-digital'`)
- [x] `CardStyle` 인터페이스 정의 (id, name, nameKo, nameJa, description, descriptionEn, descriptionJa, previewCards)
- [x] 4개 스타일 데이터 배열 `cardStyles` 정의
- [x] 테마 → 스타일 매핑 `THEME_TO_STYLE_MAP` 상수 정의
- [x] 헬퍼 함수 `getStyleById`, `getStyleName`, `getStyleDescription` 추가
- [x] 검증: `pnpm type-check && pnpm lint`
- [x] 커밋: `git commit -m "feat: add CardStyle types and theme-to-style mapping"`

```typescript
// src/data/cardStyles.ts
export type CardStyleId = 'dark-fantasy' | 'art-nouveau' | 'anime-mystical' | 'modern-digital';

export interface CardStyle {
  id: CardStyleId;
  name: string;
  nameKo: string;
  nameJa?: string;
  description: string;
  descriptionEn?: string;
  descriptionJa?: string;
  /** 스타일 선택 UI 미리보기용 카드 ID */
  previewCards: string[];
}

export const cardStyles: CardStyle[] = [
  {
    id: 'dark-fantasy',
    name: 'Dark Fantasy',
    nameKo: '다크 판타지',
    nameJa: 'ダークファンタジー',
    description: '어둠의 마법과 고딕 판타지가 어우러진 신비로운 세계',
    descriptionEn: 'A mysterious world where dark magic meets gothic fantasy',
    descriptionJa: '闇の魔法とゴシックファンタジーが融合した神秘の世界',
    previewCards: ['major-13', 'major-15', 'major-16', 'major-18'],
  },
  {
    id: 'art-nouveau',
    name: 'Art Nouveau',
    nameKo: '아르누보',
    nameJa: 'アール・ヌーヴォー',
    description: '자연의 곡선과 금빛 장식이 어우러진 세기말 예술 양식',
    descriptionEn: 'Fin-de-siècle art style with flowing natural curves and golden ornaments',
    descriptionJa: '自然の曲線と金の装飾が織りなす世紀末芸術様式',
    previewCards: ['major-02', 'major-03', 'major-17', 'major-21'],
  },
  {
    id: 'anime-mystical',
    name: 'Anime Mystical',
    nameKo: '애니메 미스티컬',
    nameJa: 'アニメ・ミスティカル',
    description: '일본 애니메이션 스타일의 생동감 넘치는 신비로운 타로',
    descriptionEn: 'Vivid and mystical tarot in Japanese anime illustration style',
    descriptionJa: '日本アニメスタイルの生き生きとした神秘的なタロット',
    previewCards: ['major-00', 'major-01', 'major-19', 'major-20'],
  },
  {
    id: 'modern-digital',
    name: 'Modern Digital',
    nameKo: '모던 디지털',
    nameJa: 'モダン・デジタル',
    description: '홀로그램과 디지털 아트가 결합된 미래적 타로 비전',
    descriptionEn: 'Futuristic tarot vision combining holographic and digital art',
    descriptionJa: 'ホログラムとデジタルアートが融合した未来的タロットビジョン',
    previewCards: ['major-01', 'major-07', 'major-10', 'major-16'],
  },
];

export const DEFAULT_STYLE_ID: CardStyleId = 'dark-fantasy';

/** 테마 ID → 카드 스타일 ID 자동 매핑 */
export const THEME_TO_STYLE_MAP: Record<string, CardStyleId> = {
  midnight: 'dark-fantasy',
  dawn: 'art-nouveau',
  sunset: 'modern-digital',
  spring: 'anime-mystical',
  summer: 'anime-mystical',
  autumn: 'dark-fantasy',
  winter: 'art-nouveau',
};

export function getStyleById(id: string): CardStyle | undefined {
  return cardStyles.find((s) => s.id === id);
}

export function getStyleName(style: CardStyle, locale: string): string {
  if (locale === 'en') return style.name;
  if (locale === 'ja' && style.nameJa) return style.nameJa;
  return style.nameKo;
}

export function getStyleDescription(style: CardStyle, locale: string): string {
  if (locale === 'en' && style.descriptionEn) return style.descriptionEn;
  if (locale === 'ja' && style.descriptionJa) return style.descriptionJa;
  return style.description;
}
```

---

## Task 2: useCardStyleStore Zustand 스토어

**파일:** `src/hooks/useCardStyleStore.ts` (신규)

- [x] `CardStyleState` 인터페이스 정의: `styleOverride`, `setStyleOverride`, `clearOverride`, `resolvedStyle` 셀렉터
- [x] `useCardStyleStore` Zustand persist 스토어 생성 (스토리지 키: `"arcana-card-style"`)
- [x] `resolvedStyle(activeTheme)` 헬퍼 함수: override 있으면 override 반환, 없으면 `THEME_TO_STYLE_MAP[activeTheme]` 반환
- [x] 커밋: `git commit -m "feat: add useCardStyleStore with theme-to-style auto mapping"`

```typescript
// src/hooks/useCardStyleStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  CardStyleId,
  DEFAULT_STYLE_ID,
  THEME_TO_STYLE_MAP,
} from '@/data/cardStyles';

interface CardStyleState {
  /** 사용자가 명시적으로 선택한 스타일 오버라이드 (null = 테마 자동 매핑 사용) */
  styleOverride: CardStyleId | null;
  setStyleOverride: (styleId: CardStyleId) => void;
  clearOverride: () => void;
  /** 현재 활성 테마 기반으로 최종 스타일 ID 반환 */
  resolvedStyle: (activeTheme: string) => CardStyleId;
}

export const useCardStyleStore = create<CardStyleState>()(
  persist(
    (set, get) => ({
      styleOverride: null,

      setStyleOverride: (styleId: CardStyleId) =>
        set({ styleOverride: styleId }),

      clearOverride: () => set({ styleOverride: null }),

      resolvedStyle: (activeTheme: string): CardStyleId => {
        const { styleOverride } = get();
        if (styleOverride !== null) return styleOverride;
        return (THEME_TO_STYLE_MAP[activeTheme] as CardStyleId) ?? DEFAULT_STYLE_ID;
      },
    }),
    {
      name: 'arcana-card-style',
    }
  )
);
```

---

## Task 3: getCardStyleImageUrl 스토리지 유틸리티

**파일:** `src/lib/storage/card-style.ts` (신규)

- [x] `getCardStyleImageUrl(styleId, cardId)` 함수 구현: cardId 파싱 → `/images/cards/${styleId}/${suit}/${number}.webp` 반환
- [x] `getCardStyleBackUrl(styleId)` 함수 구현: `/images/cards/${styleId}/card-back.webp` 반환
- [x] cardId 파싱 로직: `"major-00"` → `{ suit: "major", number: "00" }`, `"cups-01"` → `{ suit: "cups", number: "01" }` 등
- [x] 단위 테스트 파일 `src/__tests__/lib/storage/card-style.test.ts` 작성
- [x] 검증: `pnpm type-check && pnpm lint && pnpm test:coverage`
- [x] 커밋: `git commit -m "feat: add getCardStyleImageUrl and unit tests"`

```typescript
// src/lib/storage/card-style.ts
import type { CardStyleId } from '@/data/cardStyles';

interface ParsedCardId {
  suit: string;
  number: string;
}

/**
 * 타로 카드 ID를 suit과 number로 파싱한다.
 * "major-00" → { suit: "major", number: "00" }
 * "cups-01"  → { suit: "cups", number: "01" }
 */
function parseCardId(cardId: string): ParsedCardId {
  const parts = cardId.split('-');
  if (parts.length !== 2) {
    throw new Error(`Invalid cardId format: "${cardId}". Expected "suit-number".`);
  }
  return { suit: parts[0], number: parts[1] };
}

/**
 * 카드 스타일 이미지 URL을 반환한다.
 * 경로: /images/cards/[styleId]/[suit]/[number].webp
 */
export function getCardStyleImageUrl(styleId: CardStyleId, cardId: string): string {
  const { suit, number } = parseCardId(cardId);
  return `/images/cards/${styleId}/${suit}/${number}.webp`;
}

/**
 * 카드 뒷면 스타일 이미지 URL을 반환한다.
 * 경로: /images/cards/[styleId]/card-back.webp
 */
export function getCardStyleBackUrl(styleId: CardStyleId): string {
  return `/images/cards/${styleId}/card-back.webp`;
}
```

```typescript
// src/__tests__/lib/storage/card-style.test.ts
import { describe, it, expect } from 'vitest';
import {
  getCardStyleImageUrl,
  getCardStyleBackUrl,
} from '@/lib/storage/card-style';

describe('getCardStyleImageUrl', () => {
  it('Major Arcana 카드 URL을 올바르게 반환한다', () => {
    expect(getCardStyleImageUrl('dark-fantasy', 'major-00')).toBe(
      '/images/cards/dark-fantasy/major/00.webp'
    );
    expect(getCardStyleImageUrl('dark-fantasy', 'major-21')).toBe(
      '/images/cards/dark-fantasy/major/21.webp'
    );
  });

  it('Cups 슈트 카드 URL을 올바르게 반환한다', () => {
    expect(getCardStyleImageUrl('art-nouveau', 'cups-01')).toBe(
      '/images/cards/art-nouveau/cups/01.webp'
    );
    expect(getCardStyleImageUrl('art-nouveau', 'cups-14')).toBe(
      '/images/cards/art-nouveau/cups/14.webp'
    );
  });

  it('Wands 슈트 카드 URL을 올바르게 반환한다', () => {
    expect(getCardStyleImageUrl('anime-mystical', 'wands-07')).toBe(
      '/images/cards/anime-mystical/wands/07.webp'
    );
  });

  it('Swords 슈트 카드 URL을 올바르게 반환한다', () => {
    expect(getCardStyleImageUrl('modern-digital', 'swords-10')).toBe(
      '/images/cards/modern-digital/swords/10.webp'
    );
  });

  it('Pentacles 슈트 카드 URL을 올바르게 반환한다', () => {
    expect(getCardStyleImageUrl('dark-fantasy', 'pentacles-14')).toBe(
      '/images/cards/dark-fantasy/pentacles/14.webp'
    );
  });

  it('잘못된 cardId 형식에서 에러를 던진다', () => {
    expect(() => getCardStyleImageUrl('dark-fantasy', 'invalid')).toThrow(
      'Invalid cardId format'
    );
  });
});

describe('getCardStyleBackUrl', () => {
  it('카드 뒷면 URL을 올바르게 반환한다', () => {
    expect(getCardStyleBackUrl('dark-fantasy')).toBe(
      '/images/cards/dark-fantasy/card-back.webp'
    );
    expect(getCardStyleBackUrl('anime-mystical')).toBe(
      '/images/cards/anime-mystical/card-back.webp'
    );
  });
});
```

---

## Task 4: 카드 컴포넌트 styleId prop 추가

**파일:** `src/components/card/CardFace.tsx`, `src/components/card/CardBack.tsx`, `src/components/card/CardItem.tsx` (수정)

우선순위: `styleId` → `skinId` → SVG fallback

- [x] `CardFace`: `styleId?: CardStyleId` prop 추가, `getCardStyleImageUrl` import, `styleId && !imageError` 분기를 `skinId && !imageError` 분기 위에 추가
- [x] `CardBack`: `styleId?: CardStyleId` prop 추가, `getCardStyleBackUrl` import, `styleId && !imageError` 분기를 `skinId && !imageError` 분기 위에 추가
- [x] `CardItem`: `styleId?: CardStyleId` prop 추가, `CardFace`/`CardBack` 전달
- [x] 검증: `pnpm type-check && pnpm lint`
- [x] 커밋: `git commit -m "feat: add styleId prop to CardFace, CardBack, CardItem"`

```typescript
// src/components/card/CardFace.tsx — 수정 부분만 발췌
// 기존 import에 추가:
import { getCardStyleImageUrl } from '@/lib/storage/card-style';
import type { CardStyleId } from '@/data/cardStyles';

// interface CardFaceProps에 추가:
readonly styleId?: CardStyleId;

// 함수 시그니처 수정:
export function CardFace({ card, isReversed, size = 'md', width, height, className = '', skinId, styleId }: CardFaceProps) {
  // ...기존 코드...

  // styleId 분기 (skinId 분기 위에 삽입):
  if (styleId && !imageError) {
    return (
      <div
        className={`relative rounded-lg overflow-hidden ${isReversed ? 'rotate-180' : ''} ${className}`}
        style={{ width: w, height: h }}
      >
        <Image
          src={getCardStyleImageUrl(styleId, card.id)}
          alt={getCardName(card, locale)}
          fill
          sizes={`${Math.max(w, h)}px`}
          unoptimized
          onError={() => setImageError(true)}
          className="object-cover"
        />
        {isReversed && (
          <span className="absolute top-1 right-1 text-[8px] text-red-400 bg-red-900/40 px-1 rounded rotate-180">
            {t('tarot.result.card.reversed-badge', locale)}
          </span>
        )}
      </div>
    );
  }

  // 기존 skinId 분기는 그대로 유지
  if (skinId && !imageError) { ... }
```

```typescript
// src/components/card/CardBack.tsx — 수정 부분만 발췌
import { getCardStyleBackUrl } from '@/lib/storage/card-style';
import type { CardStyleId } from '@/data/cardStyles';

// interface CardBackProps에 추가:
readonly styleId?: CardStyleId;

export function CardBack({ size = 'md', width, height, className = '', skinId, styleId }: CardBackProps) {
  // ...기존 코드...

  // styleId 분기 (skinId 분기 위에 삽입):
  if (styleId && !imageError) {
    return (
      <div className={`relative rounded-lg overflow-hidden ${className}`} style={{ width: w, height: h }}>
        <Image
          src={getCardStyleBackUrl(styleId)}
          alt={t('common.card.back-alt')}
          fill
          sizes={`${Math.max(w, h)}px`}
          unoptimized
          onError={() => setImageError(true)}
          className="object-cover"
        />
      </div>
    );
  }

  // 기존 skinId 분기는 그대로 유지
  if (skinId && !imageError) { ... }
```

```typescript
// src/components/card/CardItem.tsx — interface CardItemProps에 추가:
import type { CardStyleId } from '@/data/cardStyles';
readonly styleId?: CardStyleId;

// 함수 시그니처 수정 (skinId 뒤에 styleId 추가):
export function CardItem({ ..., skinId, styleId, glowColor }: CardItemProps) {
  // CardBack 전달:
  <CardBack size={size} width={width} height={height} className="w-full h-full" skinId={skinId} styleId={styleId} />
  // CardFace 전달:
  <CardFace card={card} isReversed={isReversed} size={size} width={width} height={height} className="w-full h-full" skinId={skinId} styleId={styleId} />
```

---

## Task 5: useCardStyleStore 단위 테스트

**파일:** `src/__tests__/hooks/useCardStyleStore.test.ts` (신규)

- [x] `resolvedStyle` 함수 테스트: 테마별 자동 매핑 7가지 모두 검증
- [x] `setStyleOverride` / `clearOverride` 동작 검증
- [x] override가 null일 때 테마 매핑 사용 확인
- [x] override가 설정됐을 때 테마 무관하게 override 반환 확인
- [x] 검증: `pnpm test:coverage`
- [x] 커밋: `git commit -m "test: add useCardStyleStore unit tests"`

```typescript
// src/__tests__/hooks/useCardStyleStore.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useCardStyleStore } from '@/hooks/useCardStyleStore';

describe('useCardStyleStore', () => {
  beforeEach(() => {
    // 각 테스트 전 스토어 초기화
    useCardStyleStore.setState({ styleOverride: null });
  });

  describe('resolvedStyle — 테마 자동 매핑', () => {
    it('midnight → dark-fantasy를 반환한다', () => {
      const { result } = renderHook(() => useCardStyleStore());
      expect(result.current.resolvedStyle('midnight')).toBe('dark-fantasy');
    });

    it('dawn → art-nouveau를 반환한다', () => {
      const { result } = renderHook(() => useCardStyleStore());
      expect(result.current.resolvedStyle('dawn')).toBe('art-nouveau');
    });

    it('sunset → modern-digital을 반환한다', () => {
      const { result } = renderHook(() => useCardStyleStore());
      expect(result.current.resolvedStyle('sunset')).toBe('modern-digital');
    });

    it('spring → anime-mystical을 반환한다', () => {
      const { result } = renderHook(() => useCardStyleStore());
      expect(result.current.resolvedStyle('spring')).toBe('anime-mystical');
    });

    it('summer → anime-mystical을 반환한다', () => {
      const { result } = renderHook(() => useCardStyleStore());
      expect(result.current.resolvedStyle('summer')).toBe('anime-mystical');
    });

    it('autumn → dark-fantasy를 반환한다', () => {
      const { result } = renderHook(() => useCardStyleStore());
      expect(result.current.resolvedStyle('autumn')).toBe('dark-fantasy');
    });

    it('winter → art-nouveau를 반환한다', () => {
      const { result } = renderHook(() => useCardStyleStore());
      expect(result.current.resolvedStyle('winter')).toBe('art-nouveau');
    });

    it('알 수 없는 테마는 dark-fantasy(기본값)를 반환한다', () => {
      const { result } = renderHook(() => useCardStyleStore());
      expect(result.current.resolvedStyle('unknown-theme')).toBe('dark-fantasy');
    });
  });

  describe('setStyleOverride / clearOverride', () => {
    it('override 설정 후 테마 무관하게 override를 반환한다', () => {
      const { result } = renderHook(() => useCardStyleStore());
      act(() => {
        result.current.setStyleOverride('anime-mystical');
      });
      expect(result.current.resolvedStyle('midnight')).toBe('anime-mystical');
      expect(result.current.resolvedStyle('dawn')).toBe('anime-mystical');
    });

    it('clearOverride 후 테마 자동 매핑으로 복귀한다', () => {
      const { result } = renderHook(() => useCardStyleStore());
      act(() => {
        result.current.setStyleOverride('anime-mystical');
      });
      act(() => {
        result.current.clearOverride();
      });
      expect(result.current.styleOverride).toBeNull();
      expect(result.current.resolvedStyle('midnight')).toBe('dark-fantasy');
    });
  });
});
```

---

## Task 6: CardStyleSelector UI 컴포넌트

**파일:** `src/components/card/CardStyleSelector.tsx` (신규)

- [x] 4개 스타일 버튼 그리드 렌더링 (현재 선택 스타일 하이라이트)
- [x] "테마 자동 매핑" 버튼 포함 (override 해제)
- [x] 스타일 선택 시 `setStyleOverride` / "자동" 선택 시 `clearOverride` 호출
- [x] 현재 활성 테마 표시 (`useThemeStore` 연동)
- [x] i18n: 번역 키 `settings.card-style.*` 사용 (translations에 추가 필요)
- [x] 검증: `pnpm type-check && pnpm lint`
- [x] 커밋: `git commit -m "feat: add CardStyleSelector component"`

```typescript
// src/components/card/CardStyleSelector.tsx
'use client';

import { useThemeStore } from '@/hooks/useTheme';
import { useCardStyleStore } from '@/hooks/useCardStyleStore';
import { cardStyles, getStyleName, getStyleDescription } from '@/data/cardStyles';
import { useLocaleStore } from '@/hooks/useLocaleStore';
import { useT } from '@/i18n/useT';

export function CardStyleSelector() {
  const { t } = useT();
  const locale = useLocaleStore((s) => s.locale);
  const { activeTheme } = useThemeStore();
  const { styleOverride, setStyleOverride, clearOverride, resolvedStyle } = useCardStyleStore();

  const activeStyleId = resolvedStyle(activeTheme);

  return (
    <div className="space-y-3">
      {/* 자동 매핑 버튼 */}
      <button
        onClick={clearOverride}
        className={`w-full flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm transition-all ${
          styleOverride === null
            ? 'border-arcana-purple bg-arcana-purple/15 text-arcana-purple shadow-sm'
            : 'border-arcana-border/50 text-arcana-muted hover:border-arcana-border'
        }`}
      >
        <span className="text-base">🎨</span>
        <span className="font-sans font-medium">{t('settings.card-style.auto-label')}</span>
        {styleOverride === null && (
          <span className="ml-auto text-xs text-arcana-muted">
            {t('settings.card-style.auto-active')} ({activeStyleId})
          </span>
        )}
      </button>

      {/* 4개 스타일 버튼 */}
      <div className="grid grid-cols-2 gap-2">
        {cardStyles.map((style) => {
          const isActive = styleOverride === style.id;
          return (
            <button
              key={style.id}
              onClick={() => setStyleOverride(style.id)}
              className={`flex flex-col items-start gap-0.5 p-3 rounded-xl border text-left transition-all ${
                isActive
                  ? 'border-arcana-purple bg-arcana-purple/15 text-arcana-purple shadow-sm'
                  : 'border-arcana-border/50 text-arcana-muted hover:border-arcana-border'
              }`}
            >
              <span className="font-sans font-semibold text-sm">
                {getStyleName(style, locale)}
              </span>
              <span className="text-xs leading-snug opacity-70">
                {getStyleDescription(style, locale)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

---

## Task 7: 설정 페이지에 CardStyleSelector 통합

**파일:** `src/app/settings/page.tsx` (수정)

- [x] `CardStyleSelector` import 추가
- [x] `useSkinStore` import와 스킨 섹션은 유지 (기존 palette 시스템 보존)
- [x] 테마 섹션 바로 아래에 카드 스타일 섹션(`<section>`) 추가
- [x] i18n 번역 키 `settings.section.card-style`, `settings.card-style.auto-label`, `settings.card-style.auto-active` 추가 (ko/en/ja 모두)
- [x] 검증: `pnpm type-check && pnpm lint && pnpm i18n:check`
- [x] 커밋: `git commit -m "feat: integrate CardStyleSelector into settings page"`

```typescript
// src/app/settings/page.tsx — 추가 import
import { CardStyleSelector } from '@/components/card/CardStyleSelector';

// 테마 <section> 바로 아래에 삽입:
{/* 카드 스타일 */}
<section className="bg-arcana-card/70 backdrop-blur-sm border border-arcana-border rounded-2xl p-5">
  <h2 className="font-sans font-bold text-base md:text-lg text-arcana-text mb-1">
    {t('settings.section.card-style')}
  </h2>
  <p className="text-arcana-muted text-xs mb-4">
    {t('settings.card-style.description')}
  </p>
  <CardStyleSelector />
</section>
```

**번역 키 추가 위치:** `src/i18n/translations/` 내 ko/en/ja 파일

```typescript
// 추가할 번역 키 (ko)
'settings.section.card-style': '카드 아트 스타일',
'settings.card-style.description': '타로 카드의 아트 스타일을 선택합니다. 기본값은 현재 테마에 맞게 자동 설정됩니다.',
'settings.card-style.auto-label': '테마 자동 매핑',
'settings.card-style.auto-active': '현재 적용 중',

// 추가할 번역 키 (en)
'settings.section.card-style': 'Card Art Style',
'settings.card-style.description': 'Choose the art style for tarot cards. Defaults to auto-mapping based on the current theme.',
'settings.card-style.auto-label': 'Auto (Theme)',
'settings.card-style.auto-active': 'Currently active',

// 추가할 번역 키 (ja)
'settings.section.card-style': 'カードアートスタイル',
'settings.card-style.description': 'タロットカードのアートスタイルを選択します。デフォルトは現在のテーマに応じて自動設定されます。',
'settings.card-style.auto-label': 'テーマ自動マッピング',
'settings.card-style.auto-active': '現在適用中',
```

---

## Task 8: 이미지 생성 스크립트 — config.ts

**파일:** `scripts/generate-assets/config.ts` (신규)

- [x] `REPLICATE_MODEL` 상수 (`black-forest-labs/flux-1.1-pro-ultra`)
- [x] `CONCURRENT_JOBS` 상수 (`5`)
- [x] `OUTPUT_FORMAT` 상수 (`"webp"`)
- [x] 카드 슈트별 ID 배열 (major 22장, cups/wands/swords/pentacles 각 14장)
- [x] `STYLE_IDS` 배열 (`['dark-fantasy', 'art-nouveau', 'anime-mystical', 'modern-digital']`)
- [x] `MAJOR_ARCANA_NAMES` 매핑 (0~21번 영어 이름)
- [x] `SUIT_RANK_NAMES` 매핑 (1~14번: Ace~10, Page, Knight, Queen, King)
- [x] `OUTPUT_BASE_DIR` 상수 (`"public/images/cards"`)
- [x] `BACKUP_DIR` 상수 (`\`public/images/backup/${new Date().toISOString().slice(0, 10)}\``)
- [x] 커밋: `git commit -m "feat: add generate-assets config"`

```typescript
// scripts/generate-assets/config.ts
export const REPLICATE_MODEL = 'black-forest-labs/flux-1.1-pro-ultra';
export const CONCURRENT_JOBS = 5;
export const OUTPUT_FORMAT = 'webp' as const;
export const OUTPUT_BASE_DIR = 'public/images/cards';
export const BACKGROUNDS_DIR = 'public/images/backgrounds';
export const BACKUP_DIR = `public/images/backup/${new Date().toISOString().slice(0, 10)}`;

export type CardStyleId = 'dark-fantasy' | 'art-nouveau' | 'anime-mystical' | 'modern-digital';

export const STYLE_IDS: CardStyleId[] = [
  'dark-fantasy',
  'art-nouveau',
  'anime-mystical',
  'modern-digital',
];

export const MAJOR_ARCANA_NAMES: Record<number, string> = {
  0: 'The Fool',
  1: 'The Magician',
  2: 'The High Priestess',
  3: 'The Empress',
  4: 'The Emperor',
  5: 'The Hierophant',
  6: 'The Lovers',
  7: 'The Chariot',
  8: 'Strength',
  9: 'The Hermit',
  10: 'The Wheel of Fortune',
  11: 'Justice',
  12: 'The Hanged Man',
  13: 'Death',
  14: 'Temperance',
  15: 'The Devil',
  16: 'The Tower',
  17: 'The Star',
  18: 'The Moon',
  19: 'The Sun',
  20: 'Judgement',
  21: 'The World',
};

export const SUIT_RANK_NAMES: Record<number, string> = {
  1: 'Ace',
  2: 'Two',
  3: 'Three',
  4: 'Four',
  5: 'Five',
  6: 'Six',
  7: 'Seven',
  8: 'Eight',
  9: 'Nine',
  10: 'Ten',
  11: 'Page',
  12: 'Knight',
  13: 'Queen',
  14: 'King',
};

export const SUITS = ['cups', 'wands', 'swords', 'pentacles'] as const;
export type Suit = typeof SUITS[number];

/** 생성할 이미지 목록 항목 */
export interface CardTarget {
  styleId: CardStyleId;
  suit: 'major' | Suit;
  number: string;
  cardName: string;
  outputPath: string;
}

/** 배경 이미지 생성 목록 항목 */
export interface BackgroundTarget {
  service: 'tarot' | 'saju' | 'shinjeom';
  theme: string;
  outputPath: string;
}

/** 데코 이미지 생성 목록 항목 */
export interface DecoTarget {
  styleId: CardStyleId;
  outputPath: string;
}
```

---

## Task 9: 이미지 생성 스크립트 — replicate.ts

**파일:** `scripts/generate-assets/replicate.ts` (신규)

- [x] `pnpm add -D replicate` 실행 (lockfile 변동 확인)
- [x] Replicate API 클라이언트 초기화 (`REPLICATE_API_KEY` 환경변수 검증)
- [x] `generateImage(prompt, outputPath)` 함수: Replicate API 호출 → WebP 다운로드 → 파일 저장
- [x] 재시도 로직: 최대 3회, 지수 백오프 (1s, 2s, 4s)
- [x] `downloadImage(url, outputPath)` 헬퍼: HTTP 응답을 파일로 스트리밍
- [x] 커밋: `git commit -m "feat: add Replicate API client for image generation"`

```typescript
// scripts/generate-assets/replicate.ts
import Replicate from 'replicate';
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as http from 'http';
import { REPLICATE_MODEL, OUTPUT_FORMAT } from './config';

const apiKey = process.env.REPLICATE_API_KEY;
if (!apiKey) {
  throw new Error('REPLICATE_API_KEY 환경변수가 설정되지 않았습니다.');
}

const replicate = new Replicate({ auth: apiKey });

async function downloadImage(url: string, outputPath: string): Promise<void> {
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(outputPath);
    protocol.get(url, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(outputPath, () => {});
      reject(err);
    });
  });
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 이미지를 생성하고 지정된 경로에 저장한다.
 * 실패 시 최대 3회까지 지수 백오프로 재시도한다.
 */
export async function generateImage(prompt: string, outputPath: string): Promise<void> {
  const maxRetries = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const output = await replicate.run(REPLICATE_MODEL, {
        input: {
          prompt,
          output_format: OUTPUT_FORMAT,
          aspect_ratio: '2:3',
          safety_tolerance: 2,
        },
      });

      // Replicate output은 URL 문자열 또는 ReadableStream일 수 있다
      const imageUrl = typeof output === 'string'
        ? output
        : Array.isArray(output)
          ? String(output[0])
          : String(output);

      await downloadImage(imageUrl, outputPath);
      return; // 성공 시 즉시 반환
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < maxRetries) {
        const delayMs = Math.pow(2, attempt - 1) * 1000;
        console.warn(`  [재시도 ${attempt}/${maxRetries}] ${delayMs}ms 후 재시도 중...`);
        await sleep(delayMs);
      }
    }
  }

  throw new Error(`이미지 생성 실패 (${maxRetries}회 재시도): ${lastError?.message}`);
}
```

---

## Task 10: 이미지 생성 스크립트 — prompts.ts

**파일:** `scripts/generate-assets/prompts.ts` (신규)

- [x] `buildCardPrompt(styleId, suit, number, cardName)` 함수: 스타일별 base prompt + 카드별 subject 조합
- [x] `buildBackPrompt(styleId)` 함수: 카드 뒷면 프롬프트
- [x] `buildBackgroundPrompt(service, theme)` 함수: 서비스/테마별 배경 프롬프트
- [x] `buildDecoPrompt(styleId)` 함수: 데코 이미지 프롬프트
- [x] 모든 프롬프트에 "no text, no letters, no watermarks, no signatures" 포함
- [x] 커밋: `git commit -m "feat: add image generation prompts for all 4 styles"`

```typescript
// scripts/generate-assets/prompts.ts
import type { CardStyleId, Suit } from './config';
import { MAJOR_ARCANA_NAMES, SUIT_RANK_NAMES } from './config';

const NEGATIVE_SUFFIX = ', no text, no letters, no watermarks, no signatures, no borders';

const STYLE_BASE_PROMPTS: Record<CardStyleId, string> = {
  'dark-fantasy':
    'dark gothic fantasy illustration, oil painting style, dramatic lighting, deep shadows, rich textures, dark purple and crimson palette, mysterious atmosphere, highly detailed fantasy art',
  'art-nouveau':
    'art nouveau illustration style, elegant flowing lines, botanical decorative elements, gold and ivory palette, ornate borders, Gustav Klimt inspired, fin-de-siecle aesthetic, detailed linework',
  'anime-mystical':
    'Japanese anime illustration style, vibrant colors, magical atmosphere, detailed character art, cel shading, mystical sparkles and light effects, pastel and jewel tones, Studio Ghibli inspired',
  'modern-digital':
    'modern digital art, holographic effects, neon accents, futuristic aesthetic, clean geometric shapes, glitch art elements, cyberpunk inspired, high contrast, electric blues and magentas',
};

function getSuitSubjectPrefix(suit: 'major' | Suit): string {
  switch (suit) {
    case 'major': return '';
    case 'cups': return 'water, chalice, emotions, intuition,';
    case 'wands': return 'fire, wooden staff, passion, creativity,';
    case 'swords': return 'air, sword, intellect, conflict,';
    case 'pentacles': return 'earth, pentacle coin, material wealth, nature,';
  }
}

/**
 * 타로 카드 정면 이미지 프롬프트를 생성한다.
 */
export function buildCardPrompt(
  styleId: CardStyleId,
  suit: 'major' | Suit,
  number: string,
  cardName: string
): string {
  const base = STYLE_BASE_PROMPTS[styleId];
  const suitPrefix = getSuitSubjectPrefix(suit);
  const subject = `tarot card "${cardName}", ${suitPrefix} symbolic tarot imagery`;
  return `${base}, ${subject}, tarot card illustration, portrait orientation${NEGATIVE_SUFFIX}`;
}

/**
 * 카드 뒷면 이미지 프롬프트를 생성한다.
 */
export function buildBackPrompt(styleId: CardStyleId): string {
  const base = STYLE_BASE_PROMPTS[styleId];
  return `${base}, tarot card back design, symmetrical mandala pattern, mystical geometric ornament, no face cards, abstract decorative pattern, portrait orientation${NEGATIVE_SUFFIX}`;
}

/**
 * 서비스별 배경 이미지 프롬프트를 생성한다.
 */
export function buildBackgroundPrompt(
  service: 'tarot' | 'saju' | 'shinjeom',
  theme: string
): string {
  const serviceDescriptions: Record<string, string> = {
    tarot: 'mystical tarot reading room, tarot cards on dark velvet',
    saju: 'Korean fortune telling, zodiac symbols, traditional celestial map',
    shinjeom: 'shamanic divination altar, spirit artifacts, sacred ritual space',
  };

  const themeDescriptions: Record<string, string> = {
    midnight: 'deep midnight blue, stars, moonlight, dark mystical atmosphere',
    dawn: 'purple predawn sky, gentle glow, misty morning, soft lavender tones',
    sunset: 'warm amber and orange sunset, golden hour light, dusk atmosphere',
    spring: 'cherry blossoms, soft pink and green, gentle spring breeze',
    summer: 'vivid blue sky, summer stars, electric atmosphere, warm deep night',
    autumn: 'fallen red and orange leaves, autumn mist, warm earth tones',
    winter: 'frozen landscape, moonlit snow, cold blue and white tones',
  };

  const serviceDesc = serviceDescriptions[service] ?? 'fortune telling space';
  const themeDesc = themeDescriptions[theme] ?? 'mystical atmosphere';

  return `wide landscape background illustration, ${serviceDesc}, ${themeDesc}, no characters, no people, atmospheric depth, cinematic composition, landscape orientation${NEGATIVE_SUFFIX}`;
}

/**
 * 데코 이미지 프롬프트를 생성한다.
 */
export function buildDecoPrompt(styleId: CardStyleId): string {
  const base = STYLE_BASE_PROMPTS[styleId];
  return `${base}, decorative ornamental element, tarot deck box cover design, intricate mandala, mystical symbol cluster, square composition, transparent background if possible${NEGATIVE_SUFFIX}`;
}

/**
 * 카드 ID에서 프롬프트용 카드 이름을 반환한다.
 * "major-00" → "The Fool", "cups-01" → "Ace of Cups"
 */
export function getCardNameForPrompt(suit: 'major' | Suit, numberStr: string): string {
  const num = parseInt(numberStr, 10);
  if (suit === 'major') {
    return MAJOR_ARCANA_NAMES[num] ?? `Major Arcana ${num}`;
  }
  const rankName = SUIT_RANK_NAMES[num] ?? String(num);
  const suitName = suit.charAt(0).toUpperCase() + suit.slice(1);
  return num === 1 ? `Ace of ${suitName}` : `${rankName} of ${suitName}`;
}
```

---

## Task 11: 이미지 생성 스크립트 — progress.ts

**파일:** `scripts/generate-assets/progress.ts` (신규)

- [x] `ProgressTracker` 클래스: total/completed/failed 카운터, 진행률 표시
- [x] `log(message)` 메서드: 타임스탬프 + 메시지 출력
- [x] `tick(success, label)` 메서드: 카운터 업데이트 + 인라인 진행률 표시
- [x] `summary()` 메서드: 최종 성공/실패 요약 출력
- [x] `PQueue` 기반 병렬 큐 유틸리티 함수 `runConcurrent(tasks, concurrency)` 구현
- [x] 커밋: `git commit -m "feat: add progress tracker and concurrent task runner"`

```typescript
// scripts/generate-assets/progress.ts

export class ProgressTracker {
  private completed = 0;
  private failed = 0;
  private readonly startTime: number;

  constructor(private readonly total: number) {
    this.startTime = Date.now();
  }

  log(message: string): void {
    const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(1);
    console.log(`[${elapsed}s] ${message}`);
  }

  tick(success: boolean, label: string): void {
    if (success) {
      this.completed++;
    } else {
      this.failed++;
    }
    const done = this.completed + this.failed;
    const pct = Math.round((done / this.total) * 100);
    const status = success ? 'OK' : 'FAIL';
    process.stdout.write(
      `\r[${status}] ${done}/${this.total} (${pct}%) | OK:${this.completed} FAIL:${this.failed} | ${label.slice(0, 50).padEnd(50)}`
    );
    if (done === this.total) {
      console.log(''); // 줄바꿈
    }
  }

  summary(): void {
    const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(1);
    console.log('\n=== 생성 완료 ===');
    console.log(`총 ${this.total}장 | 성공: ${this.completed} | 실패: ${this.failed} | 소요 시간: ${elapsed}s`);
    if (this.failed > 0) {
      console.warn(`주의: ${this.failed}장 생성 실패. public/images/cards/ 에서 누락 파일을 확인하세요.`);
    }
  }
}

/**
 * tasks 배열을 최대 concurrency 수만큼 병렬로 실행한다.
 */
export async function runConcurrent<T>(
  tasks: Array<() => Promise<T>>,
  concurrency: number
): Promise<Array<{ status: 'fulfilled'; value: T } | { status: 'rejected'; reason: unknown }>> {
  const results: Array<{ status: 'fulfilled'; value: T } | { status: 'rejected'; reason: unknown }> = [];
  let index = 0;

  async function runNext(): Promise<void> {
    while (index < tasks.length) {
      const currentIndex = index++;
      try {
        const value = await tasks[currentIndex]();
        results[currentIndex] = { status: 'fulfilled', value };
      } catch (reason) {
        results[currentIndex] = { status: 'rejected', reason };
      }
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, tasks.length) }, runNext);
  await Promise.all(workers);
  return results;
}
```

---

## Task 12: 이미지 생성 스크립트 — index.ts (메인 오케스트레이터)

**파일:** `scripts/generate-assets/index.ts` (신규)

- [x] `backupExistingImages()`: `public/images/cards/` 하위 파일을 `BACKUP_DIR`로 복사
- [x] `buildAllCardTargets()`: STYLE_IDS × (major 22 + 4 suits 14) = 312개 `CardTarget` 생성
- [x] `buildAllBackTargets()`: STYLE_IDS × 1 = 4개 카드뒷면 타겟 생성
- [x] `buildAllBackgroundTargets()`: 3 services × 7 themes = 21개 배경 타겟 생성
- [x] `buildAllDecoTargets()`: STYLE_IDS × 1 = 4개 데코 타겟 생성
- [x] 메인 함수: backup → 타겟 목록 구성 → `runConcurrent(CONCURRENT_JOBS)` 실행 → progress.summary()
- [x] 기존 파일 존재 시 스킵 옵션 (`--skip-existing` 플래그)
- [x] 커밋: `git commit -m "feat: add main image generation orchestrator"`

```typescript
// scripts/generate-assets/index.ts
import * as fs from 'fs';
import * as path from 'path';
import {
  STYLE_IDS,
  SUITS,
  OUTPUT_BASE_DIR,
  BACKGROUNDS_DIR,
  BACKUP_DIR,
  CONCURRENT_JOBS,
  type CardStyleId,
  type CardTarget,
  type BackgroundTarget,
  type DecoTarget,
  type Suit,
} from './config';
import { generateImage } from './replicate';
import {
  buildCardPrompt,
  buildBackPrompt,
  buildBackgroundPrompt,
  buildDecoPrompt,
  getCardNameForPrompt,
} from './prompts';
import { ProgressTracker, runConcurrent } from './progress';

const SKIP_EXISTING = process.argv.includes('--skip-existing');

/** public/images/cards/ 하위 기존 파일을 백업 디렉터리로 복사한다. */
function backupExistingImages(): void {
  if (!fs.existsSync(OUTPUT_BASE_DIR)) return;

  console.log(`기존 이미지 백업 중: ${OUTPUT_BASE_DIR} → ${BACKUP_DIR}`);
  fs.mkdirSync(BACKUP_DIR, { recursive: true });

  function copyRecursive(src: string, dest: string): void {
    const stat = fs.statSync(src);
    if (stat.isDirectory()) {
      fs.mkdirSync(dest, { recursive: true });
      for (const item of fs.readdirSync(src)) {
        copyRecursive(path.join(src, item), path.join(dest, item));
      }
    } else {
      fs.copyFileSync(src, dest);
    }
  }

  copyRecursive(OUTPUT_BASE_DIR, path.join(BACKUP_DIR, 'cards'));
  console.log('백업 완료.');
}

function buildAllCardTargets(): CardTarget[] {
  const targets: CardTarget[] = [];

  for (const styleId of STYLE_IDS) {
    // Major Arcana: 00~21
    for (let i = 0; i <= 21; i++) {
      const number = String(i).padStart(2, '0');
      const cardName = getCardNameForPrompt('major', number);
      targets.push({
        styleId,
        suit: 'major',
        number,
        cardName,
        outputPath: path.join(OUTPUT_BASE_DIR, styleId, 'major', `${number}.webp`),
      });
    }

    // Minor Arcana: 4 suits × 01~14
    for (const suit of SUITS) {
      for (let i = 1; i <= 14; i++) {
        const number = String(i).padStart(2, '0');
        const cardName = getCardNameForPrompt(suit, number);
        targets.push({
          styleId,
          suit,
          number,
          cardName,
          outputPath: path.join(OUTPUT_BASE_DIR, styleId, suit, `${number}.webp`),
        });
      }
    }
  }

  return targets;
}

function buildAllBackTargets(): Array<{ styleId: CardStyleId; outputPath: string }> {
  return STYLE_IDS.map((styleId) => ({
    styleId,
    outputPath: path.join(OUTPUT_BASE_DIR, styleId, 'card-back.webp'),
  }));
}

function buildAllBackgroundTargets(): BackgroundTarget[] {
  const services = ['tarot', 'saju', 'shinjeom'] as const;
  const themes = ['midnight', 'dawn', 'sunset', 'spring', 'summer', 'autumn', 'winter'];
  const targets: BackgroundTarget[] = [];

  for (const service of services) {
    for (const theme of themes) {
      targets.push({
        service,
        theme,
        outputPath: path.join(BACKGROUNDS_DIR, service, `${theme}.webp`),
      });
    }
  }

  return targets;
}

function buildAllDecoTargets(): DecoTarget[] {
  return STYLE_IDS.map((styleId) => ({
    styleId,
    outputPath: path.join(BACKGROUNDS_DIR, 'deco', `${styleId}.webp`),
  }));
}

async function main(): Promise<void> {
  console.log('=== Visual Overhaul Phase 1: 이미지 생성 시작 ===');
  console.log(`병렬 작업 수: ${CONCURRENT_JOBS}`);
  console.log(`기존 파일 스킵: ${SKIP_EXISTING}`);

  // 1. 기존 이미지 백업
  backupExistingImages();

  // 2. 생성 목록 구성
  const cardTargets = buildAllCardTargets();
  const backTargets = buildAllBackTargets();
  const bgTargets = buildAllBackgroundTargets();
  const decoTargets = buildAllDecoTargets();

  const allTasks: Array<() => Promise<{ label: string }>> = [];

  for (const target of cardTargets) {
    allTasks.push(async () => {
      const label = `${target.styleId}/${target.suit}/${target.number}`;
      if (SKIP_EXISTING && fs.existsSync(target.outputPath)) {
        return { label };
      }
      const prompt = buildCardPrompt(target.styleId, target.suit, target.number, target.cardName);
      await generateImage(prompt, target.outputPath);
      return { label };
    });
  }

  for (const target of backTargets) {
    allTasks.push(async () => {
      const label = `${target.styleId}/card-back`;
      if (SKIP_EXISTING && fs.existsSync(target.outputPath)) {
        return { label };
      }
      const prompt = buildBackPrompt(target.styleId);
      await generateImage(prompt, target.outputPath);
      return { label };
    });
  }

  for (const target of bgTargets) {
    allTasks.push(async () => {
      const label = `bg/${target.service}/${target.theme}`;
      if (SKIP_EXISTING && fs.existsSync(target.outputPath)) {
        return { label };
      }
      const prompt = buildBackgroundPrompt(target.service, target.theme);
      await generateImage(prompt, target.outputPath);
      return { label };
    });
  }

  for (const target of decoTargets) {
    allTasks.push(async () => {
      const label = `deco/${target.styleId}`;
      if (SKIP_EXISTING && fs.existsSync(target.outputPath)) {
        return { label };
      }
      const prompt = buildDecoPrompt(target.styleId);
      await generateImage(prompt, target.outputPath);
      return { label };
    });
  }

  const tracker = new ProgressTracker(allTasks.length);
  console.log(`\n총 생성 대상: ${allTasks.length}장`);
  console.log('생성 시작...\n');

  const wrappedTasks = allTasks.map((task) => async () => {
    try {
      const { label } = await task();
      tracker.tick(true, label);
    } catch (err) {
      tracker.tick(false, String(err));
    }
  });

  await runConcurrent(wrappedTasks, CONCURRENT_JOBS);
  tracker.summary();
}

main().catch((err) => {
  console.error('이미지 생성 중 치명적 오류 발생:', err);
  process.exit(1);
});
```

---

## Task 13: package.json 스크립트 추가

**파일:** `package.json` (수정)

- [x] `"generate:assets"` 스크립트 추가: `"npx tsx scripts/generate-assets/index.ts"`
- [x] `"generate:assets:skip"` 스크립트 추가: `"npx tsx scripts/generate-assets/index.ts --skip-existing"`
- [x] `REPLICATE_API_KEY` 환경변수 문서화: `docs/operations/env-variables.md`에 추가
- [x] 검증: `pnpm type-check && pnpm lint`
- [x] 커밋: `git commit -m "feat: add generate:assets npm scripts and document REPLICATE_API_KEY"`

```json
// package.json scripts 섹션에 추가:
{
  "generate:assets": "npx tsx scripts/generate-assets/index.ts",
  "generate:assets:skip": "npx tsx scripts/generate-assets/index.ts --skip-existing"
}
```

**env-variables.md 추가 내용:**

```markdown
| `REPLICATE_API_KEY` | Replicate API 인증 키 | 이미지 생성 스크립트(`generate:assets`) 실행 시 필수. 런타임에는 불필요. |
```

---

## Task 14: 전체 통합 검증 및 마무리

- [x] `pnpm type-check` — 타입 오류 0개 확인
- [x] `pnpm lint` — ESLint 오류 0개 확인
- [x] `pnpm test:coverage` — 신규 단위 테스트 2개 모두 통과 확인
- [x] `pnpm i18n:check` — 번역 키 drift 없음 확인
- [x] `pnpm check:doc-links` — 문서 링크 정합성 확인
- [x] `pnpm build` — 프로덕션 빌드 성공 확인
- [x] (선택) 테스트 이미지 1장 생성: `REPLICATE_API_KEY=xxx npx tsx scripts/generate-assets/index.ts --skip-existing`
- [x] 생성 후 검증: `ls public/images/cards/dark-fantasy/major/ | wc -l` → `22` 확인
- [x] PR 생성: `git push && gh pr create --title "feat: Visual Overhaul Phase 1 - Card Style System & Image Generation Scripts"`
- [x] 최종 커밋: `git commit -m "docs: update env-variables.md with REPLICATE_API_KEY"`

---

## 파일 변경 요약

| 파일 | 액션 | 태스크 |
|------|------|--------|
| `src/data/cardStyles.ts` | 신규 | Task 1 |
| `src/hooks/useCardStyleStore.ts` | 신규 | Task 2 |
| `src/lib/storage/card-style.ts` | 신규 | Task 3 |
| `src/__tests__/lib/storage/card-style.test.ts` | 신규 | Task 3 |
| `src/components/card/CardFace.tsx` | 수정 | Task 4 |
| `src/components/card/CardBack.tsx` | 수정 | Task 4 |
| `src/components/card/CardItem.tsx` | 수정 | Task 4 |
| `src/__tests__/hooks/useCardStyleStore.test.ts` | 신규 | Task 5 |
| `src/components/card/CardStyleSelector.tsx` | 신규 | Task 6 |
| `src/app/settings/page.tsx` | 수정 | Task 7 |
| `src/i18n/translations/*.ts` | 수정 | Task 7 |
| `scripts/generate-assets/config.ts` | 신규 | Task 8 |
| `scripts/generate-assets/replicate.ts` | 신규 | Task 9 |
| `scripts/generate-assets/prompts.ts` | 신규 | Task 10 |
| `scripts/generate-assets/progress.ts` | 신규 | Task 11 |
| `scripts/generate-assets/index.ts` | 신규 | Task 12 |
| `package.json` | 수정 | Task 13 |
| `docs/operations/env-variables.md` | 수정 | Task 13 |

---

## 검증 명령어 체크리스트

```bash
# 정적 검사
pnpm type-check && pnpm lint

# 단위 테스트
pnpm test:coverage

# i18n drift 검출
pnpm i18n:check

# 문서 링크 검증
pnpm check:doc-links

# 프로덕션 빌드
pnpm build

# 이미지 생성 후 파일 수 확인 (22개)
ls public/images/cards/dark-fantasy/major/ | wc -l
```

---

## 주의사항

1. **기존 시스템 보존**: `useSkinStore`, `cardSkins` 데이터는 삭제하지 않는다. 기존 palette 스킨 시스템은 독립 기능으로 유지된다.
2. **fallback 우선순위**: `styleId` → `skinId` → SVG fallback 순서를 반드시 지킨다.
3. **이미지 백업 필수**: 이미지 생성 스크립트는 항상 `backupExistingImages()`를 먼저 호출해야 한다.
4. **프롬프트 안전**: 모든 프롬프트에 `no text, no letters, no watermarks, no signatures` 포함 필수.
5. **WebP 경로**: 기존 `.png` 경로(`getCardImageUrl`)와 다르게 신규 경로는 `.webp` 확장자를 사용한다.
6. **SSR 안전**: `useCardStyleStore`는 `"use client"` 컴포넌트 내에서만 사용하고 서버 컴포넌트에서는 직접 호출하지 않는다.
