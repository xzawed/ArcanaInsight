# 사주 프로세스 재설계: 시간단위 × 분석영역 매트릭스

**날짜**: 2026-04-02  
**상태**: 구현 완료  

---

## 배경 및 동기

기존 사주 프로세스는 3개 카테고리(시간기반/관계/심층) → 16개 세부 주제를 순차 선택하는 구조였다. 이 방식은:
- 카테고리를 먼저 골라야 주제를 볼 수 있어 탐색 UX가 비효율적
- "시간" 개념과 "분야" 개념이 혼재된 주제 목록 (예: 이번주 일운 + 성격 심층 분석이 동등한 레벨)
- 16개 Topic이 하나의 유니온 타입에 평탄하게 쌓여 확장 시 Topic 폭발 위험

새 구조는 **시간 차원**과 **분야 차원**을 분리하여 사용자가 한 화면에서 두 축을 동시에 선택하도록 변경한다.

---

## 설계 결정

### 핵심: 방식 B — 분석영역을 Topic, 시간단위를 별도 파라미터로

| 방식 | 설명 | 결과 |
|------|------|------|
| A | 조합 Topic 문자열 (`saju-love-this-year`) | Topic 56개, 조합 폭발 |
| **B** | 분석영역 Topic 8개 + 별도 `SajuTimeRange` 타입 | **선택됨** |
| C | UI-only 매핑, Topic 유지 | 타입 안전성 없음 |

방식 B를 선택한 이유: Topic 유니온을 작게 유지하면서 시간 차원을 API 레벨까지 완전히 전달 가능.

---

## 아키텍처

### 타입 시스템

```typescript
// src/types/session.ts

// Topic: 타로 7개 + 사주 분석영역 8개 = 15개
export type Topic =
  | "love" | "love-single" | "love-couple" | "finance" | "career" | "health" | "general"
  | "saju-general" | "saju-love-single" | "saju-love-couple"
  | "saju-career" | "saju-health" | "saju-personality"
  | "saju-compatibility" | "saju-auspicious-date";

// 시간단위: 7개 (Topic과 독립)
export type SajuTimeRange =
  | "this-week" | "this-month" | "this-year" | "next-year"
  | "three-year" | "five-year" | "full-fortune";
```

### 데이터 레이어

`src/data/saju/categories.ts` — 기존 3카테고리 구조 전면 교체:

```typescript
export interface SajuTimeOption {
  id: SajuTimeRange;
  label: string; icon: string; desc: string;
  allowMonthly: boolean;       // 년단위만 true
  calcOption: SajuCalculateOptions;  // calculator에 직접 전달
}

export interface SajuAreaOption {
  id: Topic;  // saju-* Topic만
  label: string; icon: string; desc: string;
}
```

`getRequiresData()` 헬퍼 삭제 → `SajuTimeOption.calcOption`이 직접 대체.

### 상태 관리

`src/hooks/useSajuSession.ts`에 추가:
- `timeRange: SajuTimeRange | null`
- `includeMonthly: boolean`
- `setTimeRange()`, `setIncludeMonthly()`
- `reset()`에 초기값 포함

### UI 흐름

```
캐릭터 선택 → 정보 입력 → 시간단위×분석영역 선택 → 리딩
  (character-select)  (info-input)    (saju-select)        (session)
```

`saju-select` 단계의 UI 구조 (상하 2단):
1. 시간단위 버튼 7개 (태그 형태, 가로 랩)
2. 월별 상세 토글 (년단위 선택 시에만 표시)
3. 분석영역 카드 8개 (2열 그리드)
4. 시작 버튼 (시간+영역 둘 다 선택해야 활성화)

### API 변경

`POST /api/saju/reading` 요청 바디:
```typescript
{
  topic: Topic;           // 분석영역 8개 중 1개
  timeRange: SajuTimeRange;
  includeMonthly: boolean;
  characterId?: string;
  userInfo: { ... };
}
```

`resolveCalcOptions(timeRange, includeMonthly)` — `sajuTimeOptions`에서 `calcOption` 조회 후 `includeMonthly` 반영.

### 프롬프트 변경

`SajuService.buildSajuPrompt(topic, timeRange, sajuResult, userInfo)`:
- 상담 주제에 `시간 범위: {label}({desc})` 추가
- 8개 분석영역별 `topicInstructions` 재작성
- `timeContext` 문자열로 AI에 시간 프레임 명시

---

## 수정 파일 목록

| 파일 | 변경 내용 |
|------|---------|
| `src/types/session.ts` | Topic 16→8개, SajuTimeRange 신설 |
| `src/data/saju/categories.ts` | 전면 재작성 |
| `src/hooks/useSajuSession.ts` | timeRange, includeMonthly 추가 |
| `src/app/saju/page.tsx` | 3단계 위저드 + 매트릭스 UI |
| `src/app/api/saju/reading/route.ts` | timeRange 기반 분기 |
| `src/services/saju/saju-service.ts` | buildSajuPrompt 시그니처 변경 |
| `src/app/saju/session/page.tsx` | timeRange 유효성 검사 + body |
| `src/services/core/prompt-builder.ts` | 삭제된 Topic 참조 제거 |
| `CLAUDE.md` | Topic 목록 15개, 서비스 흐름 갱신 |
| `.claude/agents/quality-gate.md` | 토픽 수 갱신 |

---

## 검증 결과

```
pnpm tsc --noEmit   → 0 error
pnpm lint           → 0 error, 0 warning
pnpm build          → 빌드 성공
```

커밋: `feat: 사주 프로세스 전면 재설계 — 시간단위×분석영역 매트릭스 선택` (cc545bd)
