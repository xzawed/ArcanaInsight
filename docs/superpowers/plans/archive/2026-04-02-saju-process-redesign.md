# 사주 프로세스 재설계: 시간단위 x 분석영역 매트릭스

> **Status**: 설계 진행 중

## Context

현재 사주 프로세스는 3개 카테고리(시간기반/관계/심층) → 16개 세부 주제를 순차 선택하는 구조. 이를 **시간단위(7) x 분석영역(8) 동시 선택** 방식으로 전면 재설계. 사용자가 한 화면에서 "어느 기간" + "어떤 분야"를 선택하면 조합된 사주 리딩을 제공. 년단위 선택 시 "월별 상세 포함" 토글 옵션 추가.

**접근 방식**: 분석영역을 Topic으로, 시간단위를 별도 `SajuTimeRange` 파라미터로 분리 (방식 B).

---

## 1단계: 타입 시스템 변경

### `src/types/session.ts` — Topic 유니온 재구성

기존 16개 사주 Topic을 **8개 사주 분석영역 Topic으로 교체**:

```typescript
export type Topic =
  // 타로 전용 (변경 없음)
  | "love" | "love-single" | "love-couple" | "finance" | "career" | "health" | "general"
  // 사주 분석영역 (8개 — 시간단위와 독립)
  | "saju-general" | "saju-love-single" | "saju-love-couple"
  | "saju-career" | "saju-health" | "saju-personality"
  | "saju-compatibility" | "saju-auspicious-date";
```

**삭제 대상** (16개): `saju-monthly`, `saju-this-month`, `saju-weekly`, `saju-next-year`, `fortune-3y`, `fortune-5y`, `fortune-full`, `saju-love-timing`, `saju-career-timing`, `saju-aptitude`, `saju-constitution`, `saju-yongsin`, `saju-relationships`

### 새 타입: `SajuTimeRange`

`src/types/session.ts` 또는 `src/data/saju/categories.ts`에 추가:

```typescript
export type SajuTimeRange =
  | "this-week"      // 이번 주 (일운 7일)
  | "this-month"     // 이번 달 (월운)
  | "this-year"      // 올해 (세운)
  | "next-year"      // 내년 (세운)
  | "three-year"     // 3년 (다년 세운)
  | "five-year"      // 5년 (다년 세운)
  | "full-fortune";  // 전체 대운
```

---

## 2단계: 데이터 정의 교체

### `src/data/saju/categories.ts` → 전면 재작성

기존 3카테고리+16주제 구조를 **시간단위 7개 + 분석영역 8개** 평면 데이터로 교체:

```typescript
export interface SajuTimeOption {
  id: SajuTimeRange;
  label: string;
  icon: string;
  desc: string;
  /** 이 시간단위에서 월별 상세 토글 허용 여부 */
  allowMonthly: boolean;
  /** calculator에 전달할 옵션 */
  calcOption: SajuCalculateOptions;
}

export interface SajuAreaOption {
  id: Topic;  // saju-general, saju-love-single 등
  label: string;
  icon: string;
  desc: string;
}

export const sajuTimeOptions: SajuTimeOption[] = [
  { id: "this-week",     label: "이번 주",   icon: "📅", desc: "7일간 일운",         allowMonthly: false, calcOption: { daily: true } },
  { id: "this-month",    label: "이번 달",   icon: "🌙", desc: "이번 달 월운",       allowMonthly: false, calcOption: { monthly: true } },
  { id: "this-year",     label: "올해",      icon: "📊", desc: "올해 세운",          allowMonthly: true,  calcOption: {} },
  { id: "next-year",     label: "내년",      icon: "🔮", desc: "내년 세운",          allowMonthly: true,  calcOption: { yearlyMulti: 1 } },
  { id: "three-year",    label: "3년",       icon: "📈", desc: "향후 3년 흐름",      allowMonthly: true,  calcOption: { yearlyMulti: 3 } },
  { id: "five-year",     label: "5년",       icon: "🗓️", desc: "향후 5년 중기 전망", allowMonthly: true,  calcOption: { yearlyMulti: 5 } },
  { id: "full-fortune",  label: "전체 대운", icon: "🌟", desc: "인생 대운 로드맵",   allowMonthly: false, calcOption: {} },
];

export const sajuAreaOptions: SajuAreaOption[] = [
  { id: "saju-general",         label: "종합운",       icon: "☯",  desc: "종합적인 운세 흐름" },
  { id: "saju-love-single",     label: "연애(솔로)",   icon: "💝", desc: "새 만남·인연 시기" },
  { id: "saju-love-couple",     label: "연애(커플)",   icon: "💑", desc: "관계 발전·갈등 해결" },
  { id: "saju-career",          label: "직장·재물",    icon: "💰", desc: "직장·사업·금전운" },
  { id: "saju-health",          label: "건강운",       icon: "🌿", desc: "건강·체질·오행" },
  { id: "saju-personality",     label: "성격·적성",    icon: "🧠", desc: "성격·적성·직업 분석" },
  { id: "saju-compatibility",   label: "궁합",         icon: "🤝", desc: "인연 경향·궁합 분석" },
  { id: "saju-auspicious-date", label: "택일",         icon: "📆", desc: "길일·흉일 판단" },
];
```

**기존 `getRequiresData()` 헬퍼는 삭제** — `SajuTimeOption.calcOption`이 대체.

---

## 3단계: Zustand 스토어 확장

### `src/hooks/useSajuSession.ts`

새 필드 추가:

```typescript
interface SajuSessionState {
  // 기존 유지
  phase: SajuPhase;
  sessionId: string | null;
  characterId: string | null;
  topic: Topic | null;
  userInfo: UserInfo | null;
  // ...

  // 새 필드
  timeRange: SajuTimeRange | null;
  includeMonthly: boolean;

  // 새 setter
  setTimeRange: (range: SajuTimeRange) => void;
  setIncludeMonthly: (v: boolean) => void;
}
```

`reset()`에 `timeRange: null, includeMonthly: false` 포함.

---

## 4단계: 사주 메인 페이지 UI 재구성

### `src/app/saju/page.tsx`

**PageStep 변경**:
```typescript
type PageStep = "character-select" | "info-input" | "saju-select";
```

기존 4단계(`category-select` + `topic-select`) → **1단계 `saju-select`로 통합**.

**`saju-select` UI 구성** (상하 2단 레이아웃):

```
┌──────────────────────────────┐
│  ⏳ 시간단위                   │
│  [이번주][이번달][올해][내년] │
│  [3년]  [5년] [전체대운]     │
│                              │
│  ☑ 월별 상세 포함  (년단위만) │
│                              │
│  🔮 분석영역                  │
│  [종합] [연애솔로][연애커플]  │
│  [직장재물][건강][성격적성]   │
│  [궁합]  [택일]              │
│                              │
│  [ 사주 분석 시작하기 → ]     │
└──────────────────────────────┘
```

- 시간단위 버튼: 선택 시 `selectedTimeRange` 로컬 state 설정 + 선택 버튼 하이라이트
- 분석영역 버튼: 선택 시 `selectedArea` 로컬 state 설정 + 선택 버튼 하이라이트
- 월별 토글: `selectedTimeRange`의 `allowMonthly === true`일 때만 표시
- "사주 분석 시작하기" 버튼: 시간 + 영역 **둘 다 선택**해야 활성화
- 버튼 클릭 → store에 `setTopic(area)`, `setTimeRange(time)`, `setIncludeMonthly(toggle)` 설정 후 `/saju/session`으로 이동

**뒤로 가기 흐름**:
- `saju-select` → `info-input` → `character-select`

**레이아웃**: 데스크탑 5:5 (좌 캐릭터 + 우 선택 UI), 모바일 세로 배치 유지.

---

## 5단계: API 라우트 변경

### `src/app/api/saju/reading/route.ts`

**Request body 확장**:
```typescript
{
  sessionId?: string | null;
  topic: Topic;           // "saju-general" 등 8개
  timeRange: SajuTimeRange; // "this-week" 등 7개
  includeMonthly: boolean;
  characterId?: string;
  userInfo: { ... };
}
```

**`VALID_TOPICS` 변경**: 기존 16개 사주 Topic → 8개 사주 분석영역 Topic

**`resolveCalcOptions` 변경**: `topic` 기반 → `timeRange` + `includeMonthly` 기반:
```typescript
function resolveCalcOptions(timeRange: SajuTimeRange, includeMonthly: boolean) {
  const timeOption = sajuTimeOptions.find(t => t.id === timeRange);
  const opts = { ...timeOption?.calcOption };
  if (includeMonthly && timeOption?.allowMonthly) {
    opts.monthly = true;
  }
  return opts;
}
```

**`buildSajuPrompt` 호출**: `topic` + `timeRange` 둘 다 전달.

---

## 6단계: SajuService 프롬프트 변경

### `src/services/saju/saju-service.ts`

**`buildSajuPrompt` 시그니처 변경**:
```typescript
buildSajuPrompt(topic: Topic, timeRange: SajuTimeRange, sajuResult: SajuResult, userInfo?: { name?: string }): string
```

- `topicLabels`: 8개 분석영역 라벨로 교체
- `topicInstructions`: 8개 분석영역별 해석 지시문으로 교체
- **시간단위 컨텍스트**: `timeRange`에 따라 프롬프트에 "올해 운세", "3년 전망" 등 시간 프레임 명시
- 기존 `additionalSections` (월운/세운/일운) 로직은 `timeRange` 기반으로 분기

---

## 7단계: saju-calculator 변경

### `src/services/saju/saju-calculator.ts`

**`SajuCalculateOptions` 유지** — 기존 인터페이스는 동일:
```typescript
export interface SajuCalculateOptions {
  monthly?: boolean;
  yearlyMulti?: number;
  daily?: boolean;
}
```

변경 없음. `categories.ts`의 `SajuTimeOption.calcOption`이 이 인터페이스에 맞게 정의됨.

---

## 8단계: 세션 페이지 변경

### `src/app/saju/session/page.tsx`

- 유효성 검사에 `timeRange` 추가: `if (!topic || !character || !userInfo || !timeRange)` → redirect
- API 호출 body에 `timeRange`, `includeMonthly` 추가

### `src/app/api/saju/session/route.ts`

- request body에 `timeRange` 수신 및 저장 (있다면)

---

## 수정 파일 목록

| # | 파일 | 작업 |
|---|------|------|
| 1 | `src/types/session.ts` | Topic 유니온: 16개 사주 삭제 → 8개 사주 추가, SajuTimeRange 추가 |
| 2 | `src/data/saju/categories.ts` | 전면 재작성: sajuTimeOptions(7) + sajuAreaOptions(8) |
| 3 | `src/hooks/useSajuSession.ts` | timeRange, includeMonthly 필드 + setter 추가 |
| 4 | `src/app/saju/page.tsx` | 전면 재작성: 3단계(char→info→saju-select), 시간x영역 동시 선택 UI |
| 5 | `src/app/api/saju/reading/route.ts` | timeRange+includeMonthly 수신, resolveCalcOptions 변경 |
| 6 | `src/services/saju/saju-service.ts` | buildSajuPrompt 시그니처+내용 변경, topicLabels/Instructions 교체 |
| 7 | `src/app/saju/session/page.tsx` | timeRange 유효성 검사 + API body 추가 |
| 8 | `CLAUDE.md` | Topic 목록 갱신 (15개), 서비스 흐름 갱신 |
| 9 | `.claude/agents/quality-gate.md` | 토픽 수 갱신 |

---

## 검증

```bash
pnpm tsc --noEmit
pnpm lint
pnpm build
```

- 사주 플로우: 캐릭터 선택 → 정보 입력 → **시간x영역 동시 선택** → 세션 리딩
- 시간단위 7개 모두 선택 가능, 분석영역 8개 모두 선택 가능
- 년단위(올해/내년/3년/5년) 선택 시 "월별 상세" 토글 표시 확인
- 이번 주/이번 달/전체 대운 선택 시 토글 미표시 확인
- 둘 다 선택해야 "시작하기" 버튼 활성화 확인
- 기존 타로 Topic 7개가 영향받지 않는지 확인
- 커밋 + push
