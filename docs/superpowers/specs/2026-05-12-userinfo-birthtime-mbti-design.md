# UserInfo 개선: 출생 시각 정밀 입력 + MBTI 선택

**날짜**: 2026-05-12  
**범위**: 타로·사주·신점 전체  
**상태**: 설계 확정

---

## 개요

현재 `UserInfo`의 출생 시 입력이 12시진 드롭다운(2시간 블록)으로 정밀도가 낮다.
이를 시·분 직접 입력(HH:MM)으로 교체하고, "시간 모름" 체크박스와 선택적 MBTI 입력을 추가한다.

---

## 결정 사항 요약

| 항목 | 결정 |
|------|------|
| 입력 방식 | 시·분 숫자 입력 + 자동 시진 변환 표시 |
| 시간 모름 처리 | A-1: 하단 체크박스 → 입력 비활성화 |
| 적용 범위 | 타로·사주·신점 전체 |
| MBTI | 선택 사항, 모든 서비스 AI 해석에 반영 |
| 마이그레이션 전략 | Clean Break: 기존 시진 문자열 → null 처리 |

---

## 1. 데이터 모델 & 타입

### 1-1. UserInfo 타입 (`src/types/user-info.ts`)

```ts
// 변경 전
interface UserInfo {
  name: string;
  birthDate: string;
  gender: string;
  birthHour: string;  // "미시", "자시", "unknown"
}

// 변경 후
interface UserInfo {
  name: string;
  birthDate: string;
  gender: string;
  birthTime: string | null;  // "HH:MM" | null (null = 시간 모름)
  mbti?: string;             // "INTJ" 등 16개 타입 | undefined
}
```

### 1-2. SajuInput 타입 (`src/services/saju/saju-types.ts`)

```ts
// 변경 전
interface SajuInput {
  birthDate: string;
  birthHour: string;
  gender: string;
  name?: string;
}

// 변경 후
interface SajuInput {
  birthDate: string;
  birthTime: string | null;
  gender: string;
  name?: string;
  mbti?: string;
}
```

### 1-3. DB 마이그레이션 (`supabase/migrations/018_birthtime_mbti.sql`)

```sql
-- 기존 birth_hour 값(시진 문자열)은 역변환 불가 → null 처리
UPDATE profiles SET birth_hour = NULL;

-- mbti 컬럼 추가
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS mbti text;
```

> 기존 `birth_hour` 컬럼명은 유지(DB 컬럼 rename 비용 최소화). 값 포맷만 변경(HH:MM 또는 null).

### 1-4. Zod 스키마 (`src/lib/validation/api-schemas.ts`)

- `birthHour` 필드명 → `birthTime` 으로 변경
- 유효성: `z.string().regex(/^\d{2}:\d{2}$/).nullable()`
- `mbti`: `z.string().optional()` (16개 타입 enum 또는 단순 string)

---

## 2. 새 유틸리티

### 2-1. `src/lib/time-utils.ts`

```ts
// 시진 경계표
const SIJIN_TABLE = [
  { start: 23, end: 1,  key: "자시", hanja: "子時" },
  { start: 1,  end: 3,  key: "축시", hanja: "丑時" },
  { start: 3,  end: 5,  key: "인시", hanja: "寅時" },
  { start: 5,  end: 7,  key: "묘시", hanja: "卯時" },
  { start: 7,  end: 9,  key: "진시", hanja: "辰時" },
  { start: 9,  end: 11, key: "사시", hanja: "巳時" },
  { start: 11, end: 13, key: "오시", hanja: "午時" },
  { start: 13, end: 15, key: "미시", hanja: "未時" },
  { start: 15, end: 17, key: "신시", hanja: "申時" },
  { start: 17, end: 19, key: "유시", hanja: "酉時" },
  { start: 19, end: 21, key: "술시", hanja: "戌時" },
  { start: 21, end: 23, key: "해시", hanja: "亥時" },
];

export function timeToSijin(time: string): { key: string; hanja: string } | null
// "14:30" → { key: "미시", hanja: "未時" }
// null 또는 빈값 → null
```

### 2-2. `src/data/mbti.ts`

```ts
export const MBTI_TYPES = [
  "INTJ", "INTP", "ENTJ", "ENTP",
  "INFJ", "INFP", "ENFJ", "ENFP",
  "ISTJ", "ISFJ", "ESTJ", "ESFJ",
  "ISTP", "ISFP", "ESTP", "ESFP",
] as const;

export type MbtiType = typeof MBTI_TYPES[number];
```

---

## 3. UI 컴포넌트

### 3-1. UserInfoForm (`src/components/common/UserInfoForm.tsx`)

**출생 시각 영역 교체**:

```
┌─────────────────────────────────┐
│ 태어난 시각                      │
│                                 │
│  [ 14 ]시  [ 30 ]분  → 미시(未時) │
│                                 │
│  ☐ 시간을 모릅니다               │
└─────────────────────────────────┘
```

- `<input type="number" min="0" max="23">` (시) + `<input type="number" min="0" max="59">` (분)
- 유효한 시각 입력 시 `timeToSijin()` 결과를 우측에 실시간 표시
- 체크박스 선택 시: 두 입력 `disabled` + opacity 처리, 시진 레이블 숨김, `birthTime = null`

**MBTI 영역 추가**:

```
┌─────────────────────────────────┐
│ MBTI (선택)                     │
│                                 │
│  [ 선택 안 함 ▾ ]               │
└─────────────────────────────────┘
```

- `MBTI_TYPES` 배열 기반 `<select>` + "선택 안 함" 기본값
- 선택 안 함 시 `mbti = undefined`

**제거**: `src/data/birth-hours.ts`의 `birthHours` 배열 및 `BirthHour` 타입 (더 이상 불필요)

### 3-2. 사주 모드 특이사항

현재 사주 세션에서 `birthHour === "unknown"` 제외 로직 → `birthTime === null` 체크로 변경.
사주는 시간 모름 허용(시주 미포함), 타로·신점도 동일하게 선택 사항.

---

## 4. 서비스 & AI 프롬프트

### 4-1. saju-calculator.ts

```ts
// 변경 전
calculateSaju({ birthHour: "미시" })

// 변경 후
calculateSaju({ birthTime: "14:30" | null })
// 내부: birthTime이 있으면 timeToSijin() → 기존 시주 계산 로직
//        null이면 시주 미포함
```

### 4-2. prompt-builder.ts (`buildUserInfoPrompt`)

```
// 시각 있을 때
태어난 시: 14:30 (미시, 未時)
MBTI: INTJ

// 시간 모름
태어난 시: 알 수 없음

// MBTI 없을 때
(MBTI 행 자체 생략)
```

### 4-3. saju-service.ts (`buildSajuPrompt`)

```
// 시각 있을 때
시주: 기묘(己卯) [14:30 기준]

// 시간 모름
시주: 알 수 없음 (출생 시각 미입력)
```

### 4-4. MBTI → 각 서비스 AI 반영

`buildReadingPrompt()` 또는 시스템 프롬프트에 MBTI 컨텍스트 추가:

| 서비스 | 반영 방식 |
|--------|---------|
| 타로 | 카드 해석 톤 개인화 (MBTI 특성 반영) |
| 사주 | 현대 심리 관점 교차 분석 추가 |
| 신점 | 상담 방향 및 언어 톤 개인화 |

---

## 5. 영향 범위 요약

| 파일 | 변경 유형 |
|------|---------|
| `src/types/user-info.ts` | `birthHour` → `birthTime`, `mbti` 추가 |
| `src/services/saju/saju-types.ts` | 동일 |
| `src/lib/time-utils.ts` | 신규 — `timeToSijin()` |
| `src/data/mbti.ts` | 신규 — MBTI 타입 배열 |
| `src/data/birth-hours.ts` | 삭제 |
| `src/components/common/UserInfoForm.tsx` | 입력 UI 교체 |
| `src/lib/validation/api-schemas.ts` | Zod 스키마 업데이트 |
| `src/services/saju/saju-calculator.ts` | `birthTime` 기반으로 변경 |
| `src/services/core/prompt-builder.ts` | 출력 포맷 변경 + MBTI 추가 |
| `src/services/saju/saju-service.ts` | 시주 섹션 변경 |
| `src/services/tarot/tarot-service.ts` | MBTI 컨텍스트 추가 |
| `src/services/shinjeom/shinjeom-service.ts` | MBTI 컨텍스트 추가 |
| `src/app/api/saju/session/route.ts` | 스키마 필드명 변경 |
| `src/app/api/saju/reading/route.ts` | `birthTime` 전달 변경 |
| `supabase/migrations/018_birthtime_mbti.sql` | 신규 마이그레이션 |
| `src/__tests__/api/saju-*.test.ts` | 테스트 픽스처 업데이트 |
| `sonar-project.properties` | `time-utils.ts`, `mbti.ts` exclusions 동기화 |

---

## 6. 테스트 전략

- `src/lib/time-utils.test.ts`: `timeToSijin()` 경계값 단위 테스트 (24개 구간)
- `src/__tests__/api/saju-session.test.ts`: `birthTime` HH:MM 포맷 검증
- `src/__tests__/api/saju-reading.test.ts`: null birthTime → 시주 미포함 동작 검증
- 기존 `birthHour` 픽스처를 `birthTime` 형식으로 일괄 업데이트
