# Daily Fortune Widget 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** 홈 화면의 DailyCard 위젯을 5개 영역(종합운·연애·직장·건강·재물) 운세를 한 번에 보여주는 DailyFortune 위젯으로 교체한다.

**Architecture:** `daily_cards` 테이블에 `area` 컬럼을 추가하고, 새 `/api/daily-fortune` 엔드포인트가 5개 영역을 단일 AI 호출로 생성·캐시한다. 클라이언트 `DailyFortune.tsx`는 1+4 레이아웃(종합운 상단 + 4영역 2×2 그리드)으로 카드 플립 인터랙션을 제공한다.

**Tech Stack:** Next.js 16 App Router, TypeScript strict, Tailwind CSS v4, Framer Motion v12, Vitest, Playwright, Supabase/Drizzle DB abstraction, Zod, Grok API (FallbackProvider)

---

## 파일 맵

| 동작 | 경로 |
|------|------|
| CREATE | `supabase/migrations/017_daily_fortune_areas.sql` |
| CREATE | `src/app/api/daily-fortune/route.ts` |
| CREATE | `src/components/home/DailyFortune.tsx` |
| CREATE | `src/__tests__/api/daily-fortune.test.ts` |
| MODIFY | `src/lib/validation/api-schemas.ts` |
| MODIFY | `src/i18n/translations/ko/index.ts` |
| MODIFY | `src/i18n/translations/en/index.ts` |
| MODIFY | `src/i18n/translations/ja/index.ts` |
| MODIFY | `src/app/api/daily-card/route.ts` (upsert conflict key 패치) |
| MODIFY | `src/app/page.tsx` |
| MODIFY | `src/components/layout/MobileNav.tsx` |
| MODIFY | `e2e/daily-card.spec.ts` (→ daily-fortune으로 전환) |
| MODIFY | `e2e/home.spec.ts` |
| MODIFY | `e2e/api-error-handling.spec.ts` |
| MODIFY | `e2e/cross-platform.spec.ts` |
| MODIFY | `e2e/responsive.spec.ts` |
| MODIFY | `sonar-project.properties` |
| DELETE | `src/components/home/DailyCard.tsx` |

---

## Task 1: DB 마이그레이션

**Files:**
- Create: `supabase/migrations/017_daily_fortune_areas.sql`

- [x] **Step 1: 마이그레이션 파일 생성**

```sql
-- 017_daily_fortune_areas.sql
-- daily_cards 테이블에 area 컬럼 추가 (운세 영역 구분)
ALTER TABLE daily_cards ADD COLUMN IF NOT EXISTS area text NOT NULL DEFAULT 'general';

-- 기존 UNIQUE (date, character_id) → (date, character_id, area) 변경
-- Supabase는 constraint 이름으로 DROP INDEX가 되지 않으므로 두 방식 모두 시도
ALTER TABLE daily_cards DROP CONSTRAINT IF EXISTS daily_cards_date_character_id_key;
DROP INDEX IF EXISTS daily_cards_date_character_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS daily_cards_date_character_area_key
  ON daily_cards (date, character_id, area);
```

- [x] **Step 2: 커밋**

```bash
git add supabase/migrations/017_daily_fortune_areas.sql
git commit -m "feat(db): daily_cards에 area 컬럼 추가 — 5개 운세 영역 지원"
```

---

## Task 2: Zod 스키마 + i18n 키

**Files:**
- Modify: `src/lib/validation/api-schemas.ts`
- Modify: `src/i18n/translations/ko/index.ts`
- Modify: `src/i18n/translations/en/index.ts`
- Modify: `src/i18n/translations/ja/index.ts`

- [x] **Step 1: DailyFortuneSchema 추가**

`src/lib/validation/api-schemas.ts`의 `DailyCardSchema` 아래에 추가:

```ts
// daily-fortune은 daily-card와 동일한 필드 구조 (재사용)
export const DailyFortuneSchema = z.object({
  characterId: z.string().min(1).max(50),
  date: dateStr,
});
```

- [x] **Step 2: ko 번역 키 추가**

`src/i18n/translations/ko/index.ts`의 `home` 객체 끝(`"gallery.desc"` 다음)에 추가:

```ts
    "daily-fortune.title": "오늘의 운세",
    "daily-fortune.tap-hint": "탭하여 운세 확인",
    "daily-fortune.area.general": "종합운",
    "daily-fortune.area.love": "연애/인연",
    "daily-fortune.area.career": "직장/취업",
    "daily-fortune.area.health": "건강",
    "daily-fortune.area.wealth": "재물/재정",
```

동일 파일 `api` 객체에 추가:

```ts
    "daily-fortune-error": "오늘의 운세를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.",
```

- [x] **Step 3: en 번역 키 추가**

`src/i18n/translations/en/index.ts`의 `home` 객체에 추가:

```ts
    "daily-fortune.title": "Today's Fortune",
    "daily-fortune.tap-hint": "Tap to reveal",
    "daily-fortune.area.general": "Overall",
    "daily-fortune.area.love": "Love",
    "daily-fortune.area.career": "Career",
    "daily-fortune.area.health": "Health",
    "daily-fortune.area.wealth": "Wealth",
```

`api` 객체에 추가:

```ts
    "daily-fortune-error": "Failed to load today's fortune. Please try again shortly.",
```

- [x] **Step 4: ja 번역 키 추가**

`src/i18n/translations/ja/index.ts`의 `home` 객체에 추가:

```ts
    "daily-fortune.title": "今日の運勢",
    "daily-fortune.tap-hint": "タップして確認",
    "daily-fortune.area.general": "総合運",
    "daily-fortune.area.love": "恋愛",
    "daily-fortune.area.career": "仕事",
    "daily-fortune.area.health": "健康",
    "daily-fortune.area.wealth": "財運",
```

`api` 객체에 추가:

```ts
    "daily-fortune-error": "今日の運勢を取得できませんでした。しばらくしてから再度お試しください。",
```

- [x] **Step 5: i18n drift 검사 실행**

```bash
pnpm i18n:check
```

기대 출력: `KO 313개 | EN 313개 | JA 313개` (이전보다 8개 증가), `✅ 번역 키 drift 없음`

- [x] **Step 6: 커밋**

```bash
git add src/lib/validation/api-schemas.ts src/i18n/translations/ko/index.ts src/i18n/translations/en/index.ts src/i18n/translations/ja/index.ts
git commit -m "feat(i18n): DailyFortune Zod 스키마 + 번역 키 8개 추가"
```

---

## Task 3: `/api/daily-fortune` 엔드포인트 (TDD)

**Files:**
- Create: `src/__tests__/api/daily-fortune.test.ts`
- Create: `src/app/api/daily-fortune/route.ts`

- [x] **Step 1: 실패하는 테스트 작성**

`src/__tests__/api/daily-fortune.test.ts` 전체 파일:

```ts
import { describe, it, expect, vi } from "vitest";
import { setupDoMock } from "@/test-helpers/reset-modules";
import { makeMockDb } from "@/test-helpers/mock-db";
import { makePostRequest } from "@/test-helpers/mock-request";
import { makeMockAiModule } from "@/test-helpers/mock-ai";

setupDoMock();

const TODAY = "2026-05-11";
const VALID_BODY = { characterId: "arcana", date: TODAY };

const CACHED_ROWS = [
  { area: "general", card_id: "major-00", is_reversed: false, interpretation: "종합 해석", keywords: ["시작"] },
  { area: "love",    card_id: "major-06", is_reversed: false, interpretation: "연애 해석", keywords: ["인연"] },
  { area: "career",  card_id: "major-01", is_reversed: false, interpretation: "직장 해석", keywords: ["의지"] },
  { area: "health",  card_id: "major-14", is_reversed: false, interpretation: "건강 해석", keywords: ["균형"] },
  { area: "wealth",  card_id: "major-10", is_reversed: false, interpretation: "재물 해석", keywords: ["행운"] },
];

async function setup(options: {
  cachedCount?: number;   // 캐시된 영역 수 (0~5)
  aiError?: string | boolean;
  rateLimited?: boolean;
} = {}) {
  const mockDb = makeMockDb();
  const count = options.cachedCount ?? 0;
  mockDb.findMany.mockResolvedValue(CACHED_ROWS.slice(0, count));
  mockDb.upsert.mockResolvedValue({});

  const mockAiModule = makeMockAiModule();
  if (options.aiError) {
    const msg = typeof options.aiError === "string" ? options.aiError : "AI down";
    const provider = { generateReading: vi.fn().mockRejectedValue(new Error(msg)) };
    mockAiModule.FallbackProvider.mockImplementation(() => provider);
  } else {
    const aiJson = JSON.stringify({
      general: "종합운 해석", love: "연애운 해석", career: "직장운 해석",
      health: "건강운 해석", wealth: "재물운 해석",
    });
    const provider = { generateReading: vi.fn().mockResolvedValue(aiJson) };
    mockAiModule.FallbackProvider.mockImplementation(() => provider);
  }

  vi.doMock("@/lib/db", () => ({ getDb: vi.fn().mockReturnValue(mockDb) }));
  vi.doMock("@/services/core/fallback-provider", () => mockAiModule);
  vi.doMock("@/lib/rate-limit", () => ({
    checkRateLimit: vi.fn().mockResolvedValue(!options.rateLimited),
    rateLimitResponse: vi.fn().mockReturnValue(
      new Response(JSON.stringify({ error: "Too many requests" }), { status: 429 })
    ),
  }));

  const { POST } = await import("@/app/api/daily-fortune/route");
  return { POST, mockDb };
}

describe("POST /api/daily-fortune", () => {
  it("5개 영역 전부 캐시 히트 → AI 호출 없이 5개 반환", async () => {
    const { POST, mockDb } = await setup({ cachedCount: 5 });
    const res = await POST(makePostRequest(VALID_BODY));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.areas).toHaveLength(5);
    expect(body.areas.map((a: { area: string }) => a.area).sort()).toEqual(
      ["career", "general", "health", "love", "wealth"]
    );
    expect(mockDb.upsert).not.toHaveBeenCalled();
  });

  it("캐시 미스 → AI 호출 후 5개 영역 반환", async () => {
    const { POST } = await setup({ cachedCount: 0 });
    const res = await POST(makePostRequest(VALID_BODY));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.areas).toHaveLength(5);
    expect(body.areas[0].cardId).toBeTruthy();
    expect(body.areas[0].interpretation).toBeTruthy();
  });

  it("일부 캐시 히트 → 누락 영역만 AI 호출", async () => {
    const { POST, mockDb } = await setup({ cachedCount: 3 });
    const res = await POST(makePostRequest(VALID_BODY));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.areas).toHaveLength(5);
    // upsert는 누락된 2개 영역만 호출
    expect(mockDb.upsert).toHaveBeenCalledTimes(2);
  });

  it("레이트 리밋 초과 → 429", async () => {
    const { POST } = await setup({ rateLimited: true });
    const res = await POST(makePostRequest(VALID_BODY));
    expect(res.status).toBe(429);
  });

  it("캐릭터 없음 → 404", async () => {
    const { POST } = await setup();
    const res = await POST(makePostRequest({ characterId: "no-such-char", date: TODAY }));
    expect(res.status).toBe(404);
    expect((await res.json()).error).toBe("Character not found");
  });

  it("date 형식 오류 → 400", async () => {
    const { POST } = await setup();
    const res = await POST(makePostRequest({ characterId: "arcana", date: "2026/05/11" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Invalid request");
  });

  it("body 없음 → 400", async () => {
    const { POST } = await setup();
    const res = await POST(makePostRequest({}));
    expect(res.status).toBe(400);
  });

  it("AI 오류 → 500 (오늘의 운세 메시지)", async () => {
    const { POST } = await setup({ aiError: true });
    const res = await POST(makePostRequest(VALID_BODY));
    expect(res.status).toBe(500);
    expect((await res.json()).error).toMatch(/오늘의 운세를 불러오지 못했습니다/);
  });

  it("API_KEY 오류 → 500 (AI 서비스 설정 메시지)", async () => {
    const { POST } = await setup({ aiError: "Invalid API_KEY provided" });
    const res = await POST(makePostRequest(VALID_BODY));
    expect(res.status).toBe(500);
    expect((await res.json()).error).toMatch(/AI 서비스 설정/);
  });

  it("각 영역 cardId·isReversed 타입 검증", async () => {
    const { POST } = await setup({ cachedCount: 5 });
    const res = await POST(makePostRequest(VALID_BODY));
    const body = await res.json();
    for (const a of body.areas) {
      expect(typeof a.cardId).toBe("string");
      expect(typeof a.isReversed).toBe("boolean");
      expect(Array.isArray(a.keywords)).toBe(true);
    }
  });
});
```

- [x] **Step 2: 테스트 실패 확인**

```bash
pnpm test src/__tests__/api/daily-fortune.test.ts 2>&1 | head -20
```

기대 출력: `Cannot find module '@/app/api/daily-fortune/route'`

- [x] **Step 3: API 라우트 구현**

`src/app/api/daily-fortune/route.ts` 전체 파일:

```ts
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { FallbackProvider } from "@/services/core/fallback-provider";
import { DeckManager } from "@/services/tarot/deck-manager";
import { getCharacterById } from "@/data/characters";
import { DailyFortuneSchema } from "@/lib/validation/api-schemas";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-utils";
import { getRequestLocale } from "@/i18n/server-locale";
import { t as translate } from "@/i18n/translations";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/i18n/config";
import { parseJsonSafe } from "@/services/core/text-cleaner";
import { buildCharacterHeader } from "@/services/core/prompt-builder";

const grokProvider = new FallbackProvider();
const deckManager = new DeckManager();

type Area = "general" | "love" | "career" | "health" | "wealth";
const AREAS: Area[] = ["general", "love", "career", "health", "wealth"];
const AREA_LABELS: Record<Area, string> = {
  general: "종합운", love: "연애/인연", career: "직장/취업",
  health: "건강", wealth: "재물/재정",
};

function hashDateSeed(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + c;
    hash |= 0;
  }
  return Math.abs(hash);
}

type CachedRow = { area: Area; card_id: string; is_reversed: boolean; interpretation: string; keywords: string[] };

export async function POST(request: NextRequest) {
  let locale: Locale = DEFAULT_LOCALE;
  try {
    const reqLocale = await getRequestLocale();
    if (isLocale(reqLocale)) locale = reqLocale;

    const ip = getClientIp(request.headers);
    if (!(await checkRateLimit(`daily-fortune:${ip}`, 10, 60_000))) return rateLimitResponse(locale);

    const parsed = DailyFortuneSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

    const { characterId, date } = parsed.data;
    const character = getCharacterById(characterId);
    if (!character) return NextResponse.json({ error: "Character not found" }, { status: 404 });

    const db = getDb();
    const cachedRows = await db.findMany<CachedRow>("daily_cards", { date, character_id: characterId });
    const cachedByArea = new Map(cachedRows.map((r) => [r.area as Area, r]));
    const missingAreas = AREAS.filter((a) => !cachedByArea.has(a));

    // 영역별 결정론적 카드 결정
    const allCards = deckManager.getAllCards();
    const areaCards = AREAS.map((area) => {
      const seed = hashDateSeed(`${date}-${characterId}-${area}`);
      const card = allCards[seed % allCards.length];
      const isReversed = (seed % 3) === 0;
      const meanings = isReversed ? card.reversed : card.upright;
      return { area, cardId: card.id, isReversed, nameKo: card.nameKo, direction: isReversed ? "역방향" : "정방향", keywords: meanings.keywords.slice(0, 3), meaning: meanings.meaning };
    });

    if (missingAreas.length > 0) {
      const missingCards = areaCards.filter((ac) => missingAreas.includes(ac.area));
      const cardsDesc = missingCards
        .map((ac) => `- ${AREA_LABELS[ac.area]}: ${ac.nameKo} [${ac.direction}] / 키워드: ${ac.keywords.join(", ")} / 의미: ${ac.meaning}`)
        .join("\n");
      const template = Object.fromEntries(missingAreas.map((a) => [a, "..."]));
      const userPrompt = `오늘 뽑힌 카드:\n${cardsDesc}\n\n각 영역의 오늘 운세를 3~4문장으로 작성해주세요. 당신의 말투와 성격을 반영하세요.\n반드시 아래 JSON 형식으로만 응답하세요:\n${JSON.stringify(template)}`;
      const systemPrompt = `${buildCharacterHeader(character, "오늘의 운세를 전달하는 상담사입니다.", locale)}\n- 각 영역마다 3~4문장으로 간결하고 따뜻하게 운세를 전달합니다.\n- JSON 형식 외 다른 텍스트는 출력하지 않습니다.`;

      const aiResponse = await grokProvider.generateReading(systemPrompt, userPrompt, 2000);
      const interpretations = parseJsonSafe<Record<string, string>>(aiResponse) ?? {};

      for (const ac of missingCards) {
        const interpretation = interpretations[ac.area] ?? "";
        await db.upsert("daily_cards", {
          date, character_id: characterId, area: ac.area,
          card_id: ac.cardId, is_reversed: ac.isReversed, interpretation, keywords: ac.keywords,
        }, "date,character_id,area");
        cachedByArea.set(ac.area, { area: ac.area, card_id: ac.cardId, is_reversed: ac.isReversed, interpretation, keywords: ac.keywords });
      }
    }

    const areas = AREAS.map((area) => {
      const row = cachedByArea.get(area);
      const ac = areaCards.find((c) => c.area === area)!;
      return {
        area,
        cardId: row?.card_id ?? ac.cardId,
        isReversed: row?.is_reversed ?? ac.isReversed,
        interpretation: row?.interpretation ?? "",
        keywords: row?.keywords ?? ac.keywords,
      };
    });

    return NextResponse.json({ areas });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("Daily fortune error:", errMsg);
    const userMessage =
      errMsg.includes("API_KEY") || errMsg.includes("auth") ? translate("api.ai-config-error", locale)
      : errMsg.includes("rate limit") || errMsg.includes("429") ? translate("api.rate-limit-error", locale)
      : translate("api.daily-fortune-error", locale);
    return NextResponse.json({ error: userMessage }, { status: 500 });
  }
}
```

- [x] **Step 4: 테스트 실행 → 통과 확인**

```bash
pnpm test src/__tests__/api/daily-fortune.test.ts
```

기대 출력: `✓ 10 tests passed`

- [x] **Step 5: `/api/daily-card` upsert 패치**

마이그레이션 후 기존 `/api/daily-card/route.ts`의 upsert 충돌키가 깨집니다. 아래 두 곳을 수정합니다.

`src/app/api/daily-card/route.ts`에서:

```ts
// 수정 전
await db.upsert("daily_cards", {
  date,
  character_id: characterId,
  card_id: card.id,
  is_reversed: isReversed,
  interpretation,
  keywords,
}, "date,character_id");

// 수정 후 (area 컬럼 추가 + 충돌키 변경)
await db.upsert("daily_cards", {
  date,
  character_id: characterId,
  area: "general",
  card_id: card.id,
  is_reversed: isReversed,
  interpretation,
  keywords,
}, "date,character_id,area");
```

또한 캐시 조회에도 `area: "general"` 조건을 추가합니다:

```ts
// 수정 전
const cached = await db.findOne<{...}>("daily_cards", { date, character_id: characterId });

// 수정 후
const cached = await db.findOne<{...}>("daily_cards", { date, character_id: characterId, area: "general" });
```

- [x] **Step 6: daily-card 기존 테스트 확인**

```bash
pnpm test src/__tests__/api/daily-card.test.ts
```

기대 출력: `✓ 모든 테스트 통과` (mock이 findOne을 그대로 사용하므로 변경 없이 통과)

- [x] **Step 7: 커밋**

```bash
git add src/__tests__/api/daily-fortune.test.ts src/app/api/daily-fortune/route.ts src/app/api/daily-card/route.ts
git commit -m "feat(api): /api/daily-fortune 엔드포인트 — 5개 영역 일일 운세 캐시·생성"
```

---

## Task 4: DailyFortune 컴포넌트

**Files:**
- Create: `src/components/home/DailyFortune.tsx`
- Modify: `src/app/page.tsx`
- Modify: `src/components/layout/MobileNav.tsx`
- Delete: `src/components/home/DailyCard.tsx`

- [x] **Step 1: DailyFortune.tsx 생성**

`src/components/home/DailyFortune.tsx` 전체 파일:

```tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ScrollReveal } from "@/components/effects/ScrollReveal";
import { getAvailableCharacters } from "@/data/characters";
import { DeckManager } from "@/services/tarot/deck-manager";
import { CardFace } from "@/components/card/CardFace";
import { CardBack } from "@/components/card/CardBack";
import { useSkinStore } from "@/hooks/useSkinStore";
import { useCardStyleStore } from "@/hooks/useCardStyleStore";
import { useThemeStore } from "@/hooks/useTheme";
import { useT } from "@/i18n/useT";
import Image from "next/image";
import type { CardStyleId } from "@/data/cardStyles";

const deckManager = new DeckManager();

type Area = "general" | "love" | "career" | "health" | "wealth";
const AREAS: Area[] = ["general", "love", "career", "health", "wealth"];

const DATE_LOCALE: Record<string, string> = { ko: "ko-KR", en: "en-US", ja: "ja-JP" };

interface AreaResult {
  area: Area;
  cardId: string;
  isReversed: boolean;
  interpretation: string;
  keywords: string[];
}

interface FortuneData {
  areas: AreaResult[];
}

function AreaCardSlot({
  areaResult, isFlipped, isLoading, selectedSkinId, styleId, onFlip, areaLabel, tr,
}: {
  areaResult: AreaResult | undefined;
  isFlipped: boolean;
  isLoading: boolean;
  selectedSkinId: string;
  styleId: CardStyleId;
  onFlip: () => void;
  areaLabel: string;
  tr: (key: string) => string;
}) {
  const card = areaResult ? deckManager.getCardById(areaResult.cardId) : undefined;

  return (
    <div className="flex flex-col items-center gap-2">
      <span className="text-xs font-sans text-arcana-muted font-medium">{areaLabel}</span>
      {isLoading || !areaResult ? (
        <div className="w-24 h-36 rounded-lg bg-arcana-card/60 border border-arcana-border flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-arcana-purple/30 border-t-arcana-purple rounded-full animate-spin" />
        </div>
      ) : (
        <motion.div
          onClick={onFlip}
          className="cursor-pointer"
          style={{ perspective: "1000px" }}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
        >
          <motion.div
            animate={{ rotateY: isFlipped ? 180 : 0 }}
            transition={{ duration: 0.55 }}
            style={{ transformStyle: "preserve-3d" }}
            className="relative w-24 h-36"
          >
            <div style={{ backfaceVisibility: "hidden" }} className="absolute inset-0">
              <CardBack size="md" className="w-full h-full" skinId={selectedSkinId} styleId={styleId} />
            </div>
            <div style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }} className="absolute inset-0">
              {card && (
                <CardFace card={card} isReversed={areaResult.isReversed} size="md" className="w-full h-full" skinId={selectedSkinId} styleId={styleId} />
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
      {!isFlipped && !isLoading && areaResult && (
        <p className="text-arcana-muted text-xs text-center">{tr("home.daily-fortune.tap-hint")}</p>
      )}
      {isFlipped && areaResult && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-[140px]"
        >
          <div className="flex flex-wrap justify-center gap-1 mb-1">
            {areaResult.keywords.map((kw) => (
              <span key={kw} className="px-1.5 py-0.5 text-[10px] rounded-full bg-arcana-purple/10 text-arcana-purple border border-arcana-purple/20">{kw}</span>
            ))}
          </div>
          <p className="text-arcana-text text-xs leading-relaxed">{areaResult.interpretation}</p>
        </motion.div>
      )}
    </div>
  );
}

export function DailyFortune() {
  const { t: tr, locale } = useT();
  const characters = getAvailableCharacters();
  const { selectedSkinId } = useSkinStore();
  const { activeTheme } = useThemeStore();
  const { resolvedStyle } = useCardStyleStore();
  const styleId = resolvedStyle(activeTheme);

  const [selectedCharId, setSelectedCharId] = useState(characters[0].id);
  const [fortuneData, setFortuneData] = useState<FortuneData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [flipped, setFlipped] = useState<Record<Area, boolean>>({ general: false, love: false, career: false, health: false, wealth: false });
  const [today, setToday] = useState("");
  const [todayLabel, setTodayLabel] = useState("");

  useEffect(() => {
    const d = new Date();
    setToday(d.toISOString().split("T")[0]);
    setTodayLabel(d.toLocaleDateString(DATE_LOCALE[locale] ?? DATE_LOCALE.ko, { year: "numeric", month: "long", day: "numeric", weekday: "long" }));
  }, [locale]);

  const fetchFortune = useCallback(async (charId: string, date: string) => {
    if (!date) return;
    setIsLoading(true);
    setFortuneData(null);
    try {
      const res = await fetch("/api/daily-fortune", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ characterId: charId, date }),
      });
      if (res.ok) setFortuneData(await res.json());
    } catch (e) { console.warn("오늘의 운세 로드 실패:", e); }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (today) fetchFortune(selectedCharId, today);
  }, [selectedCharId, today, fetchFortune]);

  const handleCharChange = (charId: string) => {
    setSelectedCharId(charId);
    setFlipped({ general: false, love: false, career: false, health: false, wealth: false });
  };

  const handleFlip = (area: Area) => {
    setFlipped((prev) => ({ ...prev, [area]: true }));
  };

  const getAreaResult = (area: Area) => fortuneData?.areas.find((a) => a.area === area);
  const activeCharacter = characters.find((c) => c.id === selectedCharId);
  const generalResult = getAreaResult("general");

  return (
    <section id="daily-fortune" className="py-16 md:py-24 px-4">
      <div className="max-w-4xl mx-auto">
        <ScrollReveal className="text-center mb-8">
          <h2 className="text-xl md:text-2xl font-display font-bold mb-2">{tr("home.daily-fortune.title")}</h2>
          <p className="text-arcana-muted text-sm" suppressHydrationWarning>{todayLabel}</p>
        </ScrollReveal>

        {/* 캐릭터 탭 */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2 scrollbar-hide justify-start md:justify-center md:flex-wrap">
          {characters.map((char) => (
            <button key={char.id} type="button" onClick={() => handleCharChange(char.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-sans transition-all ${
                selectedCharId === char.id
                  ? "bg-arcana-purple text-white shadow-lg shadow-arcana-purple/30"
                  : "bg-arcana-card/70 text-arcana-muted hover:text-arcana-text border border-arcana-border"
              }`}
            >
              <div className="w-5 h-5 rounded-full overflow-hidden">
                <Image src={`/images/characters/${char.id}/nukki-enhanced/default.png`} alt="" width={20} height={20} className="object-cover" />
              </div>
              <span className="hidden sm:inline">{char.name}</span>
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={selectedCharId} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            {/* 종합운 — 상단 중앙 크게 */}
            <div className="flex flex-col items-center mb-8">
              <AreaCardSlot
                areaResult={generalResult}
                isFlipped={flipped.general}
                isLoading={isLoading}
                selectedSkinId={selectedSkinId}
                styleId={styleId}
                onFlip={() => handleFlip("general")}
                areaLabel={tr("home.daily-fortune.area.general")}
                tr={tr}
              />
              {flipped.general && generalResult && (
                <div className="mt-3 text-center max-w-xs">
                  <div className="px-2 py-0.5 inline-block bg-gradient-to-r from-arcana-purple to-arcana-indigo rounded-full mb-1">
                    <span className="text-white text-xs font-display font-bold">{activeCharacter?.name}</span>
                  </div>
                </div>
              )}
            </div>

            {/* 4개 영역 — 2×2 그리드 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 justify-items-center">
              {(["love", "career", "health", "wealth"] as Area[]).map((area) => (
                <AreaCardSlot
                  key={area}
                  areaResult={getAreaResult(area)}
                  isFlipped={flipped[area]}
                  isLoading={isLoading}
                  selectedSkinId={selectedSkinId}
                  styleId={styleId}
                  onFlip={() => handleFlip(area)}
                  areaLabel={tr(`home.daily-fortune.area.${area}`)}
                  tr={tr}
                />
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
```

- [x] **Step 2: page.tsx에서 DailyCard → DailyFortune 교체**

`src/app/page.tsx`에서:

```tsx
// 수정 전
import { DailyCard } from "@/components/home/DailyCard";
// ...
      <DailyCard />

// 수정 후
import { DailyFortune } from "@/components/home/DailyFortune";
// ...
      <DailyFortune />
```

- [x] **Step 3: MobileNav 앵커 문자열 업데이트**

`src/components/layout/MobileNav.tsx`에서:

```ts
// 수정 전
const isActive = item.href === "/" || item.href === "/#daily-card"

// 수정 후
const isActive = item.href === "/" || item.href === "/#daily-fortune"
```

- [x] **Step 4: DailyCard.tsx 삭제**

```bash
git rm src/components/home/DailyCard.tsx
```

- [x] **Step 5: 타입·린트 검사**

```bash
pnpm type-check 2>&1 | tail -5
pnpm lint 2>&1 | tail -5
```

기대 출력: 오류 없음

- [x] **Step 6: 커밋**

```bash
git add src/components/home/DailyFortune.tsx src/app/page.tsx src/components/layout/MobileNav.tsx
git commit -m "feat(ui): DailyFortune 위젯 — 5개 영역 1+4 레이아웃, DailyCard 제거"
```

---

## Task 5: E2E 업데이트 + SonarCloud 동기화

**Files:**
- Modify: `e2e/daily-card.spec.ts`
- Modify: `e2e/home.spec.ts`
- Modify: `e2e/api-error-handling.spec.ts`
- Modify: `e2e/cross-platform.spec.ts`
- Modify: `e2e/responsive.spec.ts`
- Modify: `sonar-project.properties`

- [x] **Step 1: daily-card.spec.ts → DailyFortune 셀렉터로 전환**

`e2e/daily-card.spec.ts` 전체 파일 교체:

```ts
import { test, expect } from "@playwright/test";

test.describe("DailyFortune — 오늘의 운세", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const section = page.locator("#daily-fortune");
    await section.scrollIntoViewIfNeeded();
  });

  test("DailyFortune 섹션 존재", async ({ page }) => {
    const section = page.locator("#daily-fortune");
    await expect(section).toBeVisible();
  });

  test("캐릭터 탭 버튼 존재 (최소 2개)", async ({ page }) => {
    const section = page.locator("#daily-fortune");
    const tabs = section.getByRole("button");
    expect(await tabs.count()).toBeGreaterThanOrEqual(2);
  });

  test("캐릭터 탭 전환 가능", async ({ page }) => {
    const section = page.locator("#daily-fortune");
    const tabs = section.getByRole("button");
    if (await tabs.count() >= 2) {
      await tabs.nth(1).click();
      await page.waitForTimeout(500);
    }
  });

  test("카드 영역 존재 (뒷면 또는 앞면)", async ({ page }) => {
    const section = page.locator("#daily-fortune");
    const cardElements = section.locator("img, svg");
    expect(await cardElements.count()).toBeGreaterThanOrEqual(1);
  });

  test("콘솔 에러 없음", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    expect(errors).toHaveLength(0);
  });
});
```

- [x] **Step 2: home.spec.ts — #daily-card → #daily-fortune**

`e2e/home.spec.ts`에서 `#daily-card`를 `#daily-fortune`으로 변경:

```ts
// 수정 전
const section = page.locator("#daily-card");

// 수정 후
const section = page.locator("#daily-fortune");
```

- [x] **Step 3: api-error-handling.spec.ts — API 경로·응답 형식 업데이트**

`e2e/api-error-handling.spec.ts`에서 daily-card mock을 daily-fortune으로 변경:

```ts
// 수정 전
await page.route("**/api/daily-card", (route) => {
  route.fulfill({ status: 500, body: JSON.stringify({ error: "서버 오류" }) });
});

// 수정 후
await page.route("**/api/daily-fortune", (route) => {
  route.fulfill({ status: 500, body: JSON.stringify({ error: "서버 오류" }) });
});
```

- [x] **Step 4: cross-platform.spec.ts — API mock 업데이트**

`e2e/cross-platform.spec.ts`에서:

```ts
// 수정 전
await page.route("**/api/daily-card", async (route) => {
  await route.fulfill({ status: 200, body: JSON.stringify({ cardId: "major-00", isReversed: false, interpretation: "테스트 해석", keywords: ["테스트"] }) });
});

// 수정 후
await page.route("**/api/daily-fortune", async (route) => {
  await route.fulfill({
    status: 200,
    body: JSON.stringify({
      areas: [
        { area: "general", cardId: "major-00", isReversed: false, interpretation: "테스트 해석", keywords: ["테스트"] },
        { area: "love",    cardId: "major-06", isReversed: false, interpretation: "연애 해석",   keywords: ["인연"] },
        { area: "career",  cardId: "major-01", isReversed: false, interpretation: "직장 해석",   keywords: ["의지"] },
        { area: "health",  cardId: "major-14", isReversed: false, interpretation: "건강 해석",   keywords: ["균형"] },
        { area: "wealth",  cardId: "major-10", isReversed: false, interpretation: "재물 해석",   keywords: ["행운"] },
      ],
    }),
  });
});
```

- [x] **Step 5: responsive.spec.ts — API mock 업데이트**

`e2e/responsive.spec.ts`에서 cross-platform.spec.ts와 동일하게 `**/api/daily-card` → `**/api/daily-fortune`으로 변경하고, 응답 형식을 위의 `areas` 배열 형식으로 업데이트.

- [x] **Step 6: sonar-project.properties — 신규 파일 동기화**

`sonar-project.properties`에서 `sonar.coverage.exclusions`와 `sonar.cpd.exclusions`의 `src/app/api/daily-card/route.ts` 항목이 있는지 확인 후, 패턴에 따라 `src/components/home/DailyFortune.tsx`를 `sonar.cpd.exclusions`에 추가. (API route는 테스트가 있으므로 coverage 제외 불필요)

```
# sonar.cpd.exclusions 에 추가
  src/components/home/DailyFortune.tsx,\
```

- [x] **Step 7: 커밋**

```bash
git add e2e/daily-card.spec.ts e2e/home.spec.ts e2e/api-error-handling.spec.ts e2e/cross-platform.spec.ts e2e/responsive.spec.ts sonar-project.properties
git commit -m "test(e2e): DailyCard → DailyFortune E2E 셀렉터·API mock 업데이트"
```

---

## Task 6: 최종 검증

- [x] **Step 1: 단위 테스트 전체 실행**

```bash
pnpm test:coverage 2>&1 | tail -20
```

기대 출력: 기존 대비 테스트 수 증가 (daily-fortune 10개), 커버리지 임계치 통과

- [x] **Step 2: 빌드 확인**

```bash
pnpm build 2>&1 | tail -10
```

기대 출력: `✓ Compiled successfully`

- [x] **Step 3: 최종 커밋 (feature 브랜치 완성)**

```bash
git log --oneline -6
```

기대 출력: Task 1~5 커밋 6개 확인

---

## 주의사항 체크리스트

- [x] `DeckManager.getCardById()`가 `null`을 반환할 수 있으므로 컴포넌트에서 optional chaining 사용
- [x] `getAvailableCharacters()` 첫 번째 캐릭터 이미지 경로는 `nukki-enhanced/default.png` (기존 DailyCard는 `idle.png` 사용 — 수정 필요)
- [x] `daily_cards` 마이그레이션이 적용되기 전 로컬 개발 시 `area` 컬럼 오류 발생 가능 — Supabase 대시보드에서 마이그레이션 먼저 적용할 것
- [x] `FallbackProvider`는 파일 상단 모듈 레벨에서 1회만 `new`할 것 (CircuitBreaker 쿨다운 보존)
