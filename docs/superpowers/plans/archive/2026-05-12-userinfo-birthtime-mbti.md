# UserInfo 출생 시각 정밀 입력 + MBTI 선택 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** `UserInfo`의 출생 시 입력을 12시진 드롭다운에서 HH:MM 직접 입력으로 교체하고, "시간 모름" 체크박스 + 선택적 MBTI 입력을 전체 서비스(타로·사주)에 추가한다.

**Architecture:** Clean Break 전략 — `birthHour` 필드를 `birthTime: string | null`("HH:MM" 또는 null)로 교체. DB 마이그레이션으로 기존 시진 값을 null 처리. `timeToSijin()` 유틸이 HH:MM → 시진 변환을 담당하며 사주 계산기와 AI 프롬프트 양쪽에서 사용.

**Tech Stack:** TypeScript strict, Next.js App Router, Zod, Supabase, tyme4ts, React, Tailwind CSS v4

**Spec:** `docs/superpowers/specs/2026-05-12-userinfo-birthtime-mbti-design.md`

---

## 파일 맵

| 상태 | 파일 | 역할 |
|------|------|------|
| 신규 | `src/lib/time-utils.ts` | `timeToSijin("HH:MM")` → Sijin 객체 |
| 신규 | `src/lib/time-utils.test.ts` | timeToSijin 단위 테스트 |
| 신규 | `src/data/mbti.ts` | MBTI 16타입 상수 |
| 신규 | `supabase/migrations/018_birthtime_mbti.sql` | birth_hour null 처리 + mbti 컬럼 추가 |
| 수정 | `src/types/user-info.ts` | `birthHour` → `birthTime`, `mbti` 추가 |
| 수정 | `src/services/saju/saju-types.ts` | `SajuInput.birthHour` → `birthTime`, `mbti` 추가 |
| 수정 | `src/lib/validation/api-schemas.ts` | `birthHour` → `birthTime` (regex), `mbti` 추가 |
| 수정 | `src/services/saju/saju-calculator.ts` | BIRTH_HOUR_MAP 제거, HH:MM 직접 파싱 |
| 수정 | `src/services/saju/saju-calculator.test.ts` | 픽스처 `birthHour` → `birthTime` |
| 수정 | `src/services/core/prompt-builder.ts` | `buildUserInfoPrompt` 시각 포맷 + MBTI |
| 수정 | `src/services/core/prompt-builder.test.ts` | 테스트 픽스처 + 신규 케이스 |
| 수정 | `src/services/saju/saju-service.ts` | `buildSajuPrompt` null birthTime 처리 + MBTI |
| 수정 | `src/components/common/UserInfoForm.tsx` | 전체 UI 교체 (시·분 입력 + 체크박스 + MBTI) |
| 수정 | `src/app/api/saju/reading/route.ts` | `birthTime` 전달, DB 저장 |
| 수정 | `src/app/api/tarot/reading/route.ts` | `birthTime` / `mbti` 전달 |
| 수정 | `src/app/saju/result/[id]/page.tsx` | `birth_hour` 타입 `string \| null` |
| 수정 | `src/__tests__/api/saju-reading.test.ts` | `birthHour` → `birthTime` 픽스처 |
| 수정 | `src/__tests__/api/tarot-reading.test.ts` | `birthHour` → `birthTime` 픽스처 |
| 수정 | `sonar-project.properties` | exclusions 동기화 |

---

## Task 1: `src/lib/time-utils.ts` — timeToSijin 유틸 (TDD)

**Files:**
- Create: `src/lib/time-utils.ts`
- Create: `src/lib/time-utils.test.ts`

- [x] **Step 1: 테스트 파일 작성**

`src/lib/time-utils.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { timeToSijin } from "./time-utils";

describe("timeToSijin", () => {
  it("null 입력 → null", () => expect(timeToSijin(null)).toBeNull());
  it("빈 문자열 → null", () => expect(timeToSijin("")).toBeNull());
  it("형식 불일치 → null", () => expect(timeToSijin("14:3")).toBeNull());
  it("형식 불일치 → null", () => expect(timeToSijin("abc")).toBeNull());

  it("00:00 → 자시(子時)", () => expect(timeToSijin("00:00")).toEqual({ key: "ja", label: "자시", hanja: "子時" }));
  it("00:59 → 자시(子時)", () => expect(timeToSijin("00:59")).toEqual({ key: "ja", label: "자시", hanja: "子時" }));
  it("23:00 → 자시(子時)", () => expect(timeToSijin("23:00")).toEqual({ key: "ja", label: "자시", hanja: "子時" }));
  it("23:59 → 자시(子時)", () => expect(timeToSijin("23:59")).toEqual({ key: "ja", label: "자시", hanja: "子時" }));

  it("01:00 → 축시(丑時)", () => expect(timeToSijin("01:00")).toEqual({ key: "chuk", label: "축시", hanja: "丑時" }));
  it("02:59 → 축시(丑時)", () => expect(timeToSijin("02:59")).toEqual({ key: "chuk", label: "축시", hanja: "丑時" }));
  it("03:00 → 인시(寅時)", () => expect(timeToSijin("03:00")).toEqual({ key: "in",   label: "인시", hanja: "寅時" }));
  it("05:00 → 묘시(卯時)", () => expect(timeToSijin("05:00")).toEqual({ key: "myo",  label: "묘시", hanja: "卯時" }));
  it("07:00 → 진시(辰時)", () => expect(timeToSijin("07:00")).toEqual({ key: "jin",  label: "진시", hanja: "辰時" }));
  it("09:00 → 사시(巳時)", () => expect(timeToSijin("09:00")).toEqual({ key: "sa",   label: "사시", hanja: "巳時" }));
  it("11:00 → 오시(午時)", () => expect(timeToSijin("11:00")).toEqual({ key: "o",    label: "오시", hanja: "午時" }));
  it("12:30 → 오시(午時)", () => expect(timeToSijin("12:30")).toEqual({ key: "o",    label: "오시", hanja: "午時" }));
  it("13:00 → 미시(未時)", () => expect(timeToSijin("13:00")).toEqual({ key: "mi",   label: "미시", hanja: "未時" }));
  it("14:30 → 미시(未時)", () => expect(timeToSijin("14:30")).toEqual({ key: "mi",   label: "미시", hanja: "未時" }));
  it("15:00 → 신시(申時)", () => expect(timeToSijin("15:00")).toEqual({ key: "sin",  label: "신시", hanja: "申時" }));
  it("17:00 → 유시(酉時)", () => expect(timeToSijin("17:00")).toEqual({ key: "yu",   label: "유시", hanja: "酉時" }));
  it("19:00 → 술시(戌時)", () => expect(timeToSijin("19:00")).toEqual({ key: "sul",  label: "술시", hanja: "戌時" }));
  it("21:00 → 해시(亥時)", () => expect(timeToSijin("21:00")).toEqual({ key: "hae",  label: "해시", hanja: "亥時" }));
  it("22:59 → 해시(亥時)", () => expect(timeToSijin("22:59")).toEqual({ key: "hae",  label: "해시", hanja: "亥時" }));
});
```

- [x] **Step 2: 테스트 실패 확인**

```bash
pnpm exec vitest run src/lib/time-utils.test.ts
```
Expected: FAIL — `Cannot find module './time-utils'`

- [x] **Step 3: 구현 파일 작성**

`src/lib/time-utils.ts`:
```ts
export interface Sijin {
  key: string;
  label: string;
  hanja: string;
}

interface SijinBoundary extends Sijin {
  startHour: number;
  endHour: number;  // exclusive, -1 means wraps to next day
}

// 자시(子時) = 23:00~01:00, 나머지는 단순 2시간 블록
const SIJIN_TABLE: SijinBoundary[] = [
  { key: "chuk", label: "축시", hanja: "丑時", startHour: 1,  endHour: 3  },
  { key: "in",   label: "인시", hanja: "寅時", startHour: 3,  endHour: 5  },
  { key: "myo",  label: "묘시", hanja: "卯時", startHour: 5,  endHour: 7  },
  { key: "jin",  label: "진시", hanja: "辰時", startHour: 7,  endHour: 9  },
  { key: "sa",   label: "사시", hanja: "巳時", startHour: 9,  endHour: 11 },
  { key: "o",    label: "오시", hanja: "午時", startHour: 11, endHour: 13 },
  { key: "mi",   label: "미시", hanja: "未時", startHour: 13, endHour: 15 },
  { key: "sin",  label: "신시", hanja: "申時", startHour: 15, endHour: 17 },
  { key: "yu",   label: "유시", hanja: "酉時", startHour: 17, endHour: 19 },
  { key: "sul",  label: "술시", hanja: "戌時", startHour: 19, endHour: 21 },
  { key: "hae",  label: "해시", hanja: "亥時", startHour: 21, endHour: 23 },
];

const JASI: Sijin = { key: "ja", label: "자시", hanja: "子時" };

export function timeToSijin(time: string | null | undefined): Sijin | null {
  if (!time || !/^\d{2}:\d{2}$/.test(time)) return null;
  const hour = parseInt(time.split(":")[0], 10);
  if (isNaN(hour) || hour < 0 || hour > 23) return null;
  // 자시: 23:00~00:59 (midnight crossing)
  if (hour === 23 || hour === 0) return JASI;
  const found = SIJIN_TABLE.find(s => hour >= s.startHour && hour < s.endHour);
  return found ? { key: found.key, label: found.label, hanja: found.hanja } : null;
}
```

- [x] **Step 4: 테스트 통과 확인**

```bash
pnpm exec vitest run src/lib/time-utils.test.ts
```
Expected: 모든 테스트 PASS

- [x] **Step 5: 커밋**

```bash
git add src/lib/time-utils.ts src/lib/time-utils.test.ts
git commit -m "feat: timeToSijin — HH:MM → 시진 변환 유틸"
```

---

## Task 2: `src/data/mbti.ts` — MBTI 상수

**Files:**
- Create: `src/data/mbti.ts`

- [x] **Step 1: 파일 작성**

`src/data/mbti.ts`:
```ts
export const MBTI_TYPES = [
  "INTJ", "INTP", "ENTJ", "ENTP",
  "INFJ", "INFP", "ENFJ", "ENFP",
  "ISTJ", "ISFJ", "ESTJ", "ESFJ",
  "ISTP", "ISFP", "ESTP", "ESFP",
] as const;

export type MbtiType = typeof MBTI_TYPES[number];
```

- [x] **Step 2: 커밋**

```bash
git add src/data/mbti.ts
git commit -m "feat: MBTI 16타입 상수 추가"
```

---

## Task 3: 타입 변경 — `user-info.ts` + `saju-types.ts`

**Files:**
- Modify: `src/types/user-info.ts`
- Modify: `src/services/saju/saju-types.ts`

- [x] **Step 1: `src/types/user-info.ts` 수정**

전체 파일 교체:
```ts
export interface UserInfo {
  name: string;
  birthDate: string;   // "YYYY-MM-DD"
  gender: "male" | "female" | "other";
  birthTime: string | null;  // "HH:MM" | null (null = 시간 모름)
  mbti?: string;             // "INTJ" 등 선택 사항
}
```

- [x] **Step 2: `src/services/saju/saju-types.ts` 수정**

`SajuInput` 인터페이스만 변경 (다른 인터페이스 유지):
```ts
export interface SajuInput {
  birthDate: string;   // "1990-05-15" (양력)
  birthTime: string | null;  // "HH:MM" | null (null = 시간 모름)
  gender: "male" | "female" | "other";
  name?: string;
  mbti?: string;
}
```

- [x] **Step 3: tsc로 타입 오류 확인**

```bash
pnpm type-check 2>&1 | head -40
```
Expected: 여러 오류 — `birthHour` 참조들이 오류로 표시됨. 이후 태스크에서 순차 수정.

- [x] **Step 4: 커밋**

```bash
git add src/types/user-info.ts src/services/saju/saju-types.ts
git commit -m "feat: UserInfo·SajuInput birthHour → birthTime, mbti 추가"
```

---

## Task 4: Zod 스키마 — `api-schemas.ts`

**Files:**
- Modify: `src/lib/validation/api-schemas.ts`

- [x] **Step 1: `TarotReadingSchema.userInfo` 수정**

`api-schemas.ts`에서 `TarotReadingSchema` 내 userInfo 부분을:
```ts
  userInfo: z.object({
    name: z.string().max(50),
    birthDate: dateStr,
    gender: z.string().max(10),
    birthHour: z.string().max(20),
  }).nullish(),
```
→
```ts
  userInfo: z.object({
    name: z.string().max(50),
    birthDate: dateStr,
    gender: z.string().max(10),
    birthTime: z.string().regex(/^\d{2}:\d{2}$/).nullable(),
    mbti: z.string().max(10).optional(),
  }).nullish(),
```

- [x] **Step 2: `SajuReadingSchema.userInfo` 수정**

```ts
  userInfo: z.object({
    name: z.string().max(50).optional(),
    birthDate: dateStr,
    birthHour: z.string().max(20),
    gender: z.enum(["male", "female", "other"]),
  }),
```
→
```ts
  userInfo: z.object({
    name: z.string().max(50).optional(),
    birthDate: dateStr,
    birthTime: z.string().regex(/^\d{2}:\d{2}$/).nullable(),
    gender: z.enum(["male", "female", "other"]),
    mbti: z.string().max(10).optional(),
  }),
```

- [x] **Step 3: 커밋**

```bash
git add src/lib/validation/api-schemas.ts
git commit -m "feat: api-schemas birthHour → birthTime, mbti 추가"
```

---

## Task 5: 사주 계산기 업데이트

**Files:**
- Modify: `src/services/saju/saju-calculator.ts`
- Modify: `src/services/saju/saju-calculator.test.ts`

- [x] **Step 1: `saju-calculator.test.ts` 픽스처 업데이트**

파일 상단 4개 상수 픽스처 변경:
```ts
// Before
const MALE_1990: SajuInput = { birthDate: "1990-05-15", birthHour: "ja",  gender: "male" };
const FEMALE_2000: SajuInput = { birthDate: "2000-01-01", birthHour: "o",  gender: "female" };
const MALE_1985: SajuInput = { birthDate: "1985-07-07", birthHour: "in",  gender: "male" };
const FEMALE_1975: SajuInput = { birthDate: "1975-03-20", birthHour: "hae", gender: "female" };

// After
const MALE_1990: SajuInput = { birthDate: "1990-05-15", birthTime: "00:00", gender: "male" };
const FEMALE_2000: SajuInput = { birthDate: "2000-01-01", birthTime: "11:00", gender: "female" };
const MALE_1985: SajuInput = { birthDate: "1985-07-07", birthTime: "03:00", gender: "male" };
const FEMALE_1975: SajuInput = { birthDate: "1975-03-20", birthTime: "21:00", gender: "female" };
```

- [x] **Step 2: 테스트 내 나머지 `birthHour` 픽스처 교체**

테스트 파일의 인라인 픽스처들 변경 (197~206행 부근):
```ts
// Before
{ birthDate: "1986-05-20", birthHour: "o", gender: "male" },
// After
{ birthDate: "1986-05-20", birthTime: "11:00", gender: "male" },
```
동일 패턴으로 해당 블록의 모든 `birthHour: "o"` → `birthTime: "11:00"` 변경.

- [x] **Step 3: `birthHour: "unknown"` 테스트 케이스 교체**

테스트 335~336행 부근:
```ts
// Before
it("birthHour unknown (-1)는 tyme4ts가 거부하여 오류가 발생한다", () => {
  expect(() => calculateSaju({ ...MALE_1990, birthHour: "unknown" })).toThrow();
});

// After
it("birthTime null 이면 자시(0시) 기준으로 계산하며 오류 없음", () => {
  expect(() => calculateSaju({ ...MALE_1990, birthTime: null })).not.toThrow();
  const result = calculateSaju({ ...MALE_1990, birthTime: null });
  expect(result.pillars.hour).toBeDefined();
});
```

- [x] **Step 4: 테스트 실패 확인**

```bash
pnpm exec vitest run src/services/saju/saju-calculator.test.ts
```
Expected: FAIL — `birthHour` property missing 오류

- [x] **Step 5: `saju-calculator.ts` 수정**

`BIRTH_HOUR_MAP` import 제거 및 계산 로직 변경:

```ts
// 변경 전 (2번째 줄)
import { OhaengType, STEM_ELEMENT, BRANCH_ELEMENT, STEM_KO, BRANCH_KO, TEN_STARS, TWELVE_STAGES, BIRTH_HOUR_MAP } from "@/data/saju/constants";

// 변경 후
import { OhaengType, STEM_ELEMENT, BRANCH_ELEMENT, STEM_KO, BRANCH_KO, TEN_STARS, TWELVE_STAGES } from "@/data/saju/constants";
```

`calculateSaju` 함수 내 `hourVal` 계산 변경:
```ts
// 변경 전
const hourVal = BIRTH_HOUR_MAP[input.birthHour] ?? 0;

// 변경 후
// birthTime null = 시간 모름 → 자시(0시) 기준으로 계산 (시주는 AI 프롬프트에서 '알 수 없음' 처리)
const hourVal = input.birthTime
  ? parseInt(input.birthTime.split(":")[0], 10)
  : 0;
```

- [x] **Step 6: 테스트 통과 확인**

```bash
pnpm exec vitest run src/services/saju/saju-calculator.test.ts
```
Expected: 모든 테스트 PASS

- [x] **Step 7: 커밋**

```bash
git add src/services/saju/saju-calculator.ts src/services/saju/saju-calculator.test.ts
git commit -m "feat: saju-calculator birthTime(HH:MM) 직접 파싱, null → 자시(0시) fallback"
```

---

## Task 6: Prompt Builder 업데이트

**Files:**
- Modify: `src/services/core/prompt-builder.ts`
- Modify: `src/services/core/prompt-builder.test.ts`

- [x] **Step 1: `prompt-builder.test.ts` 업데이트 — 실패 테스트 먼저 작성**

`prompt-builder.test.ts`의 `describe("buildUserInfoPrompt")` 블록 전체 교체:
```ts
describe("buildUserInfoPrompt", () => {
  it("undefined → 빈 문자열", () => {
    expect(buildUserInfoPrompt(undefined)).toBe("");
  });
  it("null → 빈 문자열", () => {
    expect(buildUserInfoPrompt(null)).toBe("");
  });
  it("birthTime HH:MM → 시각+시진 포함", () => {
    const result = buildUserInfoPrompt({
      name: "홍길동",
      birthDate: "1990-01-01",
      gender: "male",
      birthTime: "14:30",
    });
    expect(result).toContain("14:30");
    expect(result).toContain("미시");
    expect(result).toContain("未時");
  });
  it("birthTime null → '알 수 없음' 표시", () => {
    const result = buildUserInfoPrompt({
      name: "홍길동",
      birthDate: "1990-01-01",
      gender: "male",
      birthTime: null,
    });
    expect(result).toContain("알 수 없음");
    expect(result).not.toContain("시");
  });
  it("mbti 있을 때 포함", () => {
    const result = buildUserInfoPrompt({
      name: "홍길동",
      birthDate: "1990-01-01",
      gender: "male",
      birthTime: "14:30",
      mbti: "INTJ",
    });
    expect(result).toContain("MBTI: INTJ");
  });
  it("mbti 없을 때 MBTI 행 생략", () => {
    const result = buildUserInfoPrompt({
      name: "홍길동",
      birthDate: "1990-01-01",
      gender: "male",
      birthTime: "14:30",
    });
    expect(result).not.toContain("MBTI");
  });
  it("주입 공격 문자 제거", () => {
    const result = buildUserInfoPrompt({
      name: "홍\n길동",
      birthDate: "1990-01-01",
      gender: "male",
      birthTime: "14:30",
    });
    expect(result).not.toContain("\n홍");
  });
});
```

- [x] **Step 2: `prompt-builder.ts` 수정**

파일 상단에 import 추가:
```ts
import { timeToSijin } from "@/lib/time-utils";
```

`buildUserInfoPrompt` 함수 전체 교체:
```ts
export function buildUserInfoPrompt(
  userInfo?: { name: string; birthDate: string; gender: string; birthTime: string | null; mbti?: string } | null
): string {
  if (!userInfo) return "";
  const genderMap: Record<string, string> = { male: "남성", female: "여성", other: "기타" };
  const name = sanitizeField(userInfo.name, 50);
  const birthDate = sanitizeField(userInfo.birthDate, 20);
  const gender = sanitizeField(genderMap[userInfo.gender] || userInfo.gender, 10);

  let birthTimeStr: string;
  if (!userInfo.birthTime) {
    birthTimeStr = "알 수 없음";
  } else {
    const sijin = timeToSijin(userInfo.birthTime);
    birthTimeStr = sijin
      ? `${userInfo.birthTime} (${sijin.label}, ${sijin.hanja})`
      : sanitizeField(userInfo.birthTime, 20);
  }

  const mbtiLine = userInfo.mbti ? `\n- MBTI: ${sanitizeField(userInfo.mbti, 10)}` : "";
  return `\n\n상담자 정보:\n- 이름: ${name}\n- 생년월일: ${birthDate}\n- 성별: ${gender}\n- 태어난 시: ${birthTimeStr}${mbtiLine}\n\n이 정보를 참고하여 더 개인화된 리딩을 제공해주세요.`;
}
```

- [x] **Step 3: 테스트 통과 확인**

```bash
pnpm exec vitest run src/services/core/prompt-builder.test.ts
```
Expected: 모든 테스트 PASS

- [x] **Step 4: 커밋**

```bash
git add src/services/core/prompt-builder.ts src/services/core/prompt-builder.test.ts
git commit -m "feat: buildUserInfoPrompt birthTime + MBTI 반영"
```

---

## Task 7: 사주 서비스 — buildSajuPrompt 업데이트

**Files:**
- Modify: `src/services/saju/saju-service.ts`

- [x] **Step 1: `buildSajuPrompt` 시그니처 + 내용 수정**

`buildSajuPrompt` 메서드의 `userInfo` 매개변수 타입 확장:
```ts
// Before
buildSajuPrompt(topic: Topic, timeRange: SajuTimeRange, sajuResult: SajuResult, userInfo?: { name?: string }): string {

// After
buildSajuPrompt(
  topic: Topic,
  timeRange: SajuTimeRange,
  sajuResult: SajuResult,
  userInfo?: { name?: string; birthTime?: string | null; mbti?: string }
): string {
```

함수 본문에 birthTime/MBTI 컨텍스트 추가 (return 문 직전):
```ts
// userInfo?.name 행 아래에 추가
const birthTimeNote = userInfo?.birthTime === null
  ? "\n[참고: 출생 시각 미입력 — 시주는 자시(0시) 기준으로 계산됨, 해석 시 참고만 할 것]"
  : "";
const mbtiNote = userInfo?.mbti
  ? `\n[MBTI: ${userInfo.mbti} — 심리 유형을 사주 해석에 교차 참조할 것]`
  : "";
```

그리고 return 문의 템플릿 리터럴에 `${birthTimeNote}${mbtiNote}` 추가:
```ts
return `상담 주제: ${TOPIC_LABELS[topic] ?? topic} / 시간 범위: ${timeLabel}(${timeDesc})
${userInfo?.name ? `상담자: ${userInfo.name}` : ""}${birthTimeNote}${mbtiNote}

${pillarSection}${additionalSections.join("")}

${timeContext}
${instruction}
종합적인 사주 해석과 함께, 선택한 시간 범위와 주제에 특화된 구체적 조언을 포함해주세요.`;
```

- [x] **Step 2: tsc 확인**

```bash
pnpm type-check 2>&1 | grep saju-service
```
Expected: 오류 없음

- [x] **Step 3: 커밋**

```bash
git add src/services/saju/saju-service.ts
git commit -m "feat: buildSajuPrompt null birthTime 주석 + MBTI 교차 참조 추가"
```

---

## Task 8: API 라우트 업데이트

**Files:**
- Modify: `src/app/api/saju/reading/route.ts`
- Modify: `src/app/api/tarot/reading/route.ts`
- Modify: `src/app/saju/result/[id]/page.tsx`

- [x] **Step 1: `saju/reading/route.ts` — calculateSaju 호출 변경**

라인 80~85 부근:
```ts
// Before
const sajuResult = calculateSaju({
  birthDate: userInfo.birthDate,
  birthHour: userInfo.birthHour,
  gender: userInfo.gender,
  name: userInfo.name,
}, calcOptions);

// After
const sajuResult = calculateSaju({
  birthDate: userInfo.birthDate,
  birthTime: userInfo.birthTime,
  gender: userInfo.gender,
  name: userInfo.name,
  mbti: userInfo.mbti,
}, calcOptions);
```

- [x] **Step 2: `saju/reading/route.ts` — buildSajuPrompt 호출 변경**

라인 88~89 부근:
```ts
// Before
const readingPrompt = sajuService.buildSajuPrompt(topic, timeRange, sajuResult, userInfo)
  + buildFreeQuestionPrompt(freeQuestion);

// After (userInfo에서 birthTime, mbti 명시 추출; buildFreeQuestionPrompt 유지)
const readingPrompt = sajuService.buildSajuPrompt(topic, timeRange, sajuResult, {
  name: userInfo.name,
  birthTime: userInfo.birthTime,
  mbti: userInfo.mbti,
}) + buildFreeQuestionPrompt(freeQuestion);
```

- [x] **Step 3: `saju/reading/route.ts` — DB 저장 변경**

라인 135 부근:
```ts
// Before
birth_hour: userInfo.birthHour,

// After
birth_hour: userInfo.birthTime,
```

- [x] **Step 4: `tarot/reading/route.ts` — buildUserInfoPrompt 호출 확인**

라인 81 부근 확인. `buildUserInfoPrompt(userInfo)`는 이미 `TarotReadingSchema`에서 파싱된 `userInfo`를 받는다. 스키마를 `birthTime`으로 이미 변경했으므로 타입이 자동으로 맞음. 추가 변경 불필요.

- [x] **Step 5: `src/app/saju/result/[id]/page.tsx` 타입 수정**

`SajuReadingRow` 인터페이스의 `birth_hour` 타입 변경:
```ts
// Before
birth_hour: string;

// After
birth_hour: string | null;
```

- [x] **Step 6: tsc 확인**

```bash
pnpm type-check 2>&1 | grep -E "saju/reading|tarot/reading|result"
```
Expected: 오류 없음

- [x] **Step 7: 커밋**

```bash
git add src/app/api/saju/reading/route.ts src/app/api/tarot/reading/route.ts src/app/saju/result/[id]/page.tsx
git commit -m "feat: API 라우트 birthTime 전달 + DB 저장 업데이트"
```

---

## Task 9: UserInfoForm 컴포넌트 전면 교체

**Files:**
- Modify: `src/components/common/UserInfoForm.tsx`

- [x] **Step 1: import + ProfileSetters 업데이트**

파일 상단 import 변경:
```ts
// Before
import { birthHours } from "@/data/birth-hours";

// After
import { timeToSijin } from "@/lib/time-utils";
import { MBTI_TYPES } from "@/data/mbti";
```

`ProfileSetters` 타입 변경:
```ts
// Before
type ProfileSetters = {
  setName: (v: string) => void;
  setBirthDate: (v: string) => void;
  setGender: (v: "male" | "female" | "other") => void;
  setBirthHour: (v: string) => void;
  setSaveInfo: (v: boolean) => void;
  setHasSavedInfo: (v: boolean) => void;
};

// After
type ProfileSetters = {
  setName: (v: string) => void;
  setBirthDate: (v: string) => void;
  setGender: (v: "male" | "female" | "other") => void;
  setBirthHourNum: (v: string) => void;
  setBirthMinuteNum: (v: string) => void;
  setTimeUnknown: (v: boolean) => void;
  setMbti: (v: string) => void;
  setSaveInfo: (v: boolean) => void;
  setHasSavedInfo: (v: boolean) => void;
};
```

- [x] **Step 2: `applySupabaseProfile` 업데이트**

```ts
async function applySupabaseProfile(userId: string, setters: ProfileSetters): Promise<void> {
  const supabase = createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("birth_name, birth_date, gender, birth_hour, mbti, privacy_agreed_at")
    .eq("id", userId)
    .single();

  if (!profile?.birth_date) return;
  if (profile.birth_name) setters.setName(profile.birth_name);
  setters.setBirthDate(profile.birth_date);
  if (profile.gender) setters.setGender(profile.gender as "male" | "female" | "other");
  if (profile.birth_hour) {
    const [h, m] = profile.birth_hour.split(":");
    if (h !== undefined && m !== undefined) {
      setters.setBirthHourNum(String(parseInt(h, 10)));
      setters.setBirthMinuteNum(String(parseInt(m, 10)));
    }
  } else {
    setters.setTimeUnknown(true);
  }
  if (profile.mbti) setters.setMbti(profile.mbti);
  if (profile.privacy_agreed_at) setters.setSaveInfo(true);
  setters.setHasSavedInfo(true);
}
```

- [x] **Step 3: `applyLocalProfile` 업데이트**

```ts
function applyLocalProfile(setters: ProfileSetters): void {
  const local = loadLocalInfo();
  if (!local) return;
  if (local.name) setters.setName(local.name);
  if (local.birthDate) setters.setBirthDate(local.birthDate);
  if (local.gender) setters.setGender(local.gender);
  if (local.birthTime) {
    const [h, m] = local.birthTime.split(":");
    if (h !== undefined && m !== undefined) {
      setters.setBirthHourNum(String(parseInt(h, 10)));
      setters.setBirthMinuteNum(String(parseInt(m, 10)));
    }
  } else if (local.birthTime === null) {
    setters.setTimeUnknown(true);
  }
  if (local.mbti) setters.setMbti(local.mbti);
  setters.setSaveInfo(true);
  setters.setHasSavedInfo(true);
}
```

- [x] **Step 4: `persistProfileToSupabase` 업데이트**

```ts
async function persistProfileToSupabase(data: UserInfo, birthDate: string): Promise<boolean> {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return true;
    const { error } = await supabase.from("profiles").update({
      birth_name: data.name,
      birth_date: birthDate,
      gender: data.gender,
      birth_hour: data.birthTime,   // "HH:MM" 또는 null
      mbti: data.mbti ?? null,
      privacy_agreed_at: new Date().toISOString(),
    }).eq("id", user.id);
    if (error) {
      console.error("프로필 저장 실패:", error);
      return false;
    }
  } catch (e) {
    console.error("프로필 저장 오류:", e);
  }
  return true;
}
```

- [x] **Step 5: `UserInfoForm` 컴포넌트 state + 유효성 검증 업데이트**

함수 내 state 변경:
```ts
// Before
const [birthHour, setBirthHour] = useState("");

// After
const [birthHourNum, setBirthHourNum] = useState("");   // "0"~"23"
const [birthMinuteNum, setBirthMinuteNum] = useState(""); // "0"~"59"
const [timeUnknown, setTimeUnknown] = useState(false);
const [mbti, setMbti] = useState("");
```

`useEffect` 내 setters 객체 업데이트:
```ts
const setters: ProfileSetters = {
  setName, setBirthDate,
  setGender: (v) => setGender(v),
  setBirthHourNum, setBirthMinuteNum, setTimeUnknown,
  setMbti,
  setSaveInfo, setHasSavedInfo,
};
```

`birthTime` 계산 변수 추가:
```ts
const birthTime: string | null = timeUnknown
  ? null
  : (birthHourNum !== "" && birthMinuteNum !== ""
    ? `${birthHourNum.padStart(2, "0")}:${birthMinuteNum.padStart(2, "0")}`
    : null);
```

`isValid` 업데이트:
```ts
const timeProvided = timeUnknown || birthTime !== null;
const isValid = mode === "saju"
  ? !!(birthDate && gender && timeProvided)
  : !!(name.trim() && birthDate && gender);
```

`handleSubmit` 내 data 객체 업데이트:
```ts
const data: UserInfo = {
  name: name.trim(),
  birthDate,
  gender: gender as "male" | "female" | "other",
  birthTime,
  mbti: mbti || undefined,
};
```

- [x] **Step 6: `hourOptions` 제거 + 시진 자동 표시 변수 추가**

제거:
```ts
// 제거할 코드
const hourOptions = mode === "saju"
  ? birthHours.filter((h) => h.value !== "unknown")
  : birthHours;
```

추가:
```ts
const sijin = birthTime ? timeToSijin(birthTime) : null;
```

- [x] **Step 7: JSX 교체 — 태어난 시 영역**

기존 `<select>` 블록 전체(라인 275~296)를 교체:
```tsx
{/* 태어난 시 */}
<div>
  <label className="text-arcana-muted text-xs font-serif mb-1.5 block">
    태어난 시각 {mode === "saju" ? "*" : "(선택)"}
  </label>
  <div className="flex items-center gap-2 mb-2">
    <input
      type="number"
      min={0}
      max={23}
      value={birthHourNum}
      onChange={(e) => setBirthHourNum(e.target.value)}
      disabled={timeUnknown}
      placeholder="시"
      className={`${inputClasses} w-20 text-center disabled:opacity-40`}
    />
    <span className="text-arcana-muted text-lg">:</span>
    <input
      type="number"
      min={0}
      max={59}
      value={birthMinuteNum}
      onChange={(e) => setBirthMinuteNum(e.target.value)}
      disabled={timeUnknown}
      placeholder="분"
      className={`${inputClasses} w-20 text-center disabled:opacity-40`}
    />
    {sijin && !timeUnknown && (
      <span className="text-arcana-purple/80 text-xs font-serif ml-1">
        → {sijin.label}({sijin.hanja})
      </span>
    )}
  </div>
  <label className="flex items-center gap-2 cursor-pointer">
    <input
      type="checkbox"
      checked={timeUnknown}
      onChange={(e) => {
        setTimeUnknown(e.target.checked);
        if (e.target.checked) {
          setBirthHourNum("");
          setBirthMinuteNum("");
        }
      }}
      className="w-4 h-4 rounded border-arcana-border accent-arcana-purple"
    />
    <span className="text-arcana-muted text-xs">시간을 모릅니다</span>
  </label>
</div>
```

- [x] **Step 8: JSX 추가 — MBTI 선택 영역 (태어난 시 아래)**

```tsx
{/* MBTI (선택) */}
<div>
  <label htmlFor="userinfo-mbti" className="text-arcana-muted text-xs font-serif mb-1.5 block">
    MBTI (선택)
  </label>
  <div className="relative">
    <select
      id="userinfo-mbti"
      value={mbti}
      onChange={(e) => setMbti(e.target.value)}
      className={`${inputClasses} appearance-none pr-8`}
    >
      <option value="">선택 안 함</option>
      {MBTI_TYPES.map((type) => (
        <option key={type} value={type}>{type}</option>
      ))}
    </select>
    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-arcana-muted pointer-events-none text-xs">▼</span>
  </div>
</div>
```

- [x] **Step 9: tsc + lint 확인**

```bash
pnpm type-check 2>&1 | grep UserInfoForm
pnpm lint 2>&1 | grep UserInfoForm
```
Expected: 오류 없음

- [x] **Step 10: 커밋**

```bash
git add src/components/common/UserInfoForm.tsx
git commit -m "feat: UserInfoForm 시·분 직접 입력 + 시간 모름 체크박스 + MBTI 선택"
```

---

## Task 10: DB 마이그레이션 + SonarCloud

**Files:**
- Create: `supabase/migrations/018_birthtime_mbti.sql`
- Modify: `sonar-project.properties`

- [x] **Step 1: 마이그레이션 파일 작성**

`supabase/migrations/018_birthtime_mbti.sql`:
```sql
-- 기존 birth_hour 값(시진 코드 문자열)은 HH:MM 역변환 불가 → null 처리
UPDATE profiles SET birth_hour = NULL
WHERE birth_hour IS NOT NULL
  AND birth_hour NOT SIMILAR TO '\d{2}:\d{2}';

-- MBTI 컬럼 추가
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS mbti text;
```

- [x] **Step 2: `sonar-project.properties` exclusions 동기화**

`sonar.coverage.exclusions` 목록에 두 파일 추가 (다른 제외 패턴과 동일 형식):
```
src/lib/time-utils.ts,\
src/data/mbti.ts,\
```

`sonar.cpd.exclusions`에도 동일하게 추가.

- [x] **Step 3: 커밋**

```bash
git add supabase/migrations/018_birthtime_mbti.sql sonar-project.properties
git commit -m "feat: migration 018 birth_hour null 처리 + mbti 컬럼 추가"
```

---

## Task 11: API 테스트 픽스처 업데이트

**Files:**
- Modify: `src/__tests__/api/saju-reading.test.ts`
- Modify: `src/__tests__/api/tarot-reading.test.ts`

- [x] **Step 1: `saju-reading.test.ts` — `birthHour` → `birthTime` 전체 교체**

파일 내 `birthHour:` 를 모두 `birthTime:` 으로 변경:
- `birthHour: "mi"` → `birthTime: "13:00"`
- `birthHour: "unknown"` → `birthTime: null`
- `birthHour: "ja"` → `birthTime: "23:00"`

다음 bash로 확인:
```bash
grep -n "birthHour" src/__tests__/api/saju-reading.test.ts
```
Expected: 0건 — 모두 교체됨

- [x] **Step 2: `tarot-reading.test.ts` — `birthHour` → `birthTime` 교체**

파일 내 `birthHour:` 를 모두 `birthTime:` 으로 변경:
- `birthHour: "mi"` → `birthTime: "13:00"`
- 기타 시진 코드 → 해당 시간대 HH:MM

```bash
grep -n "birthHour" src/__tests__/api/tarot-reading.test.ts
```
Expected: 0건

- [x] **Step 3: 전체 테스트 실행**

```bash
pnpm test:coverage
```
Expected: PASS, 커버리지 임계치(branches 92 / functions 98 / lines 98 / statements 98) 유지

- [x] **Step 4: 커밋**

```bash
git add src/__tests__/api/saju-reading.test.ts src/__tests__/api/tarot-reading.test.ts
git commit -m "test: saju/tarot API 테스트 birthHour → birthTime 픽스처 업데이트"
```

---

## Task 12: 통합 검증 + 테스트 수 동기화

- [x] **Step 1: 전체 정적 검사**

```bash
pnpm type-check && pnpm lint
```
Expected: 오류 없음

- [x] **Step 2: 전체 테스트 + 커버리지**

```bash
pnpm test:coverage
```
Expected: PASS, 커버리지 임계치 유지

- [x] **Step 3: 테스트 수 동기화**

```bash
pnpm sync:test-count
```

- [x] **Step 4: i18n drift 검사**

```bash
pnpm i18n:check
```
Expected: 오류 없음 (새 UI 텍스트는 하드코딩 한국어이므로 번역키 추가 불필요, 필요시 별도 PR)

- [x] **Step 5: 빌드 확인**

```bash
pnpm build
```
Expected: 빌드 성공

- [x] **Step 6: feature 브랜치 PR 생성**

```bash
gh pr create --title "feat: 출생 시각 HH:MM 직접 입력 + MBTI 선택 추가" --body "$(cat <<'EOF'
## Summary
- UserInfo 출생 시 입력을 12시진 드롭다운 → HH:MM 직접 입력으로 교체
- A-1 체크박스 "시간을 모릅니다" 추가 (null = 시간 모름)
- MBTI 선택 드롭다운 추가 (선택 사항, 타로·사주 AI 해석에 반영)
- Clean Break: DB migration 018로 기존 시진 값 null 처리, mbti 컬럼 추가
- 타입: `birthHour: string` → `birthTime: string | null`, `mbti?: string`

## Test plan
- [x] `pnpm test:coverage` — 임계치 유지
- [x] `pnpm type-check` — 오류 없음
- [x] `pnpm build` — 빌드 성공
- [x] 사주 페이지 직접 접속 → 시·분 입력, 시진 자동 표시 확인
- [x] "시간을 모릅니다" 체크 → 입력 비활성화, 사주 리딩 정상 진행 확인
- [x] MBTI 선택 → AI 리딩에 반영 확인
- [x] 타로 페이지 동일 확인

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## 주의사항

- **신점 MBTI**: 신점 서비스는 현재 `UserInfoForm`을 사용하지 않아 이번 PR에서 제외. MBTI 반영은 신점 userInfo 플로우 추가 시 후속 PR에서 진행.
- **i18n**: UI 신규 텍스트("태어난 시각", "시간을 모릅니다", "MBTI (선택)")는 한국어 하드코딩으로 우선 적용. 다국어 지원 필요 시 별도 번역키 추가 PR.
- **BIRTH_HOUR_MAP**: `src/data/saju/constants.ts`에 남겨둠 (삭제 시 불필요한 diff). `saju-calculator.ts`에서만 import 제거.
