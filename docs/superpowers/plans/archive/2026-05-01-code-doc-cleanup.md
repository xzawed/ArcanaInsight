# 전체 코드·문서 멀티 에이전트 심층 정리 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** SonarCloud CRITICAL 12건 해소 + PR #182·#184 미반영 문서 동기화를 단일 세션에서 완료한다.

**Architecture:** 병렬 가능한 문서 작업과 독립 CC 수정은 동시 실행, 의존성 있는 대형 리팩터링은 순차 처리. 각 단계 후 `pnpm test` 통과 필수. 최종 검증은 type-check + lint + test:coverage + build 전체.

**Tech Stack:** TypeScript strict, Next.js App Router, React hooks, Vitest 2.0, pnpm

---

## 파일 변경 목록

| 파일 | 작업 | 이유 |
|------|------|------|
| `docs/architecture/data-model.md` | 수정 | reviews.ts·stats.ts 삭제 반영 |
| `docs/architecture/system-overview.md` | 수정 | StatsCounter·ReviewCarousel 삭제 반영 |
| `docs/operations/known-issues.md` | 수정 | SonarCloud CRITICAL 표 — PR #184 후 tarot 재측정 |
| `src/hooks/useSSEStream.ts` | 리팩터링 | CC=47 → 15 이하 |
| `src/hooks/useSSEStream.test.ts` | 수정 | 리팩터링 후 커버리지 유지 |
| `src/app/tarot/session/page.tsx` | 리팩터링 (필요 시) | PR #184 잔여 CC 확인 후 처리 |
| `src/services/saju/saju-service.ts` | 리팩터링 | CC=33 → 15 이하 |
| `src/components/common/UserInfoForm.tsx` | 리팩터링 | CC=30 → 15 이하 |
| `src/app/shinjeom/session/page.tsx` | 리팩터링 | CC=21·20 → 15 이하 (2개 함수) |
| `src/app/saju/session/page.tsx` | 리팩터링 | CC=22 → 15 이하 |
| `src/services/core/http-utils.ts` | 리팩터링 | CC=18 → 15 이하 |
| `src/components/common/ReadingText.tsx` | 리팩터링 | CC=18 → 15 이하 |
| `src/components/home/DailyCard.tsx` | 리팩터링 | CC=17 → 15 이하 |
| `docs/superpowers/plans/2026-05-01-code-doc-cleanup-result.md` | 생성 | 결과 및 후속 계획 |
| `CLAUDE.md` | 수정 (필요 시) | 테스트 수 동기화 |

---

## Task 1: 문서 동기화 — data-model·system-overview

**Files:**
- Modify: `docs/architecture/data-model.md:121`
- Modify: `docs/architecture/system-overview.md:118`

- [ ] **Step 1: data-model.md 수정**

`docs/architecture/data-model.md` 121번째 줄:

```markdown
# 변경 전
| 홈 페이지 정적 데이터 | `src/data/home/` (faq.ts, reviews.ts, stats.ts) |

# 변경 후
| 홈 페이지 정적 데이터 | `src/data/home/` (faq.ts) |
```

- [ ] **Step 2: system-overview.md 수정**

`docs/architecture/system-overview.md` 에서 아래 라인 제거:

```
> GenderFilter, StatsCounter, ReviewCarousel 컴포넌트는 `components/home/`에 존재하지만 현재 `page.tsx`에서 미사용
```

StatsCounter·ReviewCarousel은 PR #182에서 삭제됨. GenderFilter는 남아있으므로 별도 언급이 필요하면 해당 컴포넌트만 남긴다:

```markdown
> GenderFilter 컴포넌트는 `components/home/`에 존재하지만 현재 `page.tsx`에서 미사용
```

- [ ] **Step 3: 링크 검증**

```bash
cd "f:/DEVELOPMENT/SOURCE/CLAUDE/ArcanaInsight" && pnpm exec tsx scripts/check-doc-links.ts 2>&1 | tail -3
```

Expected: `검사 통과`

- [ ] **Step 4: 커밋**

```bash
git add docs/architecture/data-model.md docs/architecture/system-overview.md
git commit -m "docs: PR #182 삭제 컴포넌트 반영 — data-model·system-overview 동기화"
```

---

## Task 2: 문서 동기화 — known-issues SonarCloud 표 재측정

**Files:**
- Read: `src/app/tarot/session/page.tsx` (PR #184로 대폭 변경됨)
- Modify: `docs/operations/known-issues.md`

- [ ] **Step 1: tarot/session/page.tsx 현재 CC 측정**

파일을 직접 읽어 `useCallback`·일반 함수 각각의 분기·중첩 수준을 확인한다. PR #184로 572줄로 줄었으므로 구 CC=75 함수들이 어떻게 변경됐는지 파악.

```bash
cd "f:/DEVELOPMENT/SOURCE/CLAUDE/ArcanaInsight" && grep -n "useCallback\|function\|=>" src/app/tarot/session/page.tsx | head -40
```

- [ ] **Step 2: known-issues.md SonarCloud 표 업데이트**

`docs/operations/known-issues.md`의 SonarCloud CRITICAL 현황 표에서:
- tarot/session/page.tsx 관련 행(라인 209, 189, 584)을 PR #184 실제 반영 결과로 수정
- 해소된 항목은 행 삭제, 잔여 항목은 라인 번호·복잡도 수치 갱신

- [ ] **Step 3: 커밋**

```bash
git add docs/operations/known-issues.md
git commit -m "docs: known-issues SonarCloud 표 — PR #184 타로 리팩터링 결과 반영"
```

---

## Task 3: CC 수정 — `src/services/core/http-utils.ts` (CC=18)

**Files:**
- Modify: `src/services/core/http-utils.ts`

- [ ] **Step 1: 파일 전체 읽기**

```bash
cat -n "f:/DEVELOPMENT/SOURCE/CLAUDE/ArcanaInsight/src/services/core/http-utils.ts"
```

19번째 줄 함수(readSseLines 또는 withAbortTimeout)의 복잡도 18 원인 파악.

- [ ] **Step 2: 내부 서브함수 추출**

중첩된 조건·루프를 명명된 서브함수로 추출. 패턴:
- `if (a && b && c)` → `function isValidCondition(x): boolean`
- 중첩 try/catch 블록 → `async function handleXxx(): Promise<void>`
- 타입 가드 조건 → `function isXxx(v: unknown): v is Xxx`

추출 후 원 함수는 고수준 흐름만 남긴다.

- [ ] **Step 3: 테스트 확인**

```bash
cd "f:/DEVELOPMENT/SOURCE/CLAUDE/ArcanaInsight" && pnpm test -- --reporter=verbose 2>&1 | grep -E "PASS|FAIL|http-utils" | head -10
```

Expected: 관련 테스트 PASS

- [ ] **Step 4: 커밋**

```bash
git add src/services/core/http-utils.ts
git commit -m "refactor: http-utils readSseLines 인지 복잡도 감소 (CC 18→15 이하)"
```

---

## Task 4: CC 수정 — `src/components/common/ReadingText.tsx` (CC=18)

**Files:**
- Modify: `src/components/common/ReadingText.tsx`

- [ ] **Step 1: 파일 읽기**

```bash
cat -n "f:/DEVELOPMENT/SOURCE/CLAUDE/ArcanaInsight/src/components/common/ReadingText.tsx"
```

9번째 줄 함수 복잡도 18 원인 파악 (조건부 렌더링 중첩 또는 이벤트 핸들러 복잡도).

- [ ] **Step 2: 렌더 로직 분리**

컴포넌트 내 복잡한 렌더 블록을 별도 서브컴포넌트 또는 순수 함수로 추출:
- 조건부 렌더링 → `function renderXxx(props): ReactNode`
- 복잡한 className 계산 → `function getClassName(state): string`

파일 내 위(컴포넌트 선언 위)에 배치, export 불필요.

- [ ] **Step 3: 테스트 확인**

```bash
cd "f:/DEVELOPMENT/SOURCE/CLAUDE/ArcanaInsight" && pnpm test -- --reporter=verbose 2>&1 | grep -E "PASS|FAIL|ReadingText" | head -10
```

- [ ] **Step 4: 커밋**

```bash
git add src/components/common/ReadingText.tsx
git commit -m "refactor: ReadingText 인지 복잡도 감소 (CC 18→15 이하)"
```

---

## Task 5: CC 수정 — `src/components/home/DailyCard.tsx` (CC=17)

**Files:**
- Modify: `src/components/home/DailyCard.tsx`

- [ ] **Step 1: 파일 읽기**

```bash
cat -n "f:/DEVELOPMENT/SOURCE/CLAUDE/ArcanaInsight/src/components/home/DailyCard.tsx"
```

22번째 줄 함수 복잡도 17 원인 파악.

- [ ] **Step 2: 복잡도 분산**

206줄 컴포넌트에서 복잡한 로직 분리:
- 카드 표시 조건 로직 → `function shouldShowCard(state): boolean`
- 애니메이션 상태 계산 → `function getAnimationState(phase): AnimState`

- [ ] **Step 3: 테스트 확인**

```bash
cd "f:/DEVELOPMENT/SOURCE/CLAUDE/ArcanaInsight" && pnpm test -- --reporter=verbose 2>&1 | grep -E "PASS|FAIL|DailyCard" | head -10
```

- [ ] **Step 4: 커밋**

```bash
git add src/components/home/DailyCard.tsx
git commit -m "refactor: DailyCard 인지 복잡도 감소 (CC 17→15 이하)"
```

---

## Task 6: CC 수정 — `src/app/shinjeom/session/page.tsx` (CC=21·20)

**Files:**
- Modify: `src/app/shinjeom/session/page.tsx`

- [ ] **Step 1: 파일 읽기**

```bash
cat -n "f:/DEVELOPMENT/SOURCE/CLAUDE/ArcanaInsight/src/app/shinjeom/session/page.tsx"
```

69번째·165번째 두 함수(각 CC=20·21) 구조 파악.

- [ ] **Step 2: 각 함수의 복잡도 분산**

두 useCallback/함수 각각에서:
- SSE 이벤트 처리 분기 → `function handleSseEvent(event): void`
- 상태 전환 로직 → `function getNextPhase(current, event): Phase`
- 에러 처리 블록 → `function handleError(err): void`

CLAUDE.md 주의사항 7번 SSE fire-and-forget 패턴 유지:
```typescript
void saveFn(args).catch(e => console.error("[shinjeom]", e))
```

- [ ] **Step 3: 테스트 확인**

```bash
cd "f:/DEVELOPMENT/SOURCE/CLAUDE/ArcanaInsight" && pnpm test -- --reporter=verbose 2>&1 | grep -E "PASS|FAIL|shinjeom" | head -10
```

- [ ] **Step 4: 커밋**

```bash
git add src/app/shinjeom/session/page.tsx
git commit -m "refactor: shinjeom/session 인지 복잡도 감소 (CC 21·20→15 이하)"
```

---

## Task 7: CC 수정 — `src/app/saju/session/page.tsx` (CC=22)

**Files:**
- Modify: `src/app/saju/session/page.tsx`

- [ ] **Step 1: 파일 읽기**

```bash
cat -n "f:/DEVELOPMENT/SOURCE/CLAUDE/ArcanaInsight/src/app/saju/session/page.tsx"
```

197번째 줄 함수 CC=22 원인 파악.

- [ ] **Step 2: 서브함수 추출**

사주 세션 특유의 로직:
- 사용자 정보 유효성 검사 분기 → `function validateSajuInput(info): ValidationResult`
- 진행 단계 전환 → `function getNextSajuPhase(current, event): SajuPhase`
- SSE 이벤트 핸들러 내부 분기 → `function handleSajuSseEvent(data): void`

CLAUDE.md 주의사항 7번 SSE fire-and-forget 패턴 유지.

- [ ] **Step 3: 테스트 확인**

```bash
cd "f:/DEVELOPMENT/SOURCE/CLAUDE/ArcanaInsight" && pnpm test -- --reporter=verbose 2>&1 | grep -E "PASS|FAIL|saju" | head -10
```

- [ ] **Step 4: 커밋**

```bash
git add src/app/saju/session/page.tsx
git commit -m "refactor: saju/session 인지 복잡도 감소 (CC 22→15 이하)"
```

---

## Task 8: CC 수정 — `src/components/common/UserInfoForm.tsx` (CC=30)

**Files:**
- Modify: `src/components/common/UserInfoForm.tsx`

- [ ] **Step 1: 파일 읽기**

```bash
cat -n "f:/DEVELOPMENT/SOURCE/CLAUDE/ArcanaInsight/src/components/common/UserInfoForm.tsx"
```

63번째 줄 함수 CC=30 원인 파악. 318줄 파일이므로 유효성 검사 로직이 거대할 가능성.

- [ ] **Step 2: 유효성 검사 분리**

폼 검사 로직을 컴포넌트 밖 순수 함수로 추출:

```typescript
// 파일 상단 (컴포넌트 밖)
function validateName(name: string): string | null { ... }
function validateBirthDate(date: string): string | null { ... }
function validateBirthHour(hour: string | null): string | null { ... }
function validateGender(gender: string | null): string | null { ... }

function validateUserInfo(info: UserInfo): Record<string, string> {
  const errors: Record<string, string> = {}
  const nameErr = validateName(info.name)
  if (nameErr) errors.name = nameErr
  // ...
  return errors
}
```

컴포넌트 내 핸들러는 `validateUserInfo`만 호출.

- [ ] **Step 3: 테스트 확인**

```bash
cd "f:/DEVELOPMENT/SOURCE/CLAUDE/ArcanaInsight" && pnpm test -- --reporter=verbose 2>&1 | grep -E "PASS|FAIL|UserInfo" | head -10
```

- [ ] **Step 4: 커밋**

```bash
git add src/components/common/UserInfoForm.tsx
git commit -m "refactor: UserInfoForm 유효성 검사 순수 함수 분리 (CC 30→15 이하)"
```

---

## Task 9: CC 수정 — `src/services/saju/saju-service.ts` (CC=33)

**Files:**
- Modify: `src/services/saju/saju-service.ts`

- [ ] **Step 1: 파일 읽기**

```bash
cat -n "f:/DEVELOPMENT/SOURCE/CLAUDE/ArcanaInsight/src/services/saju/saju-service.ts"
```

57번째 줄 함수 CC=33 원인 파악. 204줄 파일, SSE 스트리밍 서비스.

- [ ] **Step 2: SSE 파이프라인 분리**

핵심 스트리밍 함수에서 단계별 로직 분리:

```typescript
// 스트림 파싱
async function* parseStream(response: Response): AsyncGenerator<string> { ... }

// 청크 처리
function processChunk(chunk: string, state: StreamState): StreamState { ... }

// 완성 감지
function isStreamComplete(state: StreamState): boolean { ... }
```

CLAUDE.md 주의사항 7번: 스트림 완료 후 DB 저장은 반드시 fire-and-forget:
```typescript
void saveReading(args).catch(e => console.error("[saju-service]", e))
```

- [ ] **Step 3: 테스트 확인**

```bash
cd "f:/DEVELOPMENT/SOURCE/CLAUDE/ArcanaInsight" && pnpm test -- --reporter=verbose 2>&1 | grep -E "PASS|FAIL|saju-service" | head -10
```

Expected: 기존 saju-service 테스트 모두 PASS

- [ ] **Step 4: 커밋**

```bash
git add src/services/saju/saju-service.ts
git commit -m "refactor: saju-service SSE 파이프라인 분리 (CC 33→15 이하)"
```

---

## Task 10: CC 수정 — `src/hooks/useSSEStream.ts` (CC=47)

**Files:**
- Modify: `src/hooks/useSSEStream.ts`
- Modify: `src/hooks/useSSEStream.test.ts`

> 가장 복잡한 리팩터링. 훅의 반환 타입·인터페이스는 절대 변경하지 않는다.

- [ ] **Step 1: 파일 전체 읽기**

```bash
cat -n "f:/DEVELOPMENT/SOURCE/CLAUDE/ArcanaInsight/src/hooks/useSSEStream.ts"
cat -n "f:/DEVELOPMENT/SOURCE/CLAUDE/ArcanaInsight/src/hooks/useSSEStream.test.ts"
```

훅의 반환 타입과 현재 테스트 커버 범위 파악.

- [ ] **Step 2: 내부 로직 서브함수로 분리**

훅 파일 내 (export 하지 않는) 순수 함수들로 분리:

```typescript
// 훅 파일 내부 (export 없음)
function createAbortController(): AbortController { ... }

function buildEventSource(url: string, signal: AbortSignal): EventSource { ... }

function handleStreamEvent(
  event: MessageEvent,
  handlers: StreamHandlers
): void { ... }

function handleStreamError(
  event: Event,
  onError: (err: Error) => void
): void { ... }

async function processStreamResponse(
  response: Response,
  handlers: StreamHandlers,
  signal: AbortSignal
): Promise<void> { ... }
```

훅 본체(`useSSEStream`)는 이 함수들을 조합하는 고수준 로직만 담는다.

- [ ] **Step 3: 반환 타입 동일성 확인**

```bash
cd "f:/DEVELOPMENT/SOURCE/CLAUDE/ArcanaInsight" && pnpm type-check 2>&1 | head -20
```

Expected: 오류 0건

- [ ] **Step 4: 기존 테스트 통과 확인**

```bash
cd "f:/DEVELOPMENT/SOURCE/CLAUDE/ArcanaInsight" && pnpm test -- --reporter=verbose 2>&1 | grep -E "PASS|FAIL|useSSEStream" | head -10
```

Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add src/hooks/useSSEStream.ts src/hooks/useSSEStream.test.ts
git commit -m "refactor: useSSEStream 내부 파이프라인 분리 (CC 47→15 이하)"
```

---

## Task 11: CC 수정 — `src/app/tarot/session/page.tsx` 잔여 CC 확인 및 처리

**Files:**
- Read: `src/app/tarot/session/page.tsx`
- Modify (필요 시): `src/app/tarot/session/page.tsx`

- [ ] **Step 1: PR #184 이후 현재 복잡도 측정**

파일을 읽어 각 useCallback·함수의 분기 수를 직접 셈:

```bash
cat -n "f:/DEVELOPMENT/SOURCE/CLAUDE/ArcanaInsight/src/app/tarot/session/page.tsx"
```

SonarCloud 기준 CC = 기본 1 + 분기(if/else/&&/||/?./ ternary/for/while/catch) 누적.

- [ ] **Step 2: CC > 15인 함수 처리**

잔여 CC > 15 함수가 있을 경우에만 수정:
- 카드 선택 로직 → `function handleCardSelect(index, state): SelectionState`
- 결과 파싱 → `function parseReadingResult(raw: string): ParsedResult`
- 에러 분기 → `function classifyError(err: unknown): ErrorType`

CC ≤ 15이면 이 Task는 skip하고 커밋 없이 다음으로 진행.

- [ ] **Step 3: 테스트 통과 확인**

```bash
cd "f:/DEVELOPMENT/SOURCE/CLAUDE/ArcanaInsight" && pnpm test -- --reporter=verbose 2>&1 | grep -E "PASS|FAIL|tarot" | head -15
```

- [ ] **Step 4: 수정 있을 때만 커밋**

```bash
git add src/app/tarot/session/page.tsx
git commit -m "refactor: tarot/session 잔여 인지 복잡도 감소"
```

---

## Task 12: 최종 검증

**Files:**
- Modify (필요 시): `CLAUDE.md` (테스트 수 동기화)
- Create: `docs/superpowers/plans/2026-05-01-code-doc-cleanup-result.md`

- [ ] **Step 1: 전체 검증 실행**

```bash
cd "f:/DEVELOPMENT/SOURCE/CLAUDE/ArcanaInsight"
pnpm type-check 2>&1 | tail -5
pnpm lint 2>&1 | tail -5
pnpm test:coverage 2>&1 | tail -20
pnpm build 2>&1 | tail -10
```

Expected:
- type-check: 오류 0건
- lint: 오류 0건
- test: 672개+, statements 98%+
- build: ✓ Compiled successfully

- [ ] **Step 2: 문서 스크립트 검증**

```bash
pnpm exec tsx scripts/sync-test-count.ts 2>&1
pnpm exec tsx scripts/check-doc-links.ts 2>&1 | tail -3
pnpm exec tsx scripts/check-env-docs.ts 2>&1 | tail -5
```

Expected: 모두 통과

- [ ] **Step 3: 실패 항목 있을 경우 롤백**

특정 파일에서 test/type-check 실패 시:
```bash
git checkout -- <실패한_파일>
pnpm test 2>&1 | tail -5  # 롤백 후 재확인
```

- [ ] **Step 4: 결과 문서 작성**

`docs/superpowers/plans/2026-05-01-code-doc-cleanup-result.md` 생성:

```markdown
# 코드·문서 심층 정리 결과 (2026-05-01)

## 완료 항목
- (각 Task별 실제 완료 내용 기재)

## SonarCloud CRITICAL 해소 현황
| 파일 | 구 CC | 신 CC | 상태 |
|------|-------|-------|------|
| (실제 결과 기재) |

## 잔여 항목 및 이유
- (해소 불가 항목 및 이유)

## 후속 권장 작업
1. SonarCloud 재분석 트리거 (PR 머지 후 자동 실행)
2. (추가 발견 사항)
```

- [ ] **Step 5: 최종 커밋**

```bash
git add CLAUDE.md docs/superpowers/plans/2026-05-01-code-doc-cleanup-result.md
git commit -m "chore: 코드·문서 심층 정리 완료 — CLAUDE.md 동기화 + 결과 문서"
```

---

## 성공 기준 체크리스트

- [ ] `pnpm type-check` — 오류 0건
- [ ] `pnpm lint` — 오류 0건
- [ ] `pnpm test:coverage` — 672개+, statements 98%+
- [ ] `pnpm build` — 성공
- [ ] `check-doc-links` — 깨진 링크 0건
- [ ] SonarCloud CRITICAL — 0건 (또는 PR #184 기해소분 포함 최소화)
- [ ] `docs/superpowers/plans/2026-05-01-code-doc-cleanup-result.md` 생성
