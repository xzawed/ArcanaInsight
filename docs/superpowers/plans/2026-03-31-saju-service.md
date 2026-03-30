# 사주 서비스 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** tyme4ts 기반 고급 사주명리학 서비스를 ArcanaInsight에 추가한다. 팔자/십성/12운성/대운/세운/용신을 코드로 정확히 계산하고, Grok AI가 해석을 제공한다.

**Architecture:** 서버 사이드에서 tyme4ts로 사주팔자를 계산 → 계산 결과를 Grok AI 프롬프트에 포함하여 해석 요청 → SSE 스트리밍으로 클라이언트에 전달 → 사주 전용 DB 테이블에 저장. DivinationService 인터페이스를 구현하여 타로와 동일한 서비스 패턴을 따른다.

**Tech Stack:** Next.js 16 (App Router), TypeScript strict, tyme4ts, Grok API (SSE), Supabase, Zustand, Tailwind v4, Framer Motion

**Spec:** `docs/superpowers/specs/2026-03-31-saju-service-design.md`

---

## Phase 1: 기반 인프라 (기존 코드 수정)

### Task 1: tyme4ts 패키지 설치

**Files:**
- Modify: `package.json`

- [ ] **Step 1: 패키지 설치**

```bash
pnpm add tyme4ts
```

- [ ] **Step 2: 설치 확인**

```bash
node -e "const { SolarDay } = require('tyme4ts'); const d = SolarDay.fromYmd(1990, 5, 15); console.log(d.getLunarDay().toString());"
```
Expected: 음력 날짜 출력

- [ ] **Step 3: 커밋**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: tyme4ts 패키지 설치 — 사주 계산 라이브러리"
```

---

### Task 2: 타입 시스템 수정 (session.ts, service.ts)

**Files:**
- Modify: `src/types/session.ts`
- Modify: `src/types/service.ts`

기존 타로 동작을 보장하면서 사주 서비스를 수용하도록 타입을 확장한다.

- [ ] **Step 1: Topic 타입 확장 (session.ts)**

`src/types/session.ts`에서 Topic 타입에 사주 종합운세 3종을 추가:

```typescript
export type Topic = "love" | "love-single" | "love-couple" | "finance" | "career" | "health" | "general"
  | "fortune-3y" | "fortune-5y" | "fortune-full";
```

- [ ] **Step 2: Session.spreadType을 nullable로 변경 (session.ts)**

```typescript
export interface Session {
  id: string;
  userId: string | null;
  serviceType: string;
  topic: Topic;
  status: SessionStatus;
  spreadType: SpreadType | null;  // 사주는 null
  selectedCards: SelectedCard[];
  createdAt: Date;
  completedAt: Date | null;
}
```

- [ ] **Step 3: ReadingResult.cardInterpretations을 선택 필드로 변경 (service.ts)**

```typescript
export interface ReadingResult {
  cardInterpretations?: { cardId: string; position: number; interpretation: string }[];
  overallReading: string;
  advice: string;
  shareToken?: string | null;
}
```

- [ ] **Step 4: SessionContext.selectedCards를 선택 필드로 변경 (service.ts)**

```typescript
export interface SessionContext {
  session: Session;
  selectedCards?: SelectedCard[];
  chatHistory: ChatMessage[];
  topic: Topic;
}
```

- [ ] **Step 5: tsc로 기존 코드 호환성 확인**

```bash
pnpm tsc --noEmit
```
Expected: 에러 없음 (기존 타로 코드는 여전히 cardInterpretations와 selectedCards를 사용하지만 선택 필드로 변경해도 기존 할당은 유효)

- [ ] **Step 6: 커밋**

```bash
git add src/types/session.ts src/types/service.ts
git commit -m "refactor: 타입 시스템 확장 — Topic에 fortune-3y/5y/full 추가, Session/ReadingResult/SessionContext 사주 호환"
```

---

### Task 3: 캐릭터 시스템 수정

**Files:**
- Modify: `src/data/characters/index.ts`
- Modify: `src/app/tarot/page.tsx`

- [ ] **Step 1: getCharactersByService 함수 추가 (characters/index.ts)**

파일 하단의 유틸 함수 영역에 추가:

```typescript
export function getCharactersByService(serviceType: string): CharacterConfig[] {
  return characters.filter((c) => c.serviceType === serviceType && c.unlocked);
}
```

- [ ] **Step 2: 타로 페이지에서 캐릭터 필터 적용 (tarot/page.tsx)**

`getAvailableCharacters()` 호출을 `getCharactersByService("tarot")`로 변경:

import 수정:
```typescript
import { characters, getCharacterById, getCharactersByService } from "@/data/characters";
```

사용처 수정 (캐릭터 목록 생성 부분):
```typescript
const availableCharacters = getCharactersByService("tarot");
```

- [ ] **Step 3: tsc + 빌드 확인**

```bash
pnpm tsc --noEmit && pnpm build
```

- [ ] **Step 4: 커밋**

```bash
git add src/data/characters/index.ts src/app/tarot/page.tsx
git commit -m "feat: getCharactersByService 추가 + 타로 페이지 캐릭터 필터 적용"
```

---

### Task 4: DB 마이그레이션

**Files:**
- Create: `supabase/migrations/006_saju_readings.sql`

- [ ] **Step 1: 마이그레이션 파일 작성**

`supabase/migrations/006_saju_readings.sql`:

```sql
-- sessions.spread_type NULL 허용 (사주는 스프레드 불필요)
ALTER TABLE sessions ALTER COLUMN spread_type DROP NOT NULL;

-- Topic 제약 확장: 사주 종합운세 주제 추가
ALTER TABLE sessions DROP CONSTRAINT IF EXISTS sessions_topic_check;
ALTER TABLE sessions ADD CONSTRAINT sessions_topic_check
  CHECK (topic IN (
    'love', 'love-single', 'love-couple', 'finance', 'career', 'health', 'general',
    'fortune-3y', 'fortune-5y', 'fortune-full'
  ));

-- 사주 리딩 결과 테이블
CREATE TABLE IF NOT EXISTS saju_readings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id uuid REFERENCES sessions(id) ON DELETE CASCADE NOT NULL UNIQUE,

  -- 입력 데이터
  birth_date date NOT NULL,
  birth_hour text NOT NULL,
  gender text NOT NULL,
  birth_name text,

  -- 사주팔자 원본
  pillars jsonb NOT NULL,
  day_master text NOT NULL,
  day_master_element text NOT NULL,
  is_strong boolean NOT NULL,

  -- 분석 데이터
  elements jsonb NOT NULL,
  ten_stars jsonb NOT NULL,
  twelve_stages jsonb NOT NULL,
  interactions jsonb NOT NULL,
  yongsin jsonb NOT NULL,

  -- 운세 데이터
  major_fortunes jsonb NOT NULL,
  yearly_fortune jsonb NOT NULL,

  -- AI 해석 결과
  overall_reading text NOT NULL DEFAULT '',
  topic_reading text NOT NULL DEFAULT '',
  advice text NOT NULL DEFAULT '',

  -- 공유
  share_token text UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_saju_readings_session_id ON saju_readings(session_id);
CREATE INDEX IF NOT EXISTS idx_saju_readings_share_token ON saju_readings(share_token);
CREATE INDEX IF NOT EXISTS idx_saju_readings_birth_date ON saju_readings(birth_date);

ALTER TABLE saju_readings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Saju readings viewable by session owner" ON saju_readings FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM sessions s
    WHERE s.id = session_id AND (s.user_id = auth.uid() OR s.user_id IS NULL)
  ));
CREATE POLICY "Saju readings viewable by share token" ON saju_readings FOR SELECT
  USING (true);
CREATE POLICY "Anyone can insert saju readings" ON saju_readings FOR INSERT
  WITH CHECK (true);

-- 사주 서비스 활성화
UPDATE public.services SET is_active = true WHERE id = 'saju';
```

- [ ] **Step 2: Supabase에 마이그레이션 적용**

Supabase Dashboard SQL Editor에서 실행하거나:
```bash
# Supabase CLI 사용 시
supabase db push
```

- [ ] **Step 3: 커밋**

```bash
git add supabase/migrations/006_saju_readings.sql
git commit -m "feat: 사주 DB 마이그레이션 — saju_readings 테이블 + spread_type nullable + topic 확장"
```

---

## Phase 2: 사주 계산 엔진

### Task 5: 사주 상수 데이터 + 타입 정의

**Files:**
- Create: `src/data/saju/constants.ts`
- Create: `src/services/saju/saju-types.ts`

- [ ] **Step 1: 사주 상수 데이터 작성 (constants.ts)**

`src/data/saju/constants.ts`:

```typescript
/** 오행 타입 */
export type OhaengType = "wood" | "fire" | "earth" | "metal" | "water";

/** 천간 (10개) */
export const CHEONGAN = [
  { name: "갑", hanja: "甲", element: "wood" as OhaengType },
  { name: "을", hanja: "乙", element: "wood" as OhaengType },
  { name: "병", hanja: "丙", element: "fire" as OhaengType },
  { name: "정", hanja: "丁", element: "fire" as OhaengType },
  { name: "무", hanja: "戊", element: "earth" as OhaengType },
  { name: "기", hanja: "己", element: "earth" as OhaengType },
  { name: "경", hanja: "庚", element: "metal" as OhaengType },
  { name: "신", hanja: "辛", element: "metal" as OhaengType },
  { name: "임", hanja: "壬", element: "water" as OhaengType },
  { name: "계", hanja: "癸", element: "water" as OhaengType },
] as const;

/** 지지 (12개) */
export const JIJI = [
  { name: "자", hanja: "子", element: "water" as OhaengType },
  { name: "축", hanja: "丑", element: "earth" as OhaengType },
  { name: "인", hanja: "寅", element: "wood" as OhaengType },
  { name: "묘", hanja: "卯", element: "wood" as OhaengType },
  { name: "진", hanja: "辰", element: "earth" as OhaengType },
  { name: "사", hanja: "巳", element: "fire" as OhaengType },
  { name: "오", hanja: "午", element: "fire" as OhaengType },
  { name: "미", hanja: "未", element: "earth" as OhaengType },
  { name: "신", hanja: "申", element: "metal" as OhaengType },
  { name: "유", hanja: "酉", element: "metal" as OhaengType },
  { name: "술", hanja: "戌", element: "earth" as OhaengType },
  { name: "해", hanja: "亥", element: "water" as OhaengType },
] as const;

/** 오행 한글/한자/색상 매핑 */
export const OHAENG_INFO: Record<OhaengType, { name: string; hanja: string; color: string }> = {
  wood:  { name: "목", hanja: "木", color: "emerald-500" },
  fire:  { name: "화", hanja: "火", color: "red-500" },
  earth: { name: "토", hanja: "土", color: "amber-500" },
  metal: { name: "금", hanja: "金", color: "slate-300" },
  water: { name: "수", hanja: "水", color: "blue-500" },
};

/** 십성 이름 매핑 */
export const TEN_STAR_NAMES: Record<string, string> = {
  "비견": "比肩", "겁재": "劫財",
  "식신": "食神", "상관": "傷官",
  "편재": "偏財", "정재": "正財",
  "편관": "偏官", "정관": "正官",
  "편인": "偏印", "정인": "正印",
};

/** 12운성 이름 */
export const TWELVE_STAGE_NAMES = [
  "장생", "목욕", "관대", "건록", "제왕",
  "쇠", "병", "사", "묘", "절", "태", "양",
] as const;

/** 12시진 → tyme4ts 시간 매핑 */
export const BIRTH_HOUR_TO_TIME: Record<string, number> = {
  ja: 0, chuk: 2, in: 4, myo: 6, jin: 8, sa: 10,
  o: 12, mi: 14, sin: 16, yu: 18, sul: 20, hae: 22,
};

/** 사주 주제 라벨 */
export const SAJU_TOPIC_LABELS: Record<string, string> = {
  love: "연애/관계",
  "love-single": "연애 (솔로)",
  "love-couple": "연애 (커플)",
  finance: "재정/금전",
  career: "직장/진로",
  health: "건강",
  general: "일반 상담",
  "fortune-3y": "종합운세 (3년)",
  "fortune-5y": "종합운세 (5년)",
  "fortune-full": "종합운세 (전체)",
};
```

- [ ] **Step 2: 사주 타입 정의 작성 (saju-types.ts)**

`src/services/saju/saju-types.ts`:

```typescript
import { OhaengType } from "@/data/saju/constants";

/** 사주 계산 입력 */
export interface SajuInput {
  birthDate: string;   // "1990-05-15" (양력)
  birthHour: string;   // "ja" | "chuk" | ... (12시진 코드)
  gender: "male" | "female" | "other";
}

/** 사주 기둥 (주) */
export interface Pillar {
  stem: string;        // 천간 한글 (예: "갑")
  stemHanja: string;   // 천간 한자 (예: "甲")
  branch: string;      // 지지 한글 (예: "자")
  branchHanja: string; // 지지 한자 (예: "子")
  stemElement: OhaengType;
  branchElement: OhaengType;
}

/** 십성 항목 */
export interface TenStarEntry {
  position: string;    // "연간", "월간", "시간", "연지", "월지", "일지", "시지"
  star: string;        // "편관", "정관" 등
  starHanja: string;   // "偏官" 등
}

/** 12운성 항목 */
export interface TwelveStageEntry {
  position: string;    // "연지", "월지", "일지", "시지"
  stage: string;       // "장생", "목욕" 등
}

/** 합/충/형 관계 */
export interface Interactions {
  combinations: string[];  // 합 (예: "사오 합화(火)")
  clashes: string[];       // 충 (예: "자오충")
  punishments: string[];   // 형 (예: "인사형")
}

/** 대운 항목 */
export interface MajorFortune {
  startAge: number;
  endAge: number;
  stem: string;
  stemHanja: string;
  branch: string;
  branchHanja: string;
  element: OhaengType;
}

/** 세운 항목 */
export interface YearlyFortune {
  year: number;
  stem: string;
  stemHanja: string;
  branch: string;
  branchHanja: string;
  element: OhaengType;
}

/** 용신 */
export interface Yongsin {
  element: OhaengType;
  reason: string;
}

/** 사주 계산 전체 결과 */
export interface SajuResult {
  pillars: {
    year: Pillar;
    month: Pillar;
    day: Pillar;
    hour: Pillar;
  };
  dayMaster: string;           // 일간 한글 (예: "갑")
  dayMasterHanja: string;      // 일간 한자 (예: "甲")
  dayMasterElement: OhaengType;
  isStrong: boolean;           // 신강/신약
  elements: Record<OhaengType, number>;
  tenStars: TenStarEntry[];
  twelveStages: TwelveStageEntry[];
  interactions: Interactions;
  yongsin: Yongsin;
  majorFortunes: MajorFortune[];
  yearlyFortune: YearlyFortune;
}

/** 사주 AI 해석 결과 */
export interface SajuReadingResult {
  overallReading: string;
  topicReading: string;
  advice: string;
  shareToken?: string | null;
}
```

- [ ] **Step 3: tsc 확인**

```bash
pnpm tsc --noEmit
```

- [ ] **Step 4: 커밋**

```bash
git add src/data/saju/constants.ts src/services/saju/saju-types.ts
git commit -m "feat: 사주 상수 데이터 + 타입 정의 — 천간/지지/오행/십성 상수, SajuResult 타입"
```

---

### Task 6: 사주 계산 엔진 (saju-calculator.ts)

**Files:**
- Create: `src/services/saju/saju-calculator.ts`

이 태스크는 프로젝트에서 가장 복잡한 비즈니스 로직이다. tyme4ts 라이브러리의 API를 활용하여 사주팔자, 십성, 12운성, 합/충/형, 대운, 세운, 용신을 계산한다.

- [ ] **Step 1: SajuCalculator 클래스 기본 구조 + 팔자 계산**

`src/services/saju/saju-calculator.ts`:

```typescript
import { SolarDay, LunarDay, EightChar, HeavenStem, EarthBranch, SixtyCycle } from "tyme4ts";
import { CHEONGAN, JIJI, OHAENG_INFO, BIRTH_HOUR_TO_TIME, type OhaengType } from "@/data/saju/constants";
import type { SajuInput, SajuResult, Pillar, TenStarEntry, TwelveStageEntry, Interactions, MajorFortune, YearlyFortune, Yongsin } from "./saju-types";

export class SajuCalculator {
  /** 사주 전체 계산 */
  calculate(input: SajuInput): SajuResult {
    const { birthDate, birthHour, gender } = input;
    const [year, month, day] = birthDate.split("-").map(Number);
    const hour = BIRTH_HOUR_TO_TIME[birthHour] ?? 0;

    // tyme4ts로 사주팔자 계산
    const solarDay = SolarDay.fromYmd(year, month, day);
    const lunarDay = solarDay.getLunarDay();
    const eightChar = lunarDay.getEightChar();

    // 시주 계산을 위해 시간 설정
    const solarTime = solarDay.getSolarTime(hour, 0, 0);
    const eightCharWithTime = solarTime.getLunarHour().getEightChar();

    const pillars = this.buildPillars(eightCharWithTime);
    const dayMasterStem = this.findCheongan(pillars.day.stem);
    const elements = this.calcElements(pillars);
    const tenStars = this.calcTenStars(eightCharWithTime, pillars);
    const twelveStages = this.calcTwelveStages(eightCharWithTime, pillars);
    const interactions = this.calcInteractions(pillars);
    const isStrong = this.calcIsStrong(pillars, elements);
    const yongsin = this.calcYongsin(elements, isStrong, dayMasterStem?.element ?? "wood");
    const majorFortunes = this.calcMajorFortunes(eightCharWithTime, gender, year);
    const yearlyFortune = this.calcYearlyFortune();

    return {
      pillars,
      dayMaster: pillars.day.stem,
      dayMasterHanja: pillars.day.stemHanja,
      dayMasterElement: dayMasterStem?.element ?? "wood",
      isStrong,
      elements,
      tenStars,
      twelveStages,
      interactions,
      yongsin,
      majorFortunes,
      yearlyFortune,
    };
  }

  /** tyme4ts EightChar에서 Pillar 구조로 변환 */
  private buildPillars(ec: EightChar): SajuResult["pillars"] {
    const yearCycle = ec.getYear();
    const monthCycle = ec.getMonth();
    const dayCycle = ec.getDay();
    const hourCycle = ec.getTime();

    return {
      year: this.cycleToPillar(yearCycle),
      month: this.cycleToPillar(monthCycle),
      day: this.cycleToPillar(dayCycle),
      hour: this.cycleToPillar(hourCycle),
    };
  }

  private cycleToPillar(cycle: SixtyCycle): Pillar {
    const stem = cycle.getHeavenStem();
    const branch = cycle.getEarthBranch();
    const stemInfo = this.findCheongan(stem.getName());
    const branchInfo = this.findJiji(branch.getName());

    return {
      stem: stemInfo?.name ?? stem.getName(),
      stemHanja: stemInfo?.hanja ?? "",
      branch: branchInfo?.name ?? branch.getName(),
      branchHanja: branchInfo?.hanja ?? "",
      stemElement: stemInfo?.element ?? "wood",
      branchElement: branchInfo?.element ?? "earth",
    };
  }

  /** 오행 분포 계산 (천간 4 + 지지 4 = 8자) */
  private calcElements(pillars: SajuResult["pillars"]): Record<OhaengType, number> {
    const counts: Record<OhaengType, number> = { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 };
    for (const p of [pillars.year, pillars.month, pillars.day, pillars.hour]) {
      counts[p.stemElement]++;
      counts[p.branchElement]++;
    }
    return counts;
  }

  /** 십성 계산 (일간 기준 나머지 7자와의 관계) */
  private calcTenStars(ec: EightChar, pillars: SajuResult["pillars"]): TenStarEntry[] {
    const positions = [
      { label: "연간", cycle: ec.getYear() },
      { label: "월간", cycle: ec.getMonth() },
      { label: "시간", cycle: ec.getTime() },
    ];
    const dayMaster = ec.getDay().getHeavenStem();
    const stars: TenStarEntry[] = [];

    for (const pos of positions) {
      const tenStar = dayMaster.getTenStar(pos.cycle.getHeavenStem());
      stars.push({
        position: pos.label,
        star: tenStar.getName(),
        starHanja: this.tenStarToHanja(tenStar.getName()),
      });
    }
    return stars;
  }

  /** 12운성 계산 (일간 기준 각 지지의 에너지 단계) */
  private calcTwelveStages(ec: EightChar, pillars: SajuResult["pillars"]): TwelveStageEntry[] {
    const dayMaster = ec.getDay().getHeavenStem();
    const branches = [
      { label: "연지", cycle: ec.getYear() },
      { label: "월지", cycle: ec.getMonth() },
      { label: "일지", cycle: ec.getDay() },
      { label: "시지", cycle: ec.getTime() },
    ];
    return branches.map((b) => ({
      position: b.label,
      stage: dayMaster.getTerrain(b.cycle.getEarthBranch()).getName(),
    }));
  }

  /** 합/충/형 관계 분석 */
  private calcInteractions(pillars: SajuResult["pillars"]): Interactions {
    const branches = [
      { name: pillars.year.branch, hanja: pillars.year.branchHanja },
      { name: pillars.month.branch, hanja: pillars.month.branchHanja },
      { name: pillars.day.branch, hanja: pillars.day.branchHanja },
      { name: pillars.hour.branch, hanja: pillars.hour.branchHanja },
    ];

    const combinations: string[] = [];
    const clashes: string[] = [];
    const punishments: string[] = [];

    // 육합 (지지 간 1:1 합)
    const YUKHAP: [string, string, OhaengType][] = [
      ["자", "축", "earth"], ["인", "해", "wood"], ["묘", "술", "fire"],
      ["진", "유", "metal"], ["사", "신", "water"], ["오", "미", "fire"],
    ];
    // 육충 (지지 간 충돌)
    const YUKCHUNG: [string, string][] = [
      ["자", "오"], ["축", "미"], ["인", "신"],
      ["묘", "유"], ["진", "술"], ["사", "해"],
    ];
    // 삼형 (지지 간 형벌)
    const SAMHYUNG: [string, string][] = [
      ["인", "사"], ["사", "신"], ["인", "신"],
      ["축", "술"], ["술", "미"], ["축", "미"],
      ["자", "묘"],
    ];

    for (let i = 0; i < branches.length; i++) {
      for (let j = i + 1; j < branches.length; j++) {
        const a = branches[i].name;
        const b = branches[j].name;

        for (const [x, y, elem] of YUKHAP) {
          if ((a === x && b === y) || (a === y && b === x)) {
            const elemInfo = OHAENG_INFO[elem];
            combinations.push(`${branches[i].hanja}${branches[j].hanja} 합${elemInfo.hanja}(${elemInfo.name})`);
          }
        }
        for (const [x, y] of YUKCHUNG) {
          if ((a === x && b === y) || (a === y && b === x)) {
            clashes.push(`${branches[i].hanja}${branches[j].hanja}충`);
          }
        }
        for (const [x, y] of SAMHYUNG) {
          if ((a === x && b === y) || (a === y && b === x)) {
            punishments.push(`${branches[i].hanja}${branches[j].hanja}형`);
          }
        }
      }
    }

    return { combinations, clashes, punishments };
  }

  /** 신강/신약 판별 (일간의 세력 판단) */
  private calcIsStrong(pillars: SajuResult["pillars"], elements: Record<OhaengType, number>): boolean {
    const dayElement = pillars.day.stemElement;
    // 일간과 같은 오행 + 일간을 생하는 오행의 합이 4 이상이면 신강
    const GENERATING: Record<OhaengType, OhaengType> = {
      wood: "water", fire: "wood", earth: "fire", metal: "earth", water: "metal",
    };
    const selfCount = elements[dayElement];
    const supportCount = elements[GENERATING[dayElement]];
    return (selfCount + supportCount) >= 4;
  }

  /** 용신 계산 (균형에 필요한 오행) */
  private calcYongsin(elements: Record<OhaengType, number>, isStrong: boolean, dayElement: OhaengType): Yongsin {
    const CONTROLLING: Record<OhaengType, OhaengType> = {
      wood: "metal", fire: "water", earth: "wood", metal: "fire", water: "earth",
    };
    const GENERATING: Record<OhaengType, OhaengType> = {
      wood: "water", fire: "wood", earth: "fire", metal: "earth", water: "metal",
    };

    if (isStrong) {
      // 신강: 일간을 극하는 오행이 용신
      const yongElement = CONTROLLING[dayElement];
      return {
        element: yongElement,
        reason: `일간 ${OHAENG_INFO[dayElement].hanja}(${OHAENG_INFO[dayElement].name})이 강하여 ${OHAENG_INFO[yongElement].hanja}(${OHAENG_INFO[yongElement].name})으로 균형 필요`,
      };
    } else {
      // 신약: 일간을 생하는 오행이 용신
      const yongElement = GENERATING[dayElement];
      return {
        element: yongElement,
        reason: `일간 ${OHAENG_INFO[dayElement].hanja}(${OHAENG_INFO[dayElement].name})이 약하여 ${OHAENG_INFO[yongElement].hanja}(${OHAENG_INFO[yongElement].name})의 도움 필요`,
      };
    }
  }

  /** 대운 계산 (10년 단위, 8개) */
  private calcMajorFortunes(ec: EightChar, gender: string, birthYear: number): MajorFortune[] {
    const isMale = gender === "male";
    const childLimit = ec.getChildLimit(isMale ? 1 : 0);
    const startAge = childLimit.getYearCount() + 1;
    const fortunes: MajorFortune[] = [];

    const decadeFortunes = childLimit.getDecadeFortunes();
    for (let i = 0; i < Math.min(decadeFortunes.length, 8); i++) {
      const df = decadeFortunes[i];
      const cycle = df.getSixtyCycle();
      const stem = cycle.getHeavenStem();
      const branch = cycle.getEarthBranch();
      const stemInfo = this.findCheongan(stem.getName());
      const branchInfo = this.findJiji(branch.getName());

      fortunes.push({
        startAge: startAge + i * 10,
        endAge: startAge + (i + 1) * 10 - 1,
        stem: stemInfo?.name ?? stem.getName(),
        stemHanja: stemInfo?.hanja ?? "",
        branch: branchInfo?.name ?? branch.getName(),
        branchHanja: branchInfo?.hanja ?? "",
        element: stemInfo?.element ?? "wood",
      });
    }
    return fortunes;
  }

  /** 세운 계산 (올해) */
  private calcYearlyFortune(): YearlyFortune {
    const currentYear = new Date().getFullYear();
    const solarDay = SolarDay.fromYmd(currentYear, 1, 1);
    const lunarDay = solarDay.getLunarDay();
    const yearCycle = lunarDay.getYear().getSixtyCycle();
    const stem = yearCycle.getHeavenStem();
    const branch = yearCycle.getEarthBranch();
    const stemInfo = this.findCheongan(stem.getName());
    const branchInfo = this.findJiji(branch.getName());

    return {
      year: currentYear,
      stem: stemInfo?.name ?? stem.getName(),
      stemHanja: stemInfo?.hanja ?? "",
      branch: branchInfo?.name ?? branch.getName(),
      branchHanja: branchInfo?.hanja ?? "",
      element: stemInfo?.element ?? "wood",
    };
  }

  // --- 유틸 ---

  private findCheongan(name: string) {
    return CHEONGAN.find((c) => c.name === name || c.hanja === name);
  }

  private findJiji(name: string) {
    return JIJI.find((j) => j.name === name || j.hanja === name);
  }

  private tenStarToHanja(name: string): string {
    const map: Record<string, string> = {
      "비견": "比肩", "겁재": "劫財", "식신": "食神", "상관": "傷官",
      "편재": "偏財", "정재": "正財", "편관": "偏官", "정관": "正官",
      "편인": "偏印", "정인": "正印",
    };
    return map[name] ?? name;
  }
}
```

- [ ] **Step 2: 기본 동작 검증**

```bash
pnpm tsc --noEmit
```

- [ ] **Step 3: 커밋**

```bash
git add src/services/saju/saju-calculator.ts
git commit -m "feat: 사주 계산 엔진 — tyme4ts 기반 팔자/십성/12운성/합충형/대운/세운/용신 계산"
```

---

### Task 7: SajuService (DivinationService 구현) + 프롬프트 빌더

**Files:**
- Create: `src/services/saju/saju-service.ts`
- Modify: `src/services/core/prompt-builder.ts`

- [ ] **Step 1: SajuService 클래스 작성**

`src/services/saju/saju-service.ts`:

```typescript
import { DivinationService } from "@/types/service";
import { CharacterConfig } from "@/types/character";
import { Topic, Session } from "@/types/session";
import { SessionContext, ReadingResult } from "@/types/service";
import { getCharacterById, getCharactersByService } from "@/data/characters";
import { SajuCalculator } from "./saju-calculator";
import { buildSajuSystemPrompt, buildSajuReadingPrompt } from "@/services/core/prompt-builder";
import type { SajuInput, SajuResult, SajuReadingResult } from "./saju-types";

const sajuCalculator = new SajuCalculator();

export class SajuService implements DivinationService {
  id = "saju";
  name = "사주";

  getCharacter(): CharacterConfig {
    const chars = getCharactersByService("saju");
    return chars[0] ?? getCharacterById("seonhwa")!;
  }

  startSession(topic: Topic): Omit<Session, "id" | "createdAt"> {
    return {
      userId: null,
      serviceType: "saju",
      topic,
      status: "in_progress",
      spreadType: null,
      selectedCards: [],
      completedAt: null,
    };
  }

  getSystemPrompt(characterId?: string): string {
    const character = characterId ? getCharacterById(characterId) : this.getCharacter();
    return buildSajuSystemPrompt(character!);
  }

  getReadingPrompt(context: SessionContext): string {
    return "";
  }

  /** 사주 전용 프롬프트 (계산 결과 포함) */
  getSajuReadingPrompt(sajuResult: SajuResult, topic: Topic, userName?: string): string {
    return buildSajuReadingPrompt(sajuResult, topic, userName);
  }

  /** 사주 계산 실행 */
  calculateSaju(input: SajuInput): SajuResult {
    return sajuCalculator.calculate(input);
  }

  parseResult(aiResponse: string): ReadingResult {
    return this.parseSajuResult(aiResponse);
  }

  /** 사주 AI 응답 파싱 */
  parseSajuResult(aiResponse: string): SajuReadingResult {
    let jsonStr = aiResponse.trim();
    const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) jsonStr = codeBlockMatch[1].trim();

    try {
      const parsed = JSON.parse(jsonStr);
      return {
        overallReading: this.cleanText(parsed.overallReading || ""),
        topicReading: this.cleanText(parsed.topicReading || ""),
        advice: this.cleanText(parsed.advice || ""),
      };
    } catch {
      return {
        overallReading: jsonStr || "사주 해석 중 문제가 발생했습니다.",
        topicReading: "",
        advice: "",
      };
    }
  }

  private cleanText(text: string): string {
    return text.replace(/\\n/g, "\n").replace(/\\"/g, '"').replace(/\n{3,}/g, "\n\n").trim();
  }
}
```

- [ ] **Step 2: 사주 프롬프트 빌더 함수 추가 (prompt-builder.ts)**

`src/services/core/prompt-builder.ts` 파일 하단에 추가:

```typescript
import type { SajuResult } from "@/services/saju/saju-types";
import { OHAENG_INFO, SAJU_TOPIC_LABELS } from "@/data/saju/constants";

export function buildSajuSystemPrompt(character: CharacterConfig): string {
  return `당신은 "${character.name}" (${character.nameJp}), 사주명리학 전문 상담사입니다.

성격: ${character.personality}
말투: ${character.speechStyle}

역할:
- 제공된 사주 분석 데이터를 바탕으로 따뜻하고 전문적인 해석을 제공합니다
- 전문 용어(천간, 지지, 오행, 십성 등)는 반드시 쉽게 풀어서 설명합니다
- 부정적인 내용도 긍정적 방향과 대처법을 함께 제시합니다
- 캐릭터의 말투와 성격을 일관되게 유지합니다

응답 규칙:
- 종합 해석(overallReading): 400-600자, 사주팔자 전체 흐름 해석
- 주제별 해석(topicReading): 300-500자, 요청된 주제에 대한 상세 분석
- 조언(advice): 200-300자, 용신 활용법 포함 실질적 조언
- 각 섹션은 \\n\\n으로 문단을 구분합니다

반드시 아래 JSON 형식으로만 응답하세요. 다른 텍스트는 포함하지 마세요:
{"overallReading": "...", "topicReading": "...", "advice": "..."}`;
}

export function buildSajuReadingPrompt(sajuResult: SajuResult, topic: Topic, userName?: string): string {
  const { pillars, dayMaster, dayMasterHanja, dayMasterElement, isStrong, elements, tenStars, twelveStages, interactions, yongsin, majorFortunes, yearlyFortune } = sajuResult;
  const elementInfo = OHAENG_INFO[dayMasterElement];
  const topicLabel = SAJU_TOPIC_LABELS[topic] ?? topic;

  let prompt = `[사주 분석 데이터]
${userName ? `이름: ${userName}\n` : ""}
[사주팔자]
연주: ${pillars.year.stemHanja}${pillars.year.branchHanja}(${pillars.year.stem}${pillars.year.branch})
월주: ${pillars.month.stemHanja}${pillars.month.branchHanja}(${pillars.month.stem}${pillars.month.branch})
일주: ${pillars.day.stemHanja}${pillars.day.branchHanja}(${pillars.day.stem}${pillars.day.branch})
시주: ${pillars.hour.stemHanja}${pillars.hour.branchHanja}(${pillars.hour.stem}${pillars.hour.branch})

일간: ${dayMasterHanja}(${dayMaster}) — ${elementInfo.hanja}(${elementInfo.name}) — ${isStrong ? "신강" : "신약"}

[오행 분포]
木: ${elements.wood} | 火: ${elements.fire} | 土: ${elements.earth} | 金: ${elements.metal} | 水: ${elements.water}`;

  if (tenStars.length > 0) {
    prompt += `\n\n[십성]\n${tenStars.map((ts) => `${ts.position}: ${ts.starHanja}(${ts.star})`).join(" | ")}`;
  }

  if (twelveStages.length > 0) {
    prompt += `\n\n[12운성]\n${twelveStages.map((ts) => `${ts.position}: ${ts.stage}`).join(" | ")}`;
  }

  if (interactions.combinations.length > 0 || interactions.clashes.length > 0 || interactions.punishments.length > 0) {
    prompt += "\n\n[합/충/형]";
    if (interactions.combinations.length > 0) prompt += `\n합: ${interactions.combinations.join(", ")}`;
    if (interactions.clashes.length > 0) prompt += `\n충: ${interactions.clashes.join(", ")}`;
    if (interactions.punishments.length > 0) prompt += `\n형: ${interactions.punishments.join(", ")}`;
  }

  const yongsinInfo = OHAENG_INFO[yongsin.element];
  prompt += `\n\n[용신]\n${yongsinInfo.hanja}(${yongsinInfo.name}) — ${yongsin.reason}`;

  if (majorFortunes.length > 0) {
    prompt += `\n\n[대운]\n${majorFortunes.map((mf) => `${mf.startAge}~${mf.endAge}세: ${mf.stemHanja}${mf.branchHanja}(${mf.stem}${mf.branch}) ${OHAENG_INFO[mf.element].hanja}`).join("\n")}`;
  }

  prompt += `\n\n[세운 — ${yearlyFortune.year}년]\n${yearlyFortune.stemHanja}${yearlyFortune.branchHanja}(${yearlyFortune.stem}${yearlyFortune.branch}) ${OHAENG_INFO[yearlyFortune.element].hanja}`;

  // 주제별 분석 지시
  prompt += `\n\n[상담 주제: ${topicLabel}]`;
  if (topic === "fortune-3y") {
    prompt += `\n향후 3년(${yearlyFortune.year}~${yearlyFortune.year + 2})의 운세 흐름을 세운 기준으로 상세 분석해주세요. 각 연도별 주요 변화와 주의점을 알려주세요.`;
  } else if (topic === "fortune-5y") {
    prompt += `\n향후 5년(${yearlyFortune.year}~${yearlyFortune.year + 4})의 중기 흐름과 전환점을 분석해주세요. 대운 전환이 포함되면 그 영향도 설명해주세요.`;
  } else if (topic === "fortune-full") {
    prompt += `\n전체 대운 흐름을 기반으로 인생 로드맵을 제시해주세요. 각 대운 시기의 특징과 유년/청년/중년/노년 단계별 조언을 포함해주세요.`;
  } else {
    prompt += `\n위 사주 데이터를 바탕으로 ${topicLabel}에 대해 상세히 해석해주세요.`;
  }

  return prompt;
}
```

- [ ] **Step 3: tsc 확인**

```bash
pnpm tsc --noEmit
```

- [ ] **Step 4: 커밋**

```bash
git add src/services/saju/saju-service.ts src/services/core/prompt-builder.ts
git commit -m "feat: SajuService 구현 + 사주 프롬프트 빌더 — DivinationService 패턴 준수"
```

---

## Phase 3: API

### Task 8: 사주 SSE 스트리밍 API + 결과 조회 API

**Files:**
- Create: `src/app/api/saju/reading/route.ts`
- Create: `src/app/api/saju/result/[id]/route.ts`

- [ ] **Step 1: 사주 리딩 SSE API 작성**

`src/app/api/saju/reading/route.ts`:

타로 reading API (`src/app/api/tarot/reading/route.ts`)와 동일한 SSE 패턴을 따르되, 카드 대신 사주 계산 결과를 사용한다.

```typescript
import { NextRequest } from "next/server";
import { SajuService } from "@/services/saju/saju-service";
import { GrokProvider } from "@/services/core/grok-provider";
import { Topic } from "@/types/session";
import type { SajuInput } from "@/services/saju/saju-types";

const sajuService = new SajuService();
const grokProvider = new GrokProvider();

const VALID_TOPICS = [
  "love", "love-single", "love-couple", "finance", "career", "health", "general",
  "fortune-3y", "fortune-5y", "fortune-full",
];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, topic, characterId, userInfo } = body as {
      sessionId?: string | null;
      topic: Topic;
      characterId?: string;
      userInfo: { name?: string; birthDate: string; birthHour: string; gender: string };
    };

    // 입력 검증
    if (!topic || !userInfo?.birthDate || !userInfo?.birthHour || !userInfo?.gender) {
      return new Response(JSON.stringify({ error: "생년월일, 출생시간, 성별은 필수입니다" }), {
        status: 400, headers: { "Content-Type": "application/json" },
      });
    }
    if (!VALID_TOPICS.includes(topic)) {
      return new Response(JSON.stringify({ error: "Invalid topic" }), {
        status: 400, headers: { "Content-Type": "application/json" },
      });
    }

    // 사주 계산 (서버 사이드)
    const sajuInput: SajuInput = {
      birthDate: userInfo.birthDate,
      birthHour: userInfo.birthHour,
      gender: userInfo.gender as "male" | "female" | "other",
    };
    const sajuResult = sajuService.calculateSaju(sajuInput);

    // 프롬프트 구성
    const systemPrompt = sajuService.getSystemPrompt(characterId);
    const readingPrompt = sajuService.getSajuReadingPrompt(sajuResult, topic, userInfo.name);

    // Supabase 클라이언트 (스트림 시작 전 생성)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let supabase: any = null;
    if (sessionId) {
      try {
        const { createClient } = await import("@/lib/supabase/server");
        supabase = await createClient();
      } catch (e) {
        console.warn("Supabase 클라이언트 생성 실패:", e);
      }
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        let fullResponse = "";
        try {
          for await (const chunk of grokProvider.streamReading(systemPrompt, readingPrompt)) {
            fullResponse += chunk;
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ chunk })}\n\n`));
          }

          const result = sajuService.parseSajuResult(fullResponse);

          // DB 저장
          let shareToken: string | null = null;
          let dbSaved = false;
          if (supabase && sessionId) {
            try {
              const [sajuRes, sessionRes] = await Promise.all([
                supabase.from("saju_readings").insert({
                  session_id: sessionId,
                  birth_date: userInfo.birthDate,
                  birth_hour: userInfo.birthHour,
                  gender: userInfo.gender,
                  birth_name: userInfo.name || null,
                  pillars: sajuResult.pillars,
                  day_master: sajuResult.dayMaster,
                  day_master_element: sajuResult.dayMasterElement,
                  is_strong: sajuResult.isStrong,
                  elements: sajuResult.elements,
                  ten_stars: sajuResult.tenStars,
                  twelve_stages: sajuResult.twelveStages,
                  interactions: sajuResult.interactions,
                  yongsin: sajuResult.yongsin,
                  major_fortunes: sajuResult.majorFortunes,
                  yearly_fortune: sajuResult.yearlyFortune,
                  overall_reading: result.overallReading,
                  topic_reading: result.topicReading,
                  advice: result.advice,
                }).select("share_token").single(),
                supabase.from("sessions").update({
                  status: "completed", completed_at: new Date().toISOString(),
                }).eq("id", sessionId),
              ]);

              if (sessionRes.error) console.error("sessions 업데이트 실패:", sessionRes.error.message);
              if (sajuRes.error) {
                console.error("saju_readings 저장 실패:", sajuRes.error.message);
              } else {
                shareToken = sajuRes.data?.share_token ?? null;
                dbSaved = true;
              }
            } catch (dbError) {
              console.error("DB 저장 실패:", dbError);
            }
          }

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            done: true,
            result: { ...result, shareToken },
            sajuData: sajuResult,
            dbSaved,
          })}\n\n`));
        } catch (e) {
          const errMsg = e instanceof Error ? e.message : String(e);
          console.error("사주 리딩 실패:", errMsg);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: errMsg })}\n\n`));
        }
        controller.close();
      },
    });

    return new Response(stream, {
      headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
    });
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : String(e);
    console.error("사주 API 오류:", errMsg);
    return new Response(JSON.stringify({ error: errMsg }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }
}
```

- [ ] **Step 2: 사주 결과 조회 API 작성**

`src/app/api/saju/result/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: reading, error } = await supabase
      .from("saju_readings")
      .select("*, sessions(*)")
      .eq("share_token", id)
      .single();
    if (error || !reading) return NextResponse.json({ error: "Reading not found" }, { status: 404 });
    return NextResponse.json({ reading });
  } catch {
    return NextResponse.json({ error: "Failed to fetch reading" }, { status: 500 });
  }
}
```

- [ ] **Step 3: tsc + lint 확인**

```bash
pnpm tsc --noEmit && pnpm lint
```

- [ ] **Step 4: 커밋**

```bash
git add src/app/api/saju/
git commit -m "feat: 사주 API — SSE 스트리밍 리딩 + 결과 조회 엔드포인트"
```

---

## Phase 4: UI 컴포넌트

### Task 9: 사주 세션 스토어 (useSajuSession)

**Files:**
- Create: `src/hooks/useSajuSession.ts`

- [ ] **Step 1: Zustand 스토어 작성**

`src/hooks/useSajuSession.ts`:

```typescript
import { create } from "zustand";
import { Topic } from "@/types/session";
import { ChatMessage } from "@/types/session";
import type { SajuResult, SajuReadingResult } from "@/services/saju/saju-types";

export interface SajuUserInfo {
  name: string;
  birthDate: string;
  birthHour: string;
  gender: "male" | "female" | "other";
}

type SajuPhase = "info-input" | "topic-select" | "reading" | "result";

interface SajuSessionState {
  phase: SajuPhase;
  sessionId: string | null;
  characterId: string | null;
  topic: Topic | null;
  userInfo: SajuUserInfo | null;
  chatMessages: ChatMessage[];
  sajuResult: SajuResult | null;
  readingResult: SajuReadingResult | null;
  isLoading: boolean;

  setPhase: (phase: SajuPhase) => void;
  setSessionId: (id: string) => void;
  setCharacterId: (id: string) => void;
  setTopic: (topic: Topic) => void;
  setUserInfo: (info: SajuUserInfo) => void;
  addChatMessage: (message: ChatMessage) => void;
  setSajuResult: (result: SajuResult) => void;
  setReadingResult: (result: SajuReadingResult) => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
}

const initialState = {
  phase: "info-input" as SajuPhase,
  sessionId: null,
  characterId: null,
  topic: null,
  userInfo: null,
  chatMessages: [],
  sajuResult: null,
  readingResult: null,
  isLoading: false,
};

export const useSajuSessionStore = create<SajuSessionState>((set) => ({
  ...initialState,
  setPhase: (phase) => set({ phase }),
  setSessionId: (sessionId) => set({ sessionId }),
  setCharacterId: (characterId) => set({ characterId }),
  setTopic: (topic) => set({ topic }),
  setUserInfo: (userInfo) => set({ userInfo }),
  addChatMessage: (message) => set((state) => ({ chatMessages: [...state.chatMessages, message] })),
  setSajuResult: (sajuResult) => set({ sajuResult }),
  setReadingResult: (readingResult) => set({ readingResult }),
  setLoading: (isLoading) => set({ isLoading }),
  reset: () => set(initialState),
}));
```

- [ ] **Step 2: tsc 확인 + 커밋**

```bash
pnpm tsc --noEmit
git add src/hooks/useSajuSession.ts
git commit -m "feat: 사주 세션 스토어 — useSajuSessionStore (info-input → topic → reading → result)"
```

---

### Task 10: 사주 UI 컴포넌트 (SajuChart, OhaengGraph, DaeunTimeline, SajuInfoForm)

**Files:**
- Create: `src/components/saju/SajuChart.tsx`
- Create: `src/components/saju/OhaengGraph.tsx`
- Create: `src/components/saju/DaeunTimeline.tsx`
- Create: `src/components/saju/SajuInfoForm.tsx`

이 태스크의 각 컴포넌트는 독립적이므로 병렬 구현 가능. 코드가 길어 별도 서브태스크로 분리하여 구현 시 하나씩 작성한다.

주요 설계 원칙:
- Tailwind v4 + Framer Motion 사용
- 다크 모드 기본 (arcana-* 커스텀 컬러)
- 모바일/데스크탑 반응형
- 오행 색상: wood=emerald-500, fire=red-500, earth=amber-500, metal=slate-300, water=blue-500

구현 시 각 컴포넌트의 Props 인터페이스:

```typescript
// SajuChart: 사주팔자 4주 테이블
interface SajuChartProps { pillars: SajuResult["pillars"]; dayMaster: string; dayMasterElement: OhaengType; isStrong: boolean; yongsin: Yongsin; }

// OhaengGraph: 오행 분포 가로 막대 그래프
interface OhaengGraphProps { elements: Record<OhaengType, number>; dayMasterElement: OhaengType; }

// DaeunTimeline: 대운/세운 타임라인
interface DaeunTimelineProps { majorFortunes: MajorFortune[]; yearlyFortune: YearlyFortune; birthYear: number; topic: Topic; }

// SajuInfoForm: 생년월일/시간 필수 입력 폼
interface SajuInfoFormProps { onSubmit: (info: SajuUserInfo) => void; }
```

- [ ] **Step 1: 4개 컴포넌트 순차 작성 + tsc 확인**
- [ ] **Step 2: 커밋**

```bash
git add src/components/saju/
git commit -m "feat: 사주 UI 컴포넌트 — SajuChart, OhaengGraph, DaeunTimeline, SajuInfoForm"
```

---

## Phase 5: 페이지 조립

### Task 11: 사주 진입 페이지 (`/saju`)

**Files:**
- Create: `src/app/saju/page.tsx`

타로 페이지(`src/app/tarot/page.tsx`)와 동일한 구조를 따르되, 스프레드 선택 대신 생년월일 입력이 필수인 흐름.

PageStep: `"character-select" | "character-detail" | "info-input" | "topic-select"`

- [ ] **Step 1: 페이지 작성**
- [ ] **Step 2: tsc + build 확인 + 커밋**

```bash
git add src/app/saju/page.tsx
git commit -m "feat: 사주 진입 페이지 — 캐릭터 선택 → 생년월일 입력 → 주제 선택"
```

---

### Task 12: 사주 세션 페이지 (`/saju/session`)

**Files:**
- Create: `src/app/saju/session/page.tsx`

타로 세션 페이지와 유사하되, 카드 선택 없이 바로 AI 해석 진행.
사주팔자 계산 결과를 시각적으로 표시하면서 대기 연출.

- [ ] **Step 1: 페이지 작성**
- [ ] **Step 2: tsc + build 확인 + 커밋**

```bash
git add src/app/saju/session/page.tsx
git commit -m "feat: 사주 세션 페이지 — AI 해석 진행 + 캐릭터 대기 연출"
```

---

### Task 13: 사주 결과 페이지 (`/saju/result/[id]`)

**Files:**
- Create: `src/app/saju/result/[id]/page.tsx`
- Create: `src/app/saju/result/[id]/ResultShareButton.tsx`

차트 중심형 레이아웃: SajuChart → OhaengGraph → 종합해석 → 주제별해석 → DaeunTimeline → 세운 → 조언

- [ ] **Step 1: 결과 페이지 + 공유 버튼 작성**
- [ ] **Step 2: tsc + build 확인 + 커밋**

```bash
git add src/app/saju/result/
git commit -m "feat: 사주 결과 페이지 — 차트 중심형 레이아웃 + 공유 기능"
```

---

## Phase 6: 통합

### Task 14: 네비게이션 + CharacterGallery 수정

**Files:**
- Modify: `src/components/layout/Header.tsx`
- Modify: `src/components/layout/MobileNav.tsx`
- Modify: `src/components/home/CharacterGallery.tsx`

- [ ] **Step 1: Header에 사주 상담 링크 추가**

```typescript
<Link href="/saju" className="text-arcana-muted hover:text-arcana-text transition-colors font-sans text-sm">
  사주 상담
</Link>
```

타로 상담 링크 다음에 추가.

- [ ] **Step 2: MobileNav에 사주 탭 추가**

```typescript
const navItems: NavItem[] = [
  { href: "/", label: "홈", icon: "🏠" },
  { href: "/tarot", label: "타로", icon: "🃏" },
  { href: "/saju", label: "사주", icon: "☯" },
  { href: "/#daily-card", label: "운세", icon: "⭐" },
  { href: "/mypage", label: "MY", icon: "👤" },
];
```

- [ ] **Step 3: CharacterGallery 동적 라우팅**

```typescript
const getServiceUrl = (char: CharacterConfig) => {
  const serviceRoutes: Record<string, string> = {
    tarot: "/tarot",
    saju: "/saju",
    shinjeom: "/shinjeom",
    fortune: "/fortune",
  };
  const basePath = serviceRoutes[char.serviceType] ?? "/tarot";
  return `${basePath}?character=${char.id}`;
};
```

기존 `href={`/tarot?character=${char.id}`}`를 `href={getServiceUrl(char)}`로 변경.

- [ ] **Step 4: tsc + build 확인 + 커밋**

```bash
git add src/components/layout/Header.tsx src/components/layout/MobileNav.tsx src/components/home/CharacterGallery.tsx
git commit -m "feat: 네비게이션 + CharacterGallery 사주 서비스 연동"
```

---

### Task 15: 마이페이지 사주 히스토리 통합

**Files:**
- Modify: `src/app/mypage/page.tsx`

- [ ] **Step 1: 마이페이지에 사주 히스토리 통합**

기존 타로 세션 목록에 사주 세션도 함께 표시:
- `service_type === "saju"`인 세션은 `saju_readings` 테이블에서 join
- 서비스 태그 색상: TAROT(보라) / SAJU(분홍)
- 사주 결과 클릭 시 `/saju/result/[share_token]`으로 이동

`normalizeReading` 함수를 사주에도 적용 (saju_readings도 1:1 관계).

- [ ] **Step 2: tsc + build 확인 + 커밋**

```bash
git add src/app/mypage/page.tsx
git commit -m "feat: 마이페이지 사주 히스토리 통합 — 타로/사주 시간순 통합 표시"
```

---

### Task 16: 최종 검증 + 정리

- [ ] **Step 1: 전체 tsc + lint + build 검증 (10회 변칙)**

CLAUDE.md 규칙에 따라 5회 이상, 사용자 요청에 따라 10회 변칙 검증.

- [ ] **Step 2: Playwright로 전체 플로우 E2E 테스트**

캐릭터 선택 → 생년월일 입력 → 주제 선택 → 세션 → 결과 확인

- [ ] **Step 3: 최종 커밋 + PR 생성**

```bash
git push -u origin feature/saju-service
gh pr create --base main --title "feat: 사주 서비스 추가"
```
