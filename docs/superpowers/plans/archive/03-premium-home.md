> **Status**: 구현 완료 (일부 변경)
> **Note**: 작성 시점(2026-03-29) 기준 구현 계획. 실제 구현과 다른 주요 항목:
> - 홈 섹션: 8개 → **실제 10개** (GenderFilter, SkinGallery 추가)
> - 캐릭터 갤러리: `char.speciality`, `char.description` 사용 — `CharacterConfig`에 실제 존재함
> - CharacterGallery Link href: 캐릭터별 `/character/[id]` 라우트로 이동
>
> **⚠️ 이 문서는 개발 히스토리 기록입니다.** 현재 구현 상태는 `CLAUDE.md`를 참조하세요.

# 홈 페이지 전면 리뉴얼 — 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ArcanaInsight 홈 페이지를 유료 수준 8개 섹션으로 전면 리뉴얼하고, 캐릭터별 일일 운세 API를 구축한다.

**Architecture:** 8개 독립 섹션 컴포넌트를 `src/components/home/`에 생성하고, `src/app/page.tsx`에서 조합. 일일 운세는 `/api/daily-card` API 라우트 + Supabase `daily_cards` 테이블로 구현. 스크롤 인터섹션 애니메이션은 공통 `ScrollReveal` 래퍼 컴포넌트 사용.

**Tech Stack:** Next.js 16, TypeScript, Framer Motion 12, Tailwind CSS v4, Zustand 5, Grok API, Supabase

---

## 파일 구조

### 신규 파일

| 파일 | 역할 |
|------|------|
| `src/components/effects/ScrollReveal.tsx` | 스크롤 인터섹션 페이드인 래퍼 |
| `src/components/home/HeroSection.tsx` | 풀스크린 히어로 |
| `src/components/home/CharacterGallery.tsx` | 캐릭터 대형 카드 갤러리 |
| `src/components/home/DailyCard.tsx` | 오늘의 카드 (캐릭터별 탭) |
| `src/components/home/ServiceFlow.tsx` | 4단계 서비스 소개 |
| `src/components/home/ReviewCarousel.tsx` | 후기 캐러셀 |
| `src/components/home/StatsCounter.tsx` | 통계 카운터 |
| `src/components/home/FAQ.tsx` | 아코디언 FAQ |
| `src/components/home/BottomCTA.tsx` | 하단 CTA |
| `src/app/api/daily-card/route.ts` | 일일 카드 API |
| `src/data/home/reviews.ts` | 샘플 후기 데이터 |
| `src/data/home/faq.ts` | FAQ 데이터 |
| `src/data/home/stats.ts` | 통계 데이터 |
| `supabase/migrations/003_daily_cards.sql` | daily_cards 테이블 + profiles 컬럼 |

### 수정 파일

| 파일 | 변경 |
|------|------|
| `src/app/page.tsx` | 전면 교체 — 8개 섹션 조합 |

---

## Task 1: ScrollReveal 공통 컴포넌트

**Files:**
- Create: `src/components/effects/ScrollReveal.tsx`

- [ ] **Step 1: ScrollReveal 컴포넌트 작성**

```tsx
"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";

interface ScrollRevealProps {
  children: React.ReactNode;
  delay?: number;
  direction?: "up" | "left" | "right" | "none";
  className?: string;
}

export function ScrollReveal({ children, delay = 0, direction = "up", className = "" }: ScrollRevealProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  const variants = {
    hidden: {
      opacity: 0,
      y: direction === "up" ? 30 : 0,
      x: direction === "left" ? -30 : direction === "right" ? 30 : 0,
    },
    visible: {
      opacity: 1,
      y: 0,
      x: 0,
    },
  };

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={variants}
      transition={{ duration: 0.6, delay, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
```

- [ ] **Step 2: 빌드 확인**

Run: `pnpm tsc --noEmit`

- [ ] **Step 3: 커밋**

```bash
git add src/components/effects/ScrollReveal.tsx
git commit -m "feat: ScrollReveal — 스크롤 인터섹션 페이드인 래퍼 컴포넌트"
```

---

## Task 2: 홈 데이터 파일 (후기, FAQ, 통계)

**Files:**
- Create: `src/data/home/reviews.ts`
- Create: `src/data/home/faq.ts`
- Create: `src/data/home/stats.ts`

- [ ] **Step 1: 후기 데이터**

```ts
// src/data/home/reviews.ts
export interface Review {
  id: string;
  name: string;
  rating: number;
  text: string;
  characterId: string;
  topic: string;
}

export const reviews: Review[] = [
  { id: "r1", name: "별빛여행자", rating: 5, text: "아르카나의 해석이 정말 소름 돋을 정도로 정확했어요. AI라고 믿기 어려울 만큼 따뜻한 조언이었습니다.", characterId: "arcana", topic: "연애/관계" },
  { id: "r2", name: "달빛수호자", rating: 5, text: "미코의 엄숙하면서도 깊이 있는 해석 덕분에 고민이 정리됐어요. 마음이 차분해지는 상담이었습니다.", characterId: "miko", topic: "직장/진로" },
  { id: "r3", name: "꽃바람", rating: 4, text: "선화의 우아한 말투로 듣는 타로가 이렇게 힐링이 될 줄 몰랐어요. 매일 오늘의 카드 확인하고 있어요!", characterId: "seonhwa", topic: "일반 상담" },
  { id: "r4", name: "별의조각", rating: 5, text: "호시가 너무 귀여워서 상담 받는 내내 웃었어요ㅋㅋ 근데 해석은 진짜 정확해서 놀랐습니다!", characterId: "hoshi", topic: "재정/금전" },
  { id: "r5", name: "밤하늘꿈", rating: 5, text: "3카드 스프레드로 진로 상담 받았는데, 현재 상황을 너무 잘 짚어줘서 깜짝 놀랐어요.", characterId: "arcana", topic: "직장/진로" },
  { id: "r6", name: "은하수길", rating: 4, text: "캐릭터마다 해석 스타일이 달라서 같은 카드도 다르게 느껴져요. 여러 캐릭터로 비교해보는 재미가 있습니다.", characterId: "seonhwa", topic: "건강" },
];
```

- [ ] **Step 2: FAQ 데이터**

```ts
// src/data/home/faq.ts
export interface FAQItem {
  question: string;
  answer: string;
}

export const faqItems: FAQItem[] = [
  { question: "AI가 정말로 타로를 해석하나요?", answer: "네, 최신 Grok AI 기술을 활용하여 78장 정통 타로 카드의 상징과 의미를 깊이 있게 해석합니다. 각 캐릭터의 고유한 성격과 말투로 개인화된 리딩을 제공합니다." },
  { question: "무료로 이용할 수 있나요?", answer: "기본 타로 상담과 오늘의 카드는 완전 무료입니다. 로그인 없이도 바로 이용 가능하며, 로그인하시면 리딩 히스토리 저장과 매일 운세 알림을 받으실 수 있습니다." },
  { question: "개인정보는 안전한가요?", answer: "소셜 로그인(구글)을 통한 최소한의 정보만 수집하며, 모든 데이터는 암호화되어 안전하게 보관됩니다. 상담 내용은 본인만 확인 가능합니다." },
  { question: "상담 결과를 다시 볼 수 있나요?", answer: "로그인 후 마이페이지에서 모든 리딩 히스토리를 확인하실 수 있습니다. 결과 공유 링크를 통해 친구에게 보여줄 수도 있어요." },
  { question: "어떤 타로 카드를 사용하나요?", answer: "전통 라이더-웨이트 기반의 78장 풀 덱을 사용합니다. 메이저 아르카나 22장과 마이너 아르카나 56장(완드/컵/소드/펜타클)을 모두 포함합니다." },
  { question: "캐릭터마다 해석이 다른가요?", answer: "네! 4명의 상담사는 각자 고유한 성격과 말투를 가지고 있어 같은 카드도 다른 관점에서 해석합니다. 아르카나는 신비롭고 따뜻하게, 미코는 영적으로 깊게, 선화는 우아하고 지혜롭게, 호시는 밝고 친근하게 리딩합니다." },
];
```

- [ ] **Step 3: 통계 데이터**

```ts
// src/data/home/stats.ts
export interface StatItem {
  icon: string;
  value: number;
  suffix: string;
  label: string;
}

export const stats: StatItem[] = [
  { icon: "🃏", value: 10000, suffix: "+", label: "누적 리딩" },
  { icon: "👤", value: 2500, suffix: "+", label: "활성 사용자" },
  { icon: "⭐", value: 4.8, suffix: "/5.0", label: "만족도" },
  { icon: "🔮", value: 4, suffix: "명", label: "AI 상담사" },
];
```

- [ ] **Step 4: 빌드 확인 + 커밋**

```bash
git add src/data/home/
git commit -m "feat: 홈 페이지 데이터 — 후기, FAQ, 통계 샘플 데이터"
```

---

## Task 3: HeroSection 컴포넌트

**Files:**
- Create: `src/components/home/HeroSection.tsx`

- [ ] **Step 1: HeroSection 작성**

```tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ParticleOverlay } from "@/components/effects/ParticleOverlay";
import { CharacterDisplay } from "@/components/character/CharacterDisplay";
import { getCharacterById } from "@/data/characters";

export function HeroSection() {
  const arcana = getCharacterById("arcana")!;

  const scrollToDaily = () => {
    document.getElementById("daily-card")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="relative h-screen flex flex-col overflow-hidden">
      {/* 배경 */}
      <div className="absolute inset-0 -z-10">
        <Image src="/images/backgrounds/hero-bg.jpg" alt="" fill className="object-cover" priority />
        <div className="absolute inset-0 bg-arcana-bg/50" />
        <div className="absolute inset-0" style={{
          background: "radial-gradient(ellipse at center, transparent 40%, rgba(10,10,26,0.7) 100%)",
        }} />
      </div>

      <ParticleOverlay density="medium" className="z-10" />

      {/* 콘텐츠: 데스크탑 5:5 / 모바일 세로 */}
      <div className="flex-1 flex flex-col md:flex-row items-center z-20 px-4 md:px-8">
        {/* 좌측: 캐릭터 */}
        <motion.div
          initial={{ x: -50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="h-[40%] md:h-auto w-full md:w-[50%] relative"
        >
          <CharacterDisplay character={arcana} mood="smile" className="w-full h-full" />
        </motion.div>

        {/* 우측: 카피 + CTA */}
        <motion.div
          initial={{ x: 50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
          className="w-full md:w-[50%] flex flex-col items-center md:items-start justify-center px-4 md:px-12"
        >
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif font-bold mb-4 text-center md:text-left leading-tight">
            <span className="bg-gradient-to-r from-arcana-purple via-arcana-indigo to-arcana-gold bg-clip-text text-transparent">
              카드가 속삭이는
            </span>
            <br />
            <span className="text-arcana-text">당신의 이야기</span>
          </h1>
          <p className="text-arcana-muted text-sm md:text-base mb-8 text-center md:text-left max-w-md">
            AI 타로 상담사와 함께하는 신비로운 운세 체험. 4명의 개성 있는 캐릭터가 카드의 메시지를 전합니다.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link href="/tarot"
              className="px-8 py-3 rounded-full bg-gradient-to-r from-arcana-purple to-arcana-indigo text-white font-serif font-bold text-sm hover:opacity-90 transition-opacity shadow-lg shadow-arcana-purple/20 text-center">
              타로 상담 시작하기
            </Link>
            <button onClick={scrollToDaily} type="button"
              className="px-8 py-3 rounded-full border border-arcana-purple text-arcana-purple font-serif font-bold text-sm hover:bg-arcana-purple/10 transition-colors text-center">
              오늘의 카드 뽑기
            </button>
          </div>
        </motion.div>
      </div>

      {/* 스크롤 유도 */}
      <motion.div
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 text-arcana-muted text-xs flex flex-col items-center gap-1"
      >
        <span>스크롤하여 더 알아보기</span>
        <span>▼</span>
      </motion.div>
    </section>
  );
}
```

- [ ] **Step 2: 빌드 확인 + 커밋**

```bash
git add src/components/home/HeroSection.tsx
git commit -m "feat: HeroSection — 풀스크린 히어로 (캐릭터 + 카피 + CTA)"
```

---

## Task 4: CharacterGallery 컴포넌트

**Files:**
- Create: `src/components/home/CharacterGallery.tsx`

- [ ] **Step 1: CharacterGallery 작성**

```tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ScrollReveal } from "@/components/effects/ScrollReveal";
import { getAvailableCharacters } from "@/data/characters";

const THEME_COLORS: Record<string, string> = {
  arcana: "shadow-purple-500/30 hover:border-purple-400",
  miko: "shadow-red-500/30 hover:border-red-400",
  seonhwa: "shadow-pink-500/30 hover:border-pink-400",
  hoshi: "shadow-blue-500/30 hover:border-blue-400",
};

export function CharacterGallery() {
  const characters = getAvailableCharacters();

  return (
    <section className="py-16 md:py-24 px-4">
      <div className="max-w-6xl mx-auto">
        <ScrollReveal className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-serif font-bold mb-3">당신의 상담사를 만나보세요</h2>
          <p className="text-arcana-muted text-sm md:text-base max-w-lg mx-auto">
            각 상담사만의 특별한 리딩 스타일로 카드의 메시지를 전합니다
          </p>
        </ScrollReveal>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {characters.map((char, index) => (
            <ScrollReveal key={char.id} delay={index * 0.15}>
              <Link href={`/tarot`}>
                <motion.div
                  whileHover={{ y: -12, scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className={`bg-arcana-card/80 backdrop-blur-sm border border-arcana-border rounded-2xl overflow-hidden transition-all hover:shadow-xl ${THEME_COLORS[char.id] || ""}`}
                >
                  {/* 캐릭터 이미지 */}
                  <div className="relative aspect-[3/4] overflow-hidden">
                    <Image
                      src={`/images/characters/${char.id}/nukki/idle.png`}
                      alt={`${char.name} - ${char.personality}`}
                      fill
                      className="object-cover object-top"
                    />
                    <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-arcana-card to-transparent" />
                  </div>

                  {/* 캐릭터 정보 */}
                  <div className="p-4">
                    <h3 className="font-serif font-bold text-base">{char.name}</h3>
                    <p className="text-arcana-muted text-xs mt-0.5">{char.nameJp}</p>
                    <div className="mt-2 inline-block px-2 py-0.5 bg-arcana-purple/10 border border-arcana-purple/30 rounded-full">
                      <span className="text-arcana-purple text-[10px] font-serif">{char.speciality}</span>
                    </div>
                    <p className="text-arcana-muted text-xs mt-2 line-clamp-2 leading-relaxed">
                      {char.description.slice(0, 50)}...
                    </p>
                  </div>
                </motion.div>
              </Link>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: 빌드 확인 + 커밋**

```bash
git add src/components/home/CharacterGallery.tsx
git commit -m "feat: CharacterGallery — 캐릭터 대형 카드 갤러리 (테마 컬러)"
```

---

## Task 5: ServiceFlow 컴포넌트

**Files:**
- Create: `src/components/home/ServiceFlow.tsx`

- [ ] **Step 1: ServiceFlow 작성**

```tsx
"use client";

import { ScrollReveal } from "@/components/effects/ScrollReveal";

const STEPS = [
  { num: "01", icon: "👤", title: "상담사 선택", desc: "4명의 개성 있는 AI 상담사 중 선택" },
  { num: "02", icon: "🎯", title: "주제 선택", desc: "연애, 직장, 재정, 건강, 일반 5가지 주제" },
  { num: "03", icon: "🃏", title: "카드 리딩", desc: "직감으로 카드를 선택하면 실시간 AI 해석" },
  { num: "04", icon: "📖", title: "결과 확인", desc: "상세 해석과 조언, 저장 및 공유 가능" },
];

export function ServiceFlow() {
  return (
    <section className="py-16 md:py-24 px-4 bg-arcana-surface/30">
      <div className="max-w-5xl mx-auto">
        <ScrollReveal className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-serif font-bold mb-3">이렇게 진행됩니다</h2>
          <p className="text-arcana-muted text-sm md:text-base">간단한 4단계로 타로 상담을 받아보세요</p>
        </ScrollReveal>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 md:gap-4 relative">
          {/* 연결선 (데스크탑만) */}
          <div className="hidden md:block absolute top-12 left-[12.5%] right-[12.5%] h-px bg-gradient-to-r from-arcana-purple/50 via-arcana-indigo/50 to-arcana-gold/50" />

          {STEPS.map((step, i) => (
            <ScrollReveal key={step.num} delay={i * 0.2}>
              <div className="flex flex-row md:flex-col items-center md:text-center gap-4 md:gap-0">
                {/* 번호 원 */}
                <div className="relative z-10 w-14 h-14 md:w-16 md:h-16 rounded-full bg-arcana-card border-2 border-arcana-purple/50 flex items-center justify-center flex-shrink-0 md:mb-4">
                  <span className="text-xl">{step.icon}</span>
                </div>
                <div>
                  <span className="text-arcana-purple text-xs font-serif font-bold">STEP {step.num}</span>
                  <h3 className="font-serif font-bold text-sm mt-1">{step.title}</h3>
                  <p className="text-arcana-muted text-xs mt-1 leading-relaxed">{step.desc}</p>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: 빌드 확인 + 커밋**

```bash
git add src/components/home/ServiceFlow.tsx
git commit -m "feat: ServiceFlow — 4단계 서비스 소개 타임라인"
```

---

## Task 6: ReviewCarousel 컴포넌트

**Files:**
- Create: `src/components/home/ReviewCarousel.tsx`

- [ ] **Step 1: ReviewCarousel 작성**

```tsx
"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ScrollReveal } from "@/components/effects/ScrollReveal";
import { reviews } from "@/data/home/reviews";

export function ReviewCarousel() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % reviews.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const goTo = (index: number) => setCurrent(index);
  const prev = () => setCurrent((c) => (c - 1 + reviews.length) % reviews.length);
  const next = () => setCurrent((c) => (c + 1) % reviews.length);

  return (
    <section className="py-16 md:py-24 px-4">
      <div className="max-w-3xl mx-auto">
        <ScrollReveal className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-serif font-bold mb-3">상담 후기</h2>
          <p className="text-arcana-muted text-sm md:text-base">실제 사용자들의 리딩 경험</p>
        </ScrollReveal>

        <div className="relative">
          {/* 좌우 화살표 */}
          <button onClick={prev} type="button" aria-label="이전 후기"
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 md:-translate-x-6 z-10 w-10 h-10 rounded-full bg-arcana-card/80 border border-arcana-border flex items-center justify-center text-arcana-muted hover:text-arcana-purple transition-colors">
            ‹
          </button>
          <button onClick={next} type="button" aria-label="다음 후기"
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 md:translate-x-6 z-10 w-10 h-10 rounded-full bg-arcana-card/80 border border-arcana-border flex items-center justify-center text-arcana-muted hover:text-arcana-purple transition-colors">
            ›
          </button>

          {/* 후기 카드 */}
          <div className="overflow-hidden px-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={current}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.3 }}
                className="bg-arcana-card/80 backdrop-blur-sm border border-arcana-border rounded-2xl p-6 md:p-8"
              >
                {/* 별점 */}
                <div className="flex gap-1 mb-3">
                  {Array.from({ length: 5 }, (_, i) => (
                    <span key={i} className={i < reviews[current].rating ? "text-arcana-gold" : "text-arcana-border"}>★</span>
                  ))}
                </div>
                {/* 후기 텍스트 */}
                <p className="text-arcana-text text-sm md:text-base leading-relaxed mb-4">
                  &ldquo;{reviews[current].text}&rdquo;
                </p>
                {/* 작성자 */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-arcana-purple/20 flex items-center justify-center text-arcana-purple text-xs font-bold">
                      {reviews[current].name[0]}
                    </div>
                    <span className="text-arcana-muted text-sm">{reviews[current].name}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-arcana-purple/10 text-arcana-purple">{reviews[current].topic}</span>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* 도트 인디케이터 */}
          <div className="flex justify-center gap-2 mt-6">
            {reviews.map((_, i) => (
              <button key={i} onClick={() => goTo(i)} type="button" aria-label={`후기 ${i + 1}`}
                className={`w-2 h-2 rounded-full transition-all ${i === current ? "bg-arcana-purple w-6" : "bg-arcana-border"}`} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: 빌드 확인 + 커밋**

```bash
git add src/components/home/ReviewCarousel.tsx
git commit -m "feat: ReviewCarousel — 후기 캐러셀 (자동 슬라이드 + 네비게이션)"
```

---

## Task 7: StatsCounter 컴포넌트

**Files:**
- Create: `src/components/home/StatsCounter.tsx`

- [ ] **Step 1: StatsCounter 작성**

```tsx
"use client";

import { useRef, useEffect, useState } from "react";
import { useInView } from "framer-motion";
import { ScrollReveal } from "@/components/effects/ScrollReveal";
import { stats } from "@/data/home/stats";

function AnimatedNumber({ value, suffix }: { value: number; suffix: string }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!isInView) return;
    const duration = 1500;
    const start = Date.now();
    const isDecimal = value % 1 !== 0;

    const animate = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(isDecimal ? parseFloat((value * eased).toFixed(1)) : Math.floor(value * eased));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [isInView, value]);

  return (
    <span ref={ref} className="text-3xl md:text-4xl font-serif font-bold text-arcana-purple">
      {display.toLocaleString()}{suffix}
    </span>
  );
}

export function StatsCounter() {
  return (
    <section className="py-16 md:py-20 px-4 bg-arcana-surface/30">
      <div className="max-w-4xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
          {stats.map((stat, i) => (
            <ScrollReveal key={stat.label} delay={i * 0.1}>
              <div className="text-center">
                <div className="text-2xl mb-2">{stat.icon}</div>
                <AnimatedNumber value={stat.value} suffix={stat.suffix} />
                <p className="text-arcana-muted text-xs mt-1">{stat.label}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: 빌드 확인 + 커밋**

```bash
git add src/components/home/StatsCounter.tsx
git commit -m "feat: StatsCounter — 통계 카운터 (스크롤 트리거 카운트업 애니메이션)"
```

---

## Task 8: FAQ 컴포넌트

**Files:**
- Create: `src/components/home/FAQ.tsx`

- [ ] **Step 1: FAQ 작성**

```tsx
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ScrollReveal } from "@/components/effects/ScrollReveal";
import { faqItems } from "@/data/home/faq";

function FAQItem({ question, answer, index }: { question: string; answer: string; index: number }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <ScrollReveal delay={index * 0.1}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        type="button"
        className="w-full bg-arcana-card/60 backdrop-blur-sm border border-arcana-border rounded-xl p-4 md:p-5 text-left hover:border-arcana-purple/50 transition-colors"
      >
        <div className="flex items-center justify-between gap-4">
          <h3 className="font-serif font-bold text-sm md:text-base">{question}</h3>
          <motion.span
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="text-arcana-purple flex-shrink-0"
          >
            ▼
          </motion.span>
        </div>
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <p className="text-arcana-muted text-xs md:text-sm leading-relaxed mt-3 pt-3 border-t border-arcana-border/50">
                {answer}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </button>
    </ScrollReveal>
  );
}

export function FAQ() {
  return (
    <section className="py-16 md:py-24 px-4">
      <div className="max-w-3xl mx-auto">
        <ScrollReveal className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-serif font-bold mb-3">자주 묻는 질문</h2>
        </ScrollReveal>

        <div className="space-y-3">
          {faqItems.map((item, i) => (
            <FAQItem key={i} question={item.question} answer={item.answer} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: 빌드 확인 + 커밋**

```bash
git add src/components/home/FAQ.tsx
git commit -m "feat: FAQ — 아코디언 FAQ (스크롤 등장 + 확장 애니메이션)"
```

---

## Task 9: BottomCTA 컴포넌트

**Files:**
- Create: `src/components/home/BottomCTA.tsx`

- [ ] **Step 1: BottomCTA 작성**

```tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { ScrollReveal } from "@/components/effects/ScrollReveal";

export function BottomCTA() {
  return (
    <section className="relative py-20 md:py-28 px-4 overflow-hidden">
      {/* 배경 */}
      <div className="absolute inset-0 -z-10">
        <Image src="/images/backgrounds/hero-bg.jpg" alt="" fill className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-arcana-purple/80 to-arcana-indigo/80" />
      </div>

      <div className="max-w-2xl mx-auto text-center relative z-10">
        <ScrollReveal>
          <h2 className="text-2xl md:text-3xl font-serif font-bold mb-4 text-white">
            지금 바로 첫 번째 상담을 시작해보세요
          </h2>
          <p className="text-white/70 text-sm md:text-base mb-8">
            로그인 없이도 바로 이용 가능합니다
          </p>
          <Link href="/tarot"
            className="inline-block px-10 py-4 rounded-full bg-white text-arcana-purple font-serif font-bold text-sm hover:bg-white/90 transition-colors shadow-xl">
            상담 시작하기
          </Link>

          {/* 캐릭터 아바타 */}
          <div className="flex justify-center gap-3 mt-8">
            {["arcana", "miko", "seonhwa", "hoshi"].map((id) => (
              <div key={id} className="w-10 h-10 rounded-full overflow-hidden border-2 border-white/30">
                <Image src={`/images/characters/${id}/nukki/idle.png`} alt="" width={40} height={40} className="object-cover" />
              </div>
            ))}
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: 빌드 확인 + 커밋**

```bash
git add src/components/home/BottomCTA.tsx
git commit -m "feat: BottomCTA — 하단 CTA (배경 그라디언트 + 캐릭터 아바타)"
```

---

## Task 10: DailyCard API 라우트

**Files:**
- Create: `src/app/api/daily-card/route.ts`

- [ ] **Step 1: daily-card API 작성**

```ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { GrokProvider } from "@/services/core/grok-provider";
import { DeckManager } from "@/services/tarot/deck-manager";
import { getCharacterById } from "@/data/characters";

const grokProvider = new GrokProvider();
const deckManager = new DeckManager();

function hashDateSeed(date: string, characterId: string): number {
  let hash = 0;
  const str = `${date}-${characterId}`;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

export async function POST(request: NextRequest) {
  try {
    const { characterId, date } = (await request.json()) as { characterId: string; date: string };

    if (!characterId || !date) {
      return NextResponse.json({ error: "characterId and date are required" }, { status: 400 });
    }

    const character = getCharacterById(characterId);
    if (!character) {
      return NextResponse.json({ error: "Character not found" }, { status: 404 });
    }

    // 캐시 확인
    const supabase = await createClient();
    const { data: cached } = await supabase
      .from("daily_cards")
      .select("*")
      .eq("date", date)
      .eq("character_id", characterId)
      .single();

    if (cached) {
      return NextResponse.json({
        cardId: cached.card_id,
        isReversed: cached.is_reversed,
        interpretation: cached.interpretation,
        keywords: cached.keywords,
      });
    }

    // 카드 결정 (날짜+캐릭터 해시 시드)
    const allCards = deckManager.getAllCards();
    const seed = hashDateSeed(date, characterId);
    const cardIndex = seed % allCards.length;
    const card = allCards[cardIndex];
    const isReversed = (seed % 3) === 0;

    // Grok AI 해석
    const direction = isReversed ? "역방향" : "정방향";
    const meanings = isReversed ? card.reversed : card.upright;
    const prompt = `당신은 "${character.name}"입니다. ${character.speechStyle}

오늘의 카드: ${card.nameKo} (${card.name}) [${direction}]
키워드: ${meanings.keywords.join(", ")}
의미: ${meanings.meaning}

위 카드를 기반으로 오늘의 짧은 운세 메시지를 3~4문장으로 작성해주세요. 당신의 말투와 성격을 반영하세요. JSON 형식 없이 순수 텍스트로만 응답하세요.`;

    const interpretation = await grokProvider.generateReading(
      `당신은 ${character.name}입니다. ${character.personality} ${character.speechStyle}`,
      prompt
    );

    const keywords = meanings.keywords.slice(0, 3);

    // 캐시 저장
    await supabase.from("daily_cards").insert({
      date,
      character_id: characterId,
      card_id: card.id,
      is_reversed: isReversed,
      interpretation,
      keywords,
    });

    return NextResponse.json({ cardId: card.id, isReversed, interpretation, keywords });
  } catch (error) {
    console.error("Daily card error:", error);
    return NextResponse.json({ error: "Failed to generate daily card" }, { status: 500 });
  }
}
```

- [ ] **Step 2: 빌드 확인 + 커밋**

```bash
git add src/app/api/daily-card/route.ts
git commit -m "feat: /api/daily-card — 캐릭터별 일일 카드 API (Grok AI + Supabase 캐시)"
```

---

## Task 11: DailyCard 컴포넌트

**Files:**
- Create: `src/components/home/DailyCard.tsx`

- [ ] **Step 1: DailyCard 작성**

```tsx
"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { ScrollReveal } from "@/components/effects/ScrollReveal";
import { getAvailableCharacters } from "@/data/characters";
import { DeckManager } from "@/services/tarot/deck-manager";
import { CardFace } from "@/components/card/CardFace";
import { CardBack } from "@/components/card/CardBack";

const deckManager = new DeckManager();

interface DailyCardData {
  cardId: string;
  isReversed: boolean;
  interpretation: string;
  keywords: string[];
}

export function DailyCard() {
  const characters = getAvailableCharacters();
  const [activeTab, setActiveTab] = useState(characters[0].id);
  const [data, setData] = useState<Record<string, DailyCardData>>({});
  const [loading, setLoading] = useState<string | null>(null);
  const [flipped, setFlipped] = useState<Record<string, boolean>>({});

  const today = new Date().toISOString().split("T")[0];

  const fetchDailyCard = async (characterId: string) => {
    if (data[characterId]) return;
    setLoading(characterId);
    try {
      const res = await fetch("/api/daily-card", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ characterId, date: today }),
      });
      if (res.ok) {
        const result = await res.json();
        setData((prev) => ({ ...prev, [characterId]: result }));
      }
    } catch { /* 네트워크 에러 무시 */ }
    setLoading(null);
  };

  useEffect(() => {
    fetchDailyCard(activeTab);
  }, [activeTab]);

  const handleFlip = (characterId: string) => {
    setFlipped((prev) => ({ ...prev, [characterId]: true }));
  };

  const currentData = data[activeTab];
  const currentCard = currentData ? deckManager.getCardById(currentData.cardId) : null;
  const isFlipped = flipped[activeTab] || false;

  const handleShare = async () => {
    if (!currentData || !currentCard) return;
    const character = characters.find((c) => c.id === activeTab);
    const text = `🔮 오늘의 카드: ${currentCard.nameKo}\n\n${currentData.interpretation}\n\n- ${character?.name}의 해석 | ArcanaInsight`;
    if (navigator.share) {
      await navigator.share({ title: "오늘의 카드 - ArcanaInsight", text });
    } else {
      await navigator.clipboard.writeText(text);
    }
  };

  return (
    <section id="daily-card" className="py-16 md:py-24 px-4">
      <div className="max-w-4xl mx-auto">
        <ScrollReveal className="text-center mb-8">
          <h2 className="text-2xl md:text-3xl font-serif font-bold mb-2">오늘의 카드</h2>
          <p className="text-arcana-muted text-sm">{new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric", weekday: "long" })}</p>
        </ScrollReveal>

        {/* 캐릭터 탭 */}
        <div className="flex justify-center gap-2 mb-8">
          {characters.map((char) => (
            <button key={char.id} type="button" onClick={() => setActiveTab(char.id)}
              className={`flex items-center gap-2 px-3 md:px-4 py-2 rounded-full text-xs font-serif transition-all ${
                activeTab === char.id
                  ? "bg-arcana-purple text-white shadow-lg shadow-arcana-purple/30"
                  : "bg-arcana-card/60 text-arcana-muted hover:text-arcana-text border border-arcana-border"
              }`}
            >
              <div className="w-5 h-5 rounded-full overflow-hidden">
                <Image src={`/images/characters/${char.id}/nukki/idle.png`} alt="" width={20} height={20} className="object-cover" />
              </div>
              <span className="hidden sm:inline">{char.name}</span>
            </button>
          ))}
        </div>

        {/* 카드 + 해석 */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex flex-col md:flex-row gap-6 md:gap-8 items-center"
          >
            {/* 카드 (좌) */}
            <div className="flex-shrink-0 flex justify-center">
              {loading === activeTab ? (
                <div className="w-32 h-48 rounded-lg bg-arcana-card/60 border border-arcana-border flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-arcana-purple/30 border-t-arcana-purple rounded-full animate-spin" />
                </div>
              ) : currentCard ? (
                <motion.div
                  onClick={() => handleFlip(activeTab)}
                  className="cursor-pointer"
                  style={{ perspective: "1000px" }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <motion.div
                    animate={{ rotateY: isFlipped ? 180 : 0 }}
                    transition={{ duration: 0.6 }}
                    style={{ transformStyle: "preserve-3d" }}
                    className="relative w-32 h-48"
                  >
                    <div style={{ backfaceVisibility: "hidden" }} className="absolute inset-0">
                      <CardBack size="lg" className="w-full h-full" />
                    </div>
                    <div style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }} className="absolute inset-0">
                      <CardFace card={currentCard} isReversed={currentData.isReversed} size="lg" className="w-full h-full" />
                    </div>
                  </motion.div>
                  {!isFlipped && <p className="text-arcana-muted text-xs text-center mt-2">탭하여 카드 확인</p>}
                </motion.div>
              ) : (
                <div className="w-32 h-48 rounded-lg bg-arcana-card/60 border border-dashed border-arcana-border flex items-center justify-center">
                  <span className="text-arcana-muted text-xs">카드 로딩 중...</span>
                </div>
              )}
            </div>

            {/* 해석 (우) */}
            <div className="flex-1 min-w-0">
              {currentData && currentCard ? (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-serif font-bold text-lg">{currentCard.nameKo}</h3>
                    <p className="text-arcana-muted text-xs">{currentCard.name} {currentData.isReversed ? "(역방향)" : "(정방향)"}</p>
                  </div>

                  <div className="flex gap-2">
                    {currentData.keywords.map((kw) => (
                      <span key={kw} className="px-2 py-0.5 text-[10px] rounded-full bg-arcana-purple/10 text-arcana-purple border border-arcana-purple/20">
                        {kw}
                      </span>
                    ))}
                  </div>

                  <div className="bg-arcana-card/60 backdrop-blur-sm border border-arcana-border rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="px-2 py-0.5 bg-gradient-to-r from-arcana-purple to-arcana-indigo rounded-full">
                        <span className="text-white text-[10px] font-serif font-bold">
                          {characters.find((c) => c.id === activeTab)?.name}
                        </span>
                      </div>
                    </div>
                    <p className="text-arcana-text text-sm leading-relaxed">{currentData.interpretation}</p>
                  </div>

                  <button onClick={handleShare} type="button"
                    className="px-4 py-2 rounded-full border border-arcana-border text-arcana-muted text-xs hover:border-arcana-purple hover:text-arcana-purple transition-colors">
                    공유하기
                  </button>
                </div>
              ) : loading === activeTab ? (
                <div className="space-y-3">
                  <div className="h-6 bg-arcana-card/60 rounded w-1/3 animate-pulse" />
                  <div className="h-4 bg-arcana-card/60 rounded w-1/4 animate-pulse" />
                  <div className="h-24 bg-arcana-card/60 rounded animate-pulse" />
                </div>
              ) : null}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: 빌드 확인 + 커밋**

```bash
git add src/components/home/DailyCard.tsx
git commit -m "feat: DailyCard — 캐릭터별 일일 운세 (탭 전환 + 카드 뒤집기 + 공유)"
```

---

## Task 12: 홈 페이지 조합

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: page.tsx 전면 교체**

```tsx
import { HeroSection } from "@/components/home/HeroSection";
import { CharacterGallery } from "@/components/home/CharacterGallery";
import { DailyCard } from "@/components/home/DailyCard";
import { ServiceFlow } from "@/components/home/ServiceFlow";
import { ReviewCarousel } from "@/components/home/ReviewCarousel";
import { StatsCounter } from "@/components/home/StatsCounter";
import { FAQ } from "@/components/home/FAQ";
import { BottomCTA } from "@/components/home/BottomCTA";

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <HeroSection />
      <CharacterGallery />
      <DailyCard />
      <ServiceFlow />
      <ReviewCarousel />
      <StatsCounter />
      <FAQ />
      <BottomCTA />
    </div>
  );
}
```

- [ ] **Step 2: 빌드 확인 + 커밋**

```bash
git add src/app/page.tsx
git commit -m "feat: 홈 페이지 전면 리뉴얼 — 8개 섹션 조합"
```

---

## Task 13: Supabase 마이그레이션

**Files:**
- Create: `supabase/migrations/003_daily_cards.sql`

- [ ] **Step 1: 마이그레이션 SQL 작성**

```sql
-- daily_cards: 캐릭터별 일일 카드 캐시
CREATE TABLE IF NOT EXISTS daily_cards (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  date date NOT NULL,
  character_id text NOT NULL,
  card_id text NOT NULL,
  is_reversed boolean DEFAULT false,
  interpretation text NOT NULL,
  keywords text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  UNIQUE(date, character_id)
);

-- RLS 활성화
ALTER TABLE daily_cards ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 읽기 가능 (공개 데이터)
CREATE POLICY "daily_cards_read" ON daily_cards FOR SELECT USING (true);

-- 서비스 롤만 쓰기 가능
CREATE POLICY "daily_cards_insert" ON daily_cards FOR INSERT WITH CHECK (true);

-- profiles에 favorite_character_id 추가
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS favorite_character_id text;
```

- [ ] **Step 2: 커밋**

```bash
git add supabase/migrations/003_daily_cards.sql
git commit -m "feat: daily_cards 테이블 마이그레이션 + profiles.favorite_character_id"
```

---

## Task 14: 최종 통합 빌드 및 검증

**Files:** (전체)

- [ ] **Step 1: TypeScript 타입 체크**

Run: `pnpm tsc --noEmit`

- [ ] **Step 2: Lint 체크**

Run: `pnpm lint`

- [ ] **Step 3: 프로덕션 빌드**

Run: `pnpm build`

- [ ] **Step 4: 시각적 확인 (pnpm dev)**

확인 항목:
1. 히어로: 풀스크린 + 캐릭터 애니메이션 + CTA 2개
2. 캐릭터 갤러리: 4캐릭터 대형 카드 + 테마 컬러
3. 오늘의 카드: 4탭 전환 + 카드 뒤집기 + AI 해석 (API 연동)
4. 서비스 소개: 4단계 + 연결선 + 스크롤 등장
5. 후기: 캐러셀 자동 슬라이드 + 좌우 네비게이션
6. 통계: 카운트업 애니메이션 (스크롤 트리거)
7. FAQ: 아코디언 확장/축소
8. 하단 CTA: 배경 그라디언트 + 캐릭터 아바타
9. 스크롤 시 각 섹션 순차 등장
10. 모바일 375px에서 모든 섹션 정상 표시

- [ ] **Step 5: 커밋 (필요 시)**

```bash
git add -A
git commit -m "fix: 통합 빌드 검증 후 수정사항"
```
