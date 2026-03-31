# 카드 스킨 시스템 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 6가지 분위기별 타로카드 스킨을 Grok AI로 생성하고, Supabase Storage에 저장하며, 사용자가 홈 페이지에서 스킨을 선택해 적용할 수 있는 시스템 구축.

**Architecture:** 스킨 메타데이터를 정적 데이터로 정의하고, Zustand store로 선택 상태를 관리한다. 기존 CardFace/CardBack의 프로시저럴 SVG를 Supabase CDN 이미지로 교체하되, 이미지 로딩 실패 시 기존 SVG로 폴백한다. 이미지 생성/업로드는 CLI 스크립트로 처리.

**Tech Stack:** Next.js 16 (App Router), Zustand v5, Supabase Storage, Grok `grok-2-image` API, Framer Motion v12

---

## 파일 구조

### 신규 생성 파일

| 파일 | 역할 |
|---|---|
| `src/data/skins/index.ts` | 6개 스킨 메타데이터 (ID, 이름, 설명, 팔레트, 샘플카드) |
| `src/hooks/useSkinStore.ts` | Zustand store — 스킨 선택/변경, localStorage persist |
| `src/lib/supabase/storage.ts` | Supabase Storage URL 헬퍼 (getCardImageUrl, getCardBackUrl) |
| `src/components/home/SkinGallery.tsx` | 홈 페이지 스킨 갤러리 섹션 |
| `src/components/skin/SkinSelector.tsx` | 개별 스킨 선택 카드 (갤러리에서 재사용) |
| `scripts/generate-skin-images.ts` | 6스킨 대응 이미지 생성 스크립트 |
| `scripts/upload-skin-images.ts` | Supabase Storage 업로드 스크립트 |
| `supabase/migrations/007_skin_selection.sql` | profiles.selected_skin 컬럼 추가 |

### 수정 파일

| 파일 | 변경 내용 |
|---|---|
| `src/components/card/CardFace.tsx` | 스킨 이미지 렌더링 추가, 기존 SVG를 폴백으로 유지 |
| `src/components/card/CardBack.tsx` | 스킨 뒷면 이미지 렌더링 추가, 기존 SVG를 폴백으로 유지 |
| `src/components/card/CardItem.tsx` | useSkinStore에서 현재 스킨 읽어 CardFace/CardBack에 전달 |
| `src/app/page.tsx` | SkinGallery 섹션 추가 |
| `src/components/home/DailyCard.tsx` | 스킨 이미지 적용 |

---

### Task 1: 스킨 메타데이터 정의

**Files:**
- Create: `src/data/skins/index.ts`

- [ ] **Step 1: 스킨 데이터 파일 작성**

```typescript
// src/data/skins/index.ts

export interface CardSkin {
  id: string;
  name: string;
  nameKo: string;
  description: string;
  palette: {
    primary: string;
    secondary: string;
    background: string;
  };
  sampleCards: string[];
}

export const cardSkins: CardSkin[] = [
  {
    id: "gold-luxury",
    name: "Gold Luxury",
    nameKo: "골드 럭셔리",
    description: "미드나잇 블루와 금박의 최고급 아르데코 타로",
    palette: {
      primary: "#d4af37",
      secondary: "#1a1a3e",
      background: "#08081a",
    },
    sampleCards: ["major-00", "major-02", "major-17", "major-21"],
  },
  {
    id: "dark-gothic",
    name: "Dark Gothic",
    nameKo: "다크 고딕",
    description: "핏빛 악센트의 어둡고 강렬한 중세 오컬트",
    palette: {
      primary: "#8b3030",
      secondary: "#1a0a14",
      background: "#0a0408",
    },
    sampleCards: ["major-13", "major-15", "major-16", "major-18"],
  },
  {
    id: "celestial-mystic",
    name: "Celestial Mystic",
    nameKo: "셀레스티얼 미스틱",
    description: "별자리와 달빛의 고요한 천상 세계",
    palette: {
      primary: "#6880cc",
      secondary: "#162454",
      background: "#0a1228",
    },
    sampleCards: ["major-02", "major-17", "major-18", "major-21"],
  },
  {
    id: "pastel-dream",
    name: "Pastel Dream",
    nameKo: "파스텔 드림",
    description: "수채화처럼 번지는 몽환적 라벤더 세계",
    palette: {
      primary: "#b898e0",
      secondary: "#efe4ff",
      background: "#f5eeff",
    },
    sampleCards: ["major-00", "major-03", "major-17", "major-19"],
  },
  {
    id: "neon-cyberpunk",
    name: "Neon Cyberpunk",
    nameKo: "네온 사이버펑크",
    description: "홀로그램 회로와 네온의 미래적 디지털 오라클",
    palette: {
      primary: "#00ffff",
      secondary: "#ff00ff",
      background: "#05050f",
    },
    sampleCards: ["major-01", "major-07", "major-10", "major-16"],
  },
  {
    id: "emerald-enchant",
    name: "Emerald Enchant",
    nameKo: "에메랄드 인챈트",
    description: "에메랄드 보석과 숲의 자연 마법",
    palette: {
      primary: "#3a9a70",
      secondary: "#1a5040",
      background: "#040d0a",
    },
    sampleCards: ["major-02", "major-03", "major-08", "major-14"],
  },
];

export const DEFAULT_SKIN_ID = "gold-luxury";

export function getSkinById(id: string): CardSkin | undefined {
  return cardSkins.find((s) => s.id === id);
}
```

- [ ] **Step 2: 타입 체크 확인**

Run: `pnpm tsc --noEmit`
Expected: PASS (신규 파일, 기존 코드에 영향 없음)

- [ ] **Step 3: 커밋**

```bash
git add src/data/skins/index.ts
git commit -m "feat: 카드 스킨 메타데이터 정의 — 6가지 분위기별 스킨"
```

---

### Task 2: Supabase Storage URL 헬퍼

**Files:**
- Create: `src/lib/supabase/storage.ts`

- [ ] **Step 1: Storage 헬퍼 함수 작성**

```typescript
// src/lib/supabase/storage.ts

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const BUCKET_NAME = "card-skins";

function getStorageBaseUrl(): string {
  if (!SUPABASE_URL) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set");
  }
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET_NAME}`;
}

export function getCardImageUrl(skinId: string, cardId: string): string {
  return `${getStorageBaseUrl()}/${skinId}/front/${cardId}.png`;
}

export function getCardBackUrl(skinId: string): string {
  return `${getStorageBaseUrl()}/${skinId}/back.png`;
}

export function getCardThumbnailUrl(
  skinId: string,
  cardId: string,
  width: number = 200,
  height: number = 320
): string {
  return `${getStorageBaseUrl()}/${skinId}/front/${cardId}.png?width=${width}&height=${height}&resize=contain`;
}
```

- [ ] **Step 2: 타입 체크 확인**

Run: `pnpm tsc --noEmit`
Expected: PASS

- [ ] **Step 3: 커밋**

```bash
git add src/lib/supabase/storage.ts
git commit -m "feat: Supabase Storage URL 헬퍼 함수 추가"
```

---

### Task 3: Zustand 스킨 스토어

**Files:**
- Create: `src/hooks/useSkinStore.ts`

- [ ] **Step 1: 스킨 스토어 작성**

```typescript
// src/hooks/useSkinStore.ts

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEFAULT_SKIN_ID } from "@/data/skins";

interface SkinState {
  selectedSkinId: string;
  setSkin: (skinId: string) => void;
}

export const useSkinStore = create<SkinState>()(
  persist(
    (set) => ({
      selectedSkinId: DEFAULT_SKIN_ID,
      setSkin: (skinId: string) => set({ selectedSkinId: skinId }),
    }),
    {
      name: "arcana-skin",
    }
  )
);
```

- [ ] **Step 2: 타입 체크 확인**

Run: `pnpm tsc --noEmit`
Expected: PASS

- [ ] **Step 3: 커밋**

```bash
git add src/hooks/useSkinStore.ts
git commit -m "feat: 스킨 선택 Zustand 스토어 — localStorage persist"
```

---

### Task 4: CardFace 이미지 렌더링 (SVG 폴백 유지)

**Files:**
- Modify: `src/components/card/CardFace.tsx`

- [ ] **Step 1: CardFace에 스킨 이미지 렌더링 추가**

`CardFace.tsx`를 수정하여 `skinId` prop을 받아 Supabase 이미지를 렌더링하되, 이미지 로드 실패 시 기존 SVG로 폴백.

```typescript
// src/components/card/CardFace.tsx — 수정 사항

// 기존 import 유지 + 추가:
import { useState } from "react";
import Image from "next/image";
import { getCardImageUrl } from "@/lib/supabase/storage";

interface CardFaceProps {
  card: TarotCard;
  isReversed: boolean;
  size?: "sm" | "md" | "lg";
  width?: number;
  height?: number;
  className?: string;
  skinId?: string; // 추가
}
```

컴포넌트 본문에서 `skinId`가 있을 때 이미지 렌더링, 없거나 로드 실패 시 기존 SVG 렌더링:

```typescript
export function CardFace({ card, isReversed, size = "md", width, height, className = "", skinId }: CardFaceProps) {
  const [imageError, setImageError] = useState(false);
  const preset = sizeDimensions[size];
  const w = width ?? preset.w;
  const h = height ?? preset.h;

  const useSkinImage = skinId && !imageError;

  if (useSkinImage) {
    const imageUrl = getCardImageUrl(skinId, card.id);
    return (
      <div
        className={`relative rounded-lg overflow-hidden ${isReversed ? "rotate-180" : ""} ${className}`}
        style={{ width: w, height: h }}
      >
        <Image
          src={imageUrl}
          alt={`${card.nameKo} (${card.name})`}
          fill
          sizes={`${w}px`}
          className="object-cover"
          onError={() => setImageError(true)}
          unoptimized
        />
        {isReversed && (
          <span className="absolute top-1 right-1 text-[8px] text-red-400 bg-red-900/40 px-1 rounded rotate-180">
            역
          </span>
        )}
      </div>
    );
  }

  // 기존 SVG 렌더링 (폴백) — 아래에 기존 코드 그대로 유지
  const symbol = card.type === "major"
    ? majorSymbols[card.id]
    : card.suit ? suitSymbols[card.suit] : null;
  // ... (기존 SVG 코드 전체 유지)
}
```

- [ ] **Step 2: 타입 체크 확인**

Run: `pnpm tsc --noEmit`
Expected: PASS

- [ ] **Step 3: 빌드 확인**

Run: `pnpm build`
Expected: PASS

- [ ] **Step 4: 커밋**

```bash
git add src/components/card/CardFace.tsx
git commit -m "feat: CardFace 스킨 이미지 렌더링 + SVG 폴백"
```

---

### Task 5: CardBack 이미지 렌더링 (SVG 폴백 유지)

**Files:**
- Modify: `src/components/card/CardBack.tsx`

- [ ] **Step 1: CardBack에 스킨 이미지 렌더링 추가**

```typescript
// src/components/card/CardBack.tsx — 수정 사항

// 기존 코드 상단에 추가:
import { useState } from "react";
import Image from "next/image";
import { getCardBackUrl } from "@/lib/supabase/storage";

interface CardBackProps {
  size?: "sm" | "md" | "lg";
  width?: number;
  height?: number;
  className?: string;
  skinId?: string; // 추가
}
```

컴포넌트 본문 시작 부분에 스킨 이미지 분기 추가:

```typescript
export function CardBack({ size = "md", width, height, className = "", skinId }: CardBackProps) {
  const [imageError, setImageError] = useState(false);
  const preset = sizeDimensions[size];
  const w = width ?? preset.w;
  const h = height ?? preset.h;

  const useSkinImage = skinId && !imageError;

  if (useSkinImage) {
    const imageUrl = getCardBackUrl(skinId);
    return (
      <div
        className={`relative rounded-lg overflow-hidden ${className}`}
        style={{ width: w, height: h }}
      >
        <Image
          src={imageUrl}
          alt="카드 뒷면"
          fill
          sizes={`${w}px`}
          className="object-cover"
          onError={() => setImageError(true)}
          unoptimized
        />
      </div>
    );
  }

  // 기존 SVG 렌더링 (폴백) — 아래에 기존 코드 그대로 유지
  const cx = w / 2;
  // ... (기존 SVG 코드 전체 유지)
}
```

- [ ] **Step 2: 타입 체크 확인**

Run: `pnpm tsc --noEmit`
Expected: PASS

- [ ] **Step 3: 커밋**

```bash
git add src/components/card/CardBack.tsx
git commit -m "feat: CardBack 스킨 이미지 렌더링 + SVG 폴백"
```

---

### Task 6: CardItem 스킨 연동

**Files:**
- Modify: `src/components/card/CardItem.tsx`

- [ ] **Step 1: CardItem에서 스킨 스토어 연동**

CardItem에 `skinId` prop을 추가하고 CardFace/CardBack에 전달:

```typescript
// src/components/card/CardItem.tsx — 변경 사항

interface CardItemProps {
  card: TarotCard;
  isFlipped: boolean;
  isSelected: boolean;
  isReversed?: boolean;
  onClick?: () => void;
  size?: "sm" | "md" | "lg";
  width?: number;
  height?: number;
  className?: string;
  skinId?: string; // 추가
}
```

CardBack과 CardFace에 skinId 전달:

```typescript
export function CardItem({ card, isFlipped, isSelected, isReversed = false, onClick, size = "md", width, height, className = "", skinId }: CardItemProps) {
  // ... 기존 코드

  // CardBack 호출 부분:
  <CardBack size={size} width={width} height={height} skinId={skinId} className="w-full h-full" />

  // CardFace 호출 부분:
  <CardFace card={card} isReversed={isReversed} size={size} width={width} height={height} skinId={skinId} className="w-full h-full" />
}
```

- [ ] **Step 2: CardItem 사용처에서 skinId 전달**

CardItem을 사용하는 곳(CardDeck, CardSpread 등)을 확인하고, useSkinStore에서 skinId를 읽어 전달하도록 수정. 각 사용처의 최상위 컴포넌트에서 `const { selectedSkinId } = useSkinStore();`를 호출하고 CardItem에 `skinId={selectedSkinId}`를 전달.

- [ ] **Step 3: 타입 체크 및 빌드 확인**

Run: `pnpm tsc --noEmit && pnpm lint && pnpm build`
Expected: PASS

- [ ] **Step 4: 커밋**

```bash
git add src/components/card/CardItem.tsx
git commit -m "feat: CardItem 스킨 연동 — skinId prop으로 CardFace/CardBack 전달"
```

---

### Task 7: DailyCard 스킨 적용

**Files:**
- Modify: `src/components/home/DailyCard.tsx`

- [ ] **Step 1: DailyCard에서 스킨 스토어 사용**

```typescript
// src/components/home/DailyCard.tsx — 변경 사항

// import 추가:
import { useSkinStore } from "@/hooks/useSkinStore";

// 컴포넌트 내부 상단에 추가:
const { selectedSkinId } = useSkinStore();
```

- [ ] **Step 2: CardBack, CardFace에 skinId 전달**

DailyCard 내의 CardBack과 CardFace 호출에 `skinId={selectedSkinId}` prop 추가:

```typescript
// CardBack 사용 부분:
<CardBack size="lg" skinId={selectedSkinId} className="w-full h-full" />

// CardFace 사용 부분:
<CardFace card={currentCard} isReversed={currentData.isReversed} size="lg" skinId={selectedSkinId} className="w-full h-full" />
```

- [ ] **Step 3: 타입 체크 및 빌드 확인**

Run: `pnpm tsc --noEmit && pnpm lint && pnpm build`
Expected: PASS

- [ ] **Step 4: 커밋**

```bash
git add src/components/home/DailyCard.tsx
git commit -m "feat: DailyCard 스킨 적용"
```

---

### Task 8: SkinSelector 컴포넌트

**Files:**
- Create: `src/components/skin/SkinSelector.tsx`

- [ ] **Step 1: SkinSelector 컴포넌트 작성**

```typescript
// src/components/skin/SkinSelector.tsx
"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { useState } from "react";
import { CardSkin } from "@/data/skins";
import { getCardThumbnailUrl, getCardBackUrl } from "@/lib/supabase/storage";

interface SkinSelectorProps {
  skin: CardSkin;
  isSelected: boolean;
  onSelect: (skinId: string) => void;
}

export function SkinSelector({ skin, isSelected, onSelect }: SkinSelectorProps) {
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());

  const handleImageError = (cardId: string) => {
    setImageErrors((prev) => new Set(prev).add(cardId));
  };

  return (
    <motion.button
      type="button"
      onClick={() => onSelect(skin.id)}
      whileHover={{ y: -4, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`relative w-full rounded-xl overflow-hidden border-2 transition-all duration-300 text-left ${
        isSelected
          ? "border-arcana-gold shadow-lg shadow-arcana-gold/20"
          : "border-arcana-border hover:border-arcana-purple/50"
      }`}
      style={{ background: skin.palette.background }}
    >
      {/* 선택 표시 */}
      {isSelected && (
        <div className="absolute top-2 right-2 z-10 w-6 h-6 rounded-full bg-arcana-gold flex items-center justify-center">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#08081a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
      )}

      {/* 샘플 카드 미리보기 */}
      <div className="relative h-40 flex items-end justify-center px-4 pt-4 pb-2 overflow-hidden">
        {skin.sampleCards.slice(0, 4).map((cardId, i) => {
          const total = Math.min(skin.sampleCards.length, 4);
          const rotation = (i - (total - 1) / 2) * 12;
          const translateY = Math.abs(i - (total - 1) / 2) * 8;
          const hasError = imageErrors.has(cardId);

          return (
            <div
              key={cardId}
              className="absolute w-16 h-24 rounded-md overflow-hidden shadow-lg"
              style={{
                transform: `rotate(${rotation}deg) translateY(${translateY}px)`,
                zIndex: i,
                left: `${20 + i * 18}%`,
                bottom: "8px",
              }}
            >
              {!hasError ? (
                <Image
                  src={getCardThumbnailUrl(skin.id, cardId, 128, 192)}
                  alt={cardId}
                  fill
                  sizes="64px"
                  className="object-cover"
                  onError={() => handleImageError(cardId)}
                  unoptimized
                />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center text-[8px]"
                  style={{ background: skin.palette.secondary, color: skin.palette.primary }}
                >
                  {cardId}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 스킨 정보 */}
      <div className="px-4 pb-4 pt-2">
        <h3
          className="font-serif font-bold text-sm mb-1"
          style={{ color: skin.palette.primary }}
        >
          {skin.nameKo}
        </h3>
        <p className="text-arcana-muted text-xs leading-relaxed">
          {skin.description}
        </p>
      </div>
    </motion.button>
  );
}
```

- [ ] **Step 2: 타입 체크 확인**

Run: `pnpm tsc --noEmit`
Expected: PASS

- [ ] **Step 3: 커밋**

```bash
git add src/components/skin/SkinSelector.tsx
git commit -m "feat: SkinSelector 컴포넌트 — 스킨 미리보기 카드"
```

---

### Task 9: SkinGallery 홈 섹션

**Files:**
- Create: `src/components/home/SkinGallery.tsx`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: SkinGallery 컴포넌트 작성**

```typescript
// src/components/home/SkinGallery.tsx
"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ScrollReveal } from "@/components/effects/ScrollReveal";
import { SkinSelector } from "@/components/skin/SkinSelector";
import { cardSkins } from "@/data/skins";
import { useSkinStore } from "@/hooks/useSkinStore";

export function SkinGallery() {
  const { selectedSkinId, setSkin } = useSkinStore();
  const [showToast, setShowToast] = useState(false);
  const [toastSkinName, setToastSkinName] = useState("");

  const handleSelect = (skinId: string) => {
    if (skinId === selectedSkinId) return;
    setSkin(skinId);
    const skin = cardSkins.find((s) => s.id === skinId);
    if (skin) {
      setToastSkinName(skin.nameKo);
      setShowToast(true);
    }
  };

  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => setShowToast(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [showToast]);

  return (
    <section id="skin-gallery" className="py-16 md:py-24 px-4">
      <div className="max-w-5xl mx-auto">
        <ScrollReveal className="text-center mb-10">
          <h2 className="text-xl md:text-2xl font-serif font-bold mb-2">
            나만의 카드 디자인
          </h2>
          <p className="text-arcana-muted text-sm">
            취향에 맞는 카드 스킨을 선택해보세요
          </p>
        </ScrollReveal>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
          {cardSkins.map((skin) => (
            <SkinSelector
              key={skin.id}
              skin={skin}
              isSelected={selectedSkinId === skin.id}
              onSelect={handleSelect}
            />
          ))}
        </div>

        {/* 토스트 알림 */}
        <AnimatePresence>
          {showToast && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-6 py-3 bg-arcana-card/90 backdrop-blur-sm border border-arcana-gold/30 rounded-full shadow-lg"
            >
              <p className="text-sm text-arcana-text font-serif">
                <span className="text-arcana-gold">{toastSkinName}</span> 스킨이 적용되었습니다
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: 홈 페이지에 SkinGallery 추가**

`src/app/page.tsx`를 수정하여 DailyCard 뒤에 SkinGallery 추가:

```typescript
// src/app/page.tsx
import { HeroSection } from "@/components/home/HeroSection";
import { CharacterGallery } from "@/components/home/CharacterGallery";
import { DailyCard } from "@/components/home/DailyCard";
import { SkinGallery } from "@/components/home/SkinGallery";
import { ServiceFlow } from "@/components/home/ServiceFlow";
import { FAQ } from "@/components/home/FAQ";
import { BottomCTA } from "@/components/home/BottomCTA";

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <HeroSection />
      <CharacterGallery />
      <DailyCard />
      <SkinGallery />
      <ServiceFlow />
      <FAQ />
      <BottomCTA />
    </div>
  );
}
```

- [ ] **Step 3: 타입 체크 및 빌드 확인**

Run: `pnpm tsc --noEmit && pnpm lint && pnpm build`
Expected: PASS

- [ ] **Step 4: 커밋**

```bash
git add src/components/home/SkinGallery.tsx src/app/page.tsx
git commit -m "feat: 홈 페이지 SkinGallery 섹션 추가"
```

---

### Task 10: DB 마이그레이션 — profiles.selected_skin

**Files:**
- Create: `supabase/migrations/007_skin_selection.sql`

- [ ] **Step 1: 마이그레이션 파일 작성**

```sql
-- 스킨 선택 저장
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS selected_skin TEXT DEFAULT 'gold-luxury';
```

- [ ] **Step 2: 커밋**

```bash
git add supabase/migrations/007_skin_selection.sql
git commit -m "db: profiles 테이블에 selected_skin 컬럼 추가"
```

---

### Task 11: 이미지 생성 스크립트

**Files:**
- Create: `scripts/generate-skin-images.ts`

- [ ] **Step 1: 스크립트 작성**

기존 `scripts/generate-card-images.ts`를 기반으로 6스킨 대응 스크립트 작성. 핵심 변경:
- 스킨별 스타일 프리픽스 정의 (6종)
- `--skin` 옵션으로 특정 스킨만 생성 가능
- `--card` 옵션으로 특정 카드만 생성 가능
- `--back-only` 옵션으로 뒷면만 생성 가능
- 출력 경로: `output/{skinId}/front/{cardId}.png`, `output/{skinId}/back.png`

```typescript
// scripts/generate-skin-images.ts

import fs from "fs";
import path from "path";

const API_KEY = process.env.GROK_API_KEY;
const API_URL = "https://api.x.ai/v1/images/generations";
const MODEL = "grok-2-image";
const OUTPUT_DIR = path.join(process.cwd(), "output/card-skins");

if (!API_KEY) {
  console.error("❌ GROK_API_KEY 환경변수를 설정해주세요.");
  process.exit(1);
}

// === 스킨별 스타일 프리픽스 ===

const QUALITY_SUFFIX = "Ultra-detailed, museum-quality fine art. No text, numbers, or letters on the card. Vertical tarot card format 2:3 ratio.";

const skinStyles: Record<string, { prefix: string; backPrompt: string }> = {
  "gold-luxury": {
    prefix: `Ultra-premium luxury tarot card illustration. Elegant Art Nouveau style with rich deep midnight blue background and luminous gold leaf accents. Hand-painted oil painting quality with ornate gilded borders and delicate filigree patterns. Rich jewel-tone colors with gold highlights. Ethereal glowing light effects. ${QUALITY_SUFFIX}`,
    backPrompt: `Ultra-premium luxury tarot card back design. Breathtaking symmetrical sacred geometry mandala with interlocking golden circles, celestial constellations, crescent moon, radiant sun, and mystical eye of providence at center. Deep royal midnight blue and burnished gold palette. Intricate Art Nouveau floral border. ${QUALITY_SUFFIX}`,
  },
  "dark-gothic": {
    prefix: `Dark gothic tarot card illustration. Medieval occult style with deep black background, blood red and silver accents. Dramatic chiaroscuro lighting, intricate gothic architecture elements, thorny vine borders, dark romanticism. Oil painting quality with heavy atmosphere. Ominous and mysterious mood. ${QUALITY_SUFFIX}`,
    backPrompt: `Dark gothic tarot card back design. Symmetrical occult mandala with pentagram, thorny rose vines, gothic cathedral window patterns, ravens and skulls motifs. Deep black with blood red and silver accents. Heavy baroque ornamental border. ${QUALITY_SUFFIX}`,
  },
  "celestial-mystic": {
    prefix: `Celestial mystic tarot card illustration. Deep navy blue background with silver starlight, constellation patterns, and moonlit atmosphere. Ethereal watercolor-meets-digital art style. Soft luminescent glow, astronomical chart elements, zodiac symbolism. Dreamy cosmic palette of deep indigo, silver, and soft blue. ${QUALITY_SUFFIX}`,
    backPrompt: `Celestial mystic tarot card back design. Symmetrical astronomical mandala with moon phases, constellation map, zodiac wheel, and cosmic nebula patterns. Deep navy blue with silver and soft blue accents. Delicate star-chart border pattern. ${QUALITY_SUFFIX}`,
  },
  "pastel-dream": {
    prefix: `Dreamy pastel tarot card illustration. Soft watercolor style with lavender, rose quartz, and baby blue palette. Delicate brushstrokes with bleeding edges, flower petal accents, iridescent shimmer effects. Light and airy composition. Gentle, healing, whimsical mood. Light pastel background. ${QUALITY_SUFFIX}`,
    backPrompt: `Dreamy pastel tarot card back design. Symmetrical floral mandala with watercolor roses, morning glories, and butterfly motifs. Soft lavender, pink, and baby blue palette. Delicate vine border with dewdrop accents. ${QUALITY_SUFFIX}`,
  },
  "neon-cyberpunk": {
    prefix: `Cyberpunk neon tarot card illustration. Black background with cyan and magenta neon glow effects. Digital holographic art style, circuit board patterns, glitch effects, futuristic UI elements. High-tech oracle aesthetic. Sharp geometric compositions with neon light trails. ${QUALITY_SUFFIX}`,
    backPrompt: `Cyberpunk neon tarot card back design. Symmetrical digital mandala with circuit board patterns, holographic hexagonal grid, glitch effects, and binary code streams. Black background with cyan and magenta neon glow. Futuristic tech border. ${QUALITY_SUFFIX}`,
  },
  "emerald-enchant": {
    prefix: `Emerald enchantment tarot card illustration. Deep forest green background with emerald gemstone and botanical elements. Art Nouveau style with flowing vines, mystical forest creatures, bioluminescent accents. Rich green palette with gold filigree. Enchanted forest atmosphere. ${QUALITY_SUFFIX}`,
    backPrompt: `Emerald enchantment tarot card back design. Symmetrical botanical mandala with intertwining vines, sacred tree of life, emerald gemstones, and forest spirit motifs. Deep green with gold leaf accents. Organic Art Nouveau vine border. ${QUALITY_SUFFIX}`,
  },
};

// === 카드 정의 (기존 스크립트와 동일) ===

const majorArcana = [
  { id: "major-00", name: "The Fool", keywords: "새로운 시작, 모험, 순수, 자유" },
  { id: "major-01", name: "The Magician", keywords: "의지력, 창조, 기술, 집중" },
  { id: "major-02", name: "The High Priestess", keywords: "직관, 신비, 내면의 지혜" },
  { id: "major-03", name: "The Empress", keywords: "풍요, 모성, 자연, 아름다움" },
  { id: "major-04", name: "The Emperor", keywords: "권위, 구조, 안정, 리더십" },
  { id: "major-05", name: "The Hierophant", keywords: "전통, 가르침, 영적 지도" },
  { id: "major-06", name: "The Lovers", keywords: "사랑, 선택, 조화, 관계" },
  { id: "major-07", name: "The Chariot", keywords: "승리, 의지, 전진, 결단" },
  { id: "major-08", name: "Strength", keywords: "용기, 인내, 내면의 힘" },
  { id: "major-09", name: "The Hermit", keywords: "성찰, 고독, 내면 탐색" },
  { id: "major-10", name: "Wheel of Fortune", keywords: "변화, 운명, 순환" },
  { id: "major-11", name: "Justice", keywords: "공정, 균형, 진실, 법" },
  { id: "major-12", name: "The Hanged Man", keywords: "희생, 새로운 관점, 기다림" },
  { id: "major-13", name: "Death", keywords: "변환, 끝과 시작, 재탄생" },
  { id: "major-14", name: "Temperance", keywords: "균형, 조화, 인내, 치유" },
  { id: "major-15", name: "The Devil", keywords: "유혹, 속박, 그림자, 욕망" },
  { id: "major-16", name: "The Tower", keywords: "붕괴, 해방, 각성, 충격" },
  { id: "major-17", name: "The Star", keywords: "희망, 영감, 치유, 평화" },
  { id: "major-18", name: "The Moon", keywords: "환상, 불안, 직감, 무의식" },
  { id: "major-19", name: "The Sun", keywords: "기쁨, 성공, 활력, 행복" },
  { id: "major-20", name: "Judgement", keywords: "부활, 심판, 각성, 용서" },
  { id: "major-21", name: "The World", keywords: "완성, 성취, 통합, 여행" },
];

const suits = ["wands", "cups", "swords", "pentacles"] as const;
const suitMeta: Record<string, { en: string; element: string }> = {
  wands: { en: "Wands", element: "fire" },
  cups: { en: "Cups", element: "water" },
  swords: { en: "Swords", element: "air" },
  pentacles: { en: "Pentacles", element: "earth" },
};
const minorNames = [
  "Ace", "Two", "Three", "Four", "Five", "Six", "Seven",
  "Eight", "Nine", "Ten", "Page", "Knight", "Queen", "King",
];

// === 프롬프트 빌더 ===

function buildFrontPrompt(skinId: string, cardName: string, keywords: string): string {
  const style = skinStyles[skinId];
  return `${style.prefix} The "${cardName}" tarot card. Symbolizing: ${keywords}. An elegant figure surrounded by symbolic elements appropriate to the card meaning.`;
}

function buildMinorFrontPrompt(skinId: string, suit: string, number: number, name: string): string {
  const style = skinStyles[skinId];
  const s = suitMeta[suit];
  const suitObj = suit === "wands" ? "ornate staff" : suit === "cups" ? "jeweled chalice" : suit === "swords" ? "ceremonial sword" : "ancient gold coin";
  const scene = number <= 10
    ? `Elegant arrangement of ${number} beautifully crafted ${s.en.toLowerCase()} with magical ${s.element} aura.`
    : `A noble ${name.toLowerCase()} figure holding a ${suitObj}, dressed in luxurious royal attire.`;
  return `${style.prefix} The "${name} of ${s.en}" tarot card. ${s.element} element theme. ${scene}`;
}

// === API 호출 ===

async function generateImage(prompt: string, outputPath: string): Promise<boolean> {
  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({ model: MODEL, prompt, n: 1, response_format: "b64_json" }),
    });

    if (!res.ok) {
      const error = await res.text();
      console.error(`  ✗ API 오류 (${res.status}): ${error.slice(0, 200)}`);
      return false;
    }

    const data = await res.json();
    const b64 = data.data?.[0]?.b64_json;
    if (!b64) { console.error("  ✗ 이미지 데이터 없음"); return false; }

    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(outputPath, Buffer.from(b64, "base64"));
    console.log(`  ✓ ${path.relative(OUTPUT_DIR, outputPath)} 생성 완료`);
    return true;
  } catch (e) {
    console.error(`  ✗ 네트워크 오류:`, e instanceof Error ? e.message : e);
    return false;
  }
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// === 메인 ===

async function main() {
  const args = process.argv.slice(2);
  const skinFlag = args.find((a) => a.startsWith("--skin="))?.split("=")[1];
  const cardFlag = args.find((a) => a.startsWith("--card="))?.split("=")[1];
  const backOnly = args.includes("--back-only");

  const targetSkins = skinFlag ? [skinFlag] : Object.keys(skinStyles);

  console.log("🃏 카드 스킨 이미지 생성");
  console.log(`스킨: ${targetSkins.join(", ")}`);
  console.log("=====================================\n");

  let generated = 0;
  let failed = 0;

  for (const skinId of targetSkins) {
    const style = skinStyles[skinId];
    if (!style) { console.error(`❌ 알 수 없는 스킨: ${skinId}`); continue; }

    console.log(`\n🎨 [${skinId}] 스킨 생성 시작...\n`);

    // 뒷면
    if (!cardFlag) {
      console.log("  📦 카드 뒷면...");
      const ok = await generateImage(style.backPrompt, path.join(OUTPUT_DIR, skinId, "back.png"));
      ok ? generated++ : failed++;
      await delay(2000);
    }

    if (backOnly) continue;

    // 메이저 아르카나
    console.log("  📦 메이저 아르카나 (22장)...");
    for (const card of majorArcana) {
      if (cardFlag && card.id !== cardFlag) continue;
      const prompt = buildFrontPrompt(skinId, card.name, card.keywords);
      const ok = await generateImage(prompt, path.join(OUTPUT_DIR, skinId, "front", `${card.id}.png`));
      ok ? generated++ : failed++;
      await delay(2000);
    }

    // 마이너 아르카나
    for (const suit of suits) {
      console.log(`  📦 마이너 아르카나 — ${suit} (14장)...`);
      for (let i = 0; i < 14; i++) {
        const num = i + 1;
        const id = `${suit}-${String(num).padStart(2, "0")}`;
        if (cardFlag && id !== cardFlag) continue;
        const prompt = buildMinorFrontPrompt(skinId, suit, num, minorNames[i]);
        const ok = await generateImage(prompt, path.join(OUTPUT_DIR, skinId, "front", `${id}.png`));
        ok ? generated++ : failed++;
        await delay(2000);
      }
    }
  }

  console.log("\n=====================================");
  console.log(`✅ 생성: ${generated}장 | ❌ 실패: ${failed}장`);
  console.log(`📂 출력: ${OUTPUT_DIR}`);
}

main().catch(console.error);
```

- [ ] **Step 2: 커밋**

```bash
git add scripts/generate-skin-images.ts
git commit -m "feat: 6스킨 대응 이미지 생성 스크립트"
```

---

### Task 12: Supabase Storage 업로드 스크립트

**Files:**
- Create: `scripts/upload-skin-images.ts`

- [ ] **Step 1: 업로드 스크립트 작성**

```typescript
// scripts/upload-skin-images.ts

import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET_NAME = "card-skins";
const INPUT_DIR = path.join(process.cwd(), "output/card-skins");

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("❌ NEXT_PUBLIC_SUPABASE_URL과 SUPABASE_SERVICE_ROLE_KEY 환경변수를 설정해주세요.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function ensureBucket() {
  const { data } = await supabase.storage.getBucket(BUCKET_NAME);
  if (!data) {
    const { error } = await supabase.storage.createBucket(BUCKET_NAME, {
      public: true,
      fileSizeLimit: 10 * 1024 * 1024, // 10MB
    });
    if (error) { console.error("❌ 버킷 생성 실패:", error.message); process.exit(1); }
    console.log(`✅ 버킷 '${BUCKET_NAME}' 생성 완료`);
  } else {
    console.log(`✅ 버킷 '${BUCKET_NAME}' 존재 확인`);
  }
}

async function uploadFile(localPath: string, storagePath: string): Promise<boolean> {
  const fileBuffer = fs.readFileSync(localPath);
  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(storagePath, fileBuffer, {
      contentType: "image/png",
      upsert: true,
    });

  if (error) {
    console.error(`  ✗ ${storagePath}: ${error.message}`);
    return false;
  }
  console.log(`  ✓ ${storagePath}`);
  return true;
}

async function main() {
  const args = process.argv.slice(2);
  const skinFlag = args.find((a) => a.startsWith("--skin="))?.split("=")[1];

  await ensureBucket();

  if (!fs.existsSync(INPUT_DIR)) {
    console.error(`❌ 입력 디렉토리 없음: ${INPUT_DIR}`);
    console.error("먼저 generate-skin-images.ts를 실행하세요.");
    process.exit(1);
  }

  const skinDirs = skinFlag
    ? [skinFlag]
    : fs.readdirSync(INPUT_DIR).filter((d) => fs.statSync(path.join(INPUT_DIR, d)).isDirectory());

  let uploaded = 0;
  let failed = 0;

  for (const skinId of skinDirs) {
    const skinDir = path.join(INPUT_DIR, skinId);
    if (!fs.existsSync(skinDir)) { console.error(`❌ 스킨 디렉토리 없음: ${skinId}`); continue; }

    console.log(`\n🎨 [${skinId}] 업로드 시작...`);

    // 뒷면
    const backPath = path.join(skinDir, "back.png");
    if (fs.existsSync(backPath)) {
      const ok = await uploadFile(backPath, `${skinId}/back.png`);
      ok ? uploaded++ : failed++;
    }

    // 앞면
    const frontDir = path.join(skinDir, "front");
    if (fs.existsSync(frontDir)) {
      const files = fs.readdirSync(frontDir).filter((f) => f.endsWith(".png"));
      for (const file of files) {
        const ok = await uploadFile(path.join(frontDir, file), `${skinId}/front/${file}`);
        ok ? uploaded++ : failed++;
      }
    }
  }

  console.log("\n=====================================");
  console.log(`✅ 업로드: ${uploaded}장 | ❌ 실패: ${failed}장`);
}

main().catch(console.error);
```

- [ ] **Step 2: 커밋**

```bash
git add scripts/upload-skin-images.ts
git commit -m "feat: Supabase Storage 이미지 업로드 스크립트"
```

---

### Task 13: CardDeck 및 나머지 카드 사용처 스킨 연동

**Files:**
- Modify: `src/components/card/CardDeck.tsx`
- Modify: 기타 CardItem/CardFace/CardBack 사용처

- [ ] **Step 1: CardDeck.tsx에서 스킨 연동**

CardDeck에서 useSkinStore를 import하고, CardItem에 skinId를 전달:

```typescript
// CardDeck.tsx 상단에 추가:
import { useSkinStore } from "@/hooks/useSkinStore";

// 컴포넌트 내부에 추가:
const { selectedSkinId } = useSkinStore();

// CardItem 호출 시 skinId 전달:
<CardItem ... skinId={selectedSkinId} />
```

- [ ] **Step 2: 기타 CardItem/CardFace/CardBack 사용처 확인 및 동일 패턴 적용**

프로젝트에서 CardItem, CardFace, CardBack을 import하는 모든 컴포넌트를 grep으로 찾아, useSkinStore에서 selectedSkinId를 읽어 전달하도록 수정. 각 사용처에서:
1. `import { useSkinStore } from "@/hooks/useSkinStore";` 추가
2. `const { selectedSkinId } = useSkinStore();` 추가
3. CardItem/CardFace/CardBack에 `skinId={selectedSkinId}` prop 전달

- [ ] **Step 3: 타입 체크, 린트, 빌드 확인**

Run: `pnpm tsc --noEmit && pnpm lint && pnpm build`
Expected: PASS

- [ ] **Step 4: 커밋**

```bash
git add -A
git commit -m "feat: 전체 카드 사용처 스킨 연동"
```

---

### Task 14: 최종 통합 검증

- [ ] **Step 1: 전체 빌드 검증 (5회 반복)**

```bash
pnpm tsc --noEmit && pnpm lint && pnpm build
```

5회 연속 통과 확인.

- [ ] **Step 2: 변경 사항 리뷰**

- 스펙 준수 확인: 6스킨 메타데이터, Zustand store, Storage 헬퍼, CardFace/CardBack 이미지+폴백, SkinGallery 홈 섹션, 이미지 생성/업로드 스크립트, DB 마이그레이션
- 코드 품질: 미사용 import 없음, 기존 패턴과 일관성 확인
- 레이아웃: SkinGallery가 모바일 2열, 데스크탑 3열 그리드인지 확인

- [ ] **Step 3: 최종 커밋**

모든 변경사항이 이미 커밋되어 있는지 확인. 누락된 파일이 있으면 추가 커밋.

```bash
git status
```
