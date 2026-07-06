# 리딩 신뢰성 기술부채 해소 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** parseError를 관측 가능하게 만들고(②), 사주·신점 리딩 스키마에서 중복 섹션을 제거해(①) 토큰 압박·중복 UX·파서 방어 복잡도를 해소한다.

**Architecture:** ② 통합 grep 마커(`logReadingParseError`)를 parseError 브랜치에 배선. ① `overallReading`(【】 헤더 서사)을 정본으로 두고 `sajuSections`/`shinjeomSections`를 프롬프트·타입·파서·영속·UI·i18n에서 제거. 마이그 024 컬럼은 drop하지 않음(구 행 보존, UI만 미사용). 정본은 [스펙](../specs/2026-07-07-reading-reliability-debt-design.md).

**Tech Stack:** TypeScript strict, Next.js 16 App Router, Vitest, 자체 i18n(ko/en/ja).

## Global Constraints

- parseError 마커·섹션 관련 DB 호출은 **best-effort, throw 금지**(SSE 스트림 가용성 보호). done 전송 이후.
- 마이그 024 컬럼(`saju_sections`/`shinjeom_sections`) **drop 금지**. 신규 마이그 없음.
- max_tokens 상한 **유지**(`computeSajuReadingMaxTokens`·`SHINJEOM_TOKENS_FINAL` 불변).
- 커버리지 임계값 유지: branches 90 / functions 97 / lines·statements 98 (`vitest.config.ts`).
- Sonar는 `sonar.sources=src`만 분석 — scripts/ 무관. src 파일 삭제 시 `sonar-project.properties` exclusions에서도 제거.
- 상수/스키마 변경 시 이를 기댓값으로 쓰는 테스트 동시 수정 (`grep -rn "sajuSections\|shinjeomSections" src/`).
- i18n 키 변경은 ko/en/ja 3개 동시. `pnpm i18n:check` 통과.
- ② → ① 순서. 두 묶음은 별도 커밋(원하면 별도 PR).

---

## Phase ② — parseError 관측성

### Task 1: `logReadingParseError` 헬퍼 + 3 라우트 배선

**Files:**
- Modify: `src/lib/db/reading-saver.ts` (`logReadingSaveFailure`(35-45) 아래에 추가)
- Modify: `src/app/api/tarot/reading/route.ts`, `src/app/api/saju/reading/route.ts`, `src/app/api/shinjeom/message/route.ts` (parseError 시 기존 `console.warn("[service] 부분 파싱", …)` 위치)
- Test: `src/__tests__/api/{tarot-reading,saju-reading,shinjeom-message}.test.ts`

**Interfaces:**
- Produces: `logReadingParseError(service: "tarot"|"saju"|"shinjeom"|"shinjeom-message", parseError: string, sessionId: string | null): void`

- [ ] **Step 1: 헬퍼 추가** — `reading-saver.ts`에 `logReadingSaveFailure` 바로 아래:

```ts
/** parseError(부분 파싱/무결과)를 단일 grep 마커로 구조적 로깅한다.
 *  `[reading-parse-error]` 마커로 지배적 실패 모드(truncated/missing_fields/fallback_text/invalid_json)를
 *  운영 로그에서 추적·집계하기 위한 관측성 헬퍼. best-effort — 절대 throw하지 않는다. */
export function logReadingParseError(
  service: "tarot" | "saju" | "shinjeom" | "shinjeom-message",
  parseError: string,
  sessionId: string | null,
): void {
  console.warn(
    `[reading-parse-error] service=${service} type=${parseError} session=${sessionId ?? "null"}`,
  );
}
```

- [ ] **Step 2: 3 라우트 배선** — 각 라우트에서 `result.parseError`가 존재하는 분기(현재 `console.warn("[<service>] 부분 파싱", …)`)를 `logReadingParseError(<service>, result.parseError, sessionId ?? null)` 호출로 교체(import 추가). 위치는 `done` 이벤트 전송 이후, 저장 게이트와 무관하게 parseError면 항상 호출. import 예: `import { …, logReadingParseError } from "@/lib/db/reading-saver";`

- [ ] **Step 3: 테스트** — 각 라우트 테스트에 parseError 결과를 mock하고 마커가 호출되는지 단언. 기존 "parseError 시 save 미호출" 단언(saju:373 / shinjeom:357 / tarot:383) 근처에 추가:

```ts
it("parseError 시 [reading-parse-error] 마커를 남긴다", async () => {
  const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  // parseResult가 parseError를 반환하도록 mock-ai 설정 (기존 부분파싱 케이스 재사용)
  const { POST } = await setup(/* parseError 유발 응답 */);
  const res = await POST(makePostRequest({ /* … */ }));
  await readSSEStream(res);
  expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("[reading-parse-error]"));
  warnSpy.mockRestore();
});
```

- [ ] **Step 4: 검증** — `pnpm test:coverage` 통과, `grep -rn "부분 파싱" src/app/api`로 잔여 ad-hoc warn 0 확인.
- [ ] **Step 5: 커밋** — `git commit -m "feat(observability): parseError 통합 grep 마커 [reading-parse-error] 배선"`

### Task 2: 문서 정정 (db-abstraction.md stale)

**Files:** Modify `docs/architecture/db-abstraction.md:77`

- [ ] **Step 1** — `022_failed_readings_dlq.sql … ⚠️ 운영 DB 미적용` → `… ✅ 운영 DB 적용 완료(2026-07-01, Supabase MCP 실측 확인)`로 정정(known-issues.md:26·실측 DB와 동기). 같은 파일에 마이그 024 컬럼을 "deprecated·미사용(섹션 스키마 폐지, ①)" 표기 예고 주석은 Task 11에서 반영.
- [ ] **Step 2: 검증** — `pnpm check:doc-links` 통과.
- [ ] **Step 3: 커밋** — `git commit -m "docs(db): 마이그 022 상태 stale 정정 (운영 적용 완료)"`

---

## Phase ① — 스키마 중복 제거

> 순서: 타입 → 사주 서비스 → 신점 서비스 → 파서 정리 → 영속 → UI → i18n → eval 하네스 → 최종 정리. 각 태스크 후 `pnpm type-check`로 타입 파급 확인.

### Task 3: 타입에서 섹션 제거

**Files:** Modify `src/types/service.ts`

- [ ] **Step 1** — `SajuSections`(5-10)·`ShinjeomSections`(12-17) 인터페이스 삭제, `ReadingResult`에서 `sajuSections?`(36)·`shinjeomSections?`(37) 필드 삭제.
- [ ] **Step 2: 검증** — `pnpm type-check` 실행 → 섹션 참조하는 모든 곳이 타입 에러로 드러남(다음 태스크들의 작업 목록). 에러 목록 기록.
- [ ] **Step 3: 커밋(부분)** — 타입만 커밋하면 컴파일 깨지므로 Task 3~5는 한 커밋으로 묶어 진행(타입→서비스 동시). 이 태스크는 커밋하지 않고 Task 5 끝에 함께 커밋.

### Task 4: 사주 서비스 (프롬프트 + 파서)

**Files:** Modify `src/services/saju/saju-service.ts`

- [ ] **Step 1: getSystemPrompt** — JSON 스키마(254-265)에서 `"sajuSections": { … }` 블록(255-260) 삭제. `overallReading`(262, 【】 헤더 서사)·`topicReading`(263)·`advice`(264)·`${contract.schemaLine}`(directAnswer, 261) 유지. anti-nesting 지시(252 "…는 sajuSections 바깥의…")를 섹션 무관 문구로 축소(예: "overallReading·topicReading·advice·directAnswer는 각각 독립된 top-level 문자열 필드입니다."). 트레일링 콤마 금지(253) 유지.
- [ ] **Step 2: buildSajuPrompt** — 분량 기준(310-319)에서 `sajuSections.structure/elements/fortune/guidance` 4줄(313-316) 삭제. overallReading(317)에 "일간→오행→용신→대운→세운→전망 전 구조를 각 【】 소제목으로" 깊이가 유지되도록 문구 보강(중복 제거지 깊이 축소 아님 — 최소 8문단 유지).
- [ ] **Step 3: parseResult** — `promoteNestedFields(parsed, "sajuSections", …)`(327) 삭제, sajuSections 추출 블록(339-348) 삭제. 나머지(overallReading/topicReading/advice/directAnswer 추출, missing_fields 판정 350, fallback 356-361) 유지. `SajuSections` import 제거.
- [ ] **Step 4: 검증** — `pnpm type-check` (saju-service.ts 에러 해소 확인).

### Task 5: 신점 서비스 (프롬프트 + 파서)

**Files:** Modify `src/services/shinjeom/shinjeom-service.ts`

- [ ] **Step 1: 프롬프트(121-132)** — `"shinjeomSections": { … }` 블록 삭제. `directAnswer`·`overallReading`(129, 7개 【】)·`topicReading`·`advice`(131) 유지. anti-nesting(136)을 섹션 무관 문구로 축소, 트레일링 콤마 금지(137) 유지. 분량 기준에 shinjeomSections 줄이 있으면 삭제, overallReading 깊이 유지 문구 보강.
- [ ] **Step 2: parseResult(151-179)** — `promoteNestedFields(parsed, "shinjeomSections", …)` 삭제, shinjeomSections 추출 블록 삭제. missing_fields 판정(177)·fallback 유지. `ShinjeomSections` import 제거.
- [ ] **Step 3: 검증** — `pnpm type-check` (전체 0 error 목표).
- [ ] **Step 4: 커밋(Task 3~5 묶음)** — `git commit -m "refactor(reading): 사주·신점 스키마에서 중복 섹션 제거 (타입·프롬프트·파서)"`

### Task 6: `promoteNestedFields` 정리

**Files:** Modify `src/services/core/text-cleaner.ts`, `src/services/core/text-cleaner.test.ts`

- [ ] **Step 1: 사용처 확인** — `grep -rn "promoteNestedFields" src/`. Task 4·5에서 제거 후 다른 사용처가 없으면 함수(149-164) 삭제. 사용처가 남아 있으면 함수 유지(그 경우 이 태스크 스킵하고 기록).
- [ ] **Step 2: 테스트 정리** — 함수 삭제 시 `text-cleaner.test.ts`의 `promoteNestedFields` describe 블록 삭제.
- [ ] **Step 3: 검증** — `pnpm exec vitest run src/services/core/text-cleaner` 통과.
- [ ] **Step 4: 커밋** — `git commit -m "refactor(text-cleaner): 미사용 promoteNestedFields 제거 (섹션 중첩 방어 불필요)"`

### Task 7: 영속 정리 (persistReadingSections)

**Files:** Modify `src/lib/db/reading-saver.ts`, `src/app/api/saju/reading/route.ts`, `src/app/api/shinjeom/message/route.ts`, `src/lib/db/reading-saver.test.ts`

**Interfaces:**
- Removes: `persistReadingSections`(168-180), `SECTIONS_COLUMN`(156-160). `persistDirectAnswer`·`saveTarotReading` 등은 유지.

- [ ] **Step 1** — `persistReadingSections`·`SECTIONS_COLUMN` 삭제. `SajuSections`/`ShinjeomSections` import 제거.
- [ ] **Step 2: 라우트** — saju route·shinjeom route에서 `persistReadingSections(...)` 호출 제거(import 정리). 본 insert(overall/topic/advice)·`persistDirectAnswer` 호출 유지.
- [ ] **Step 3: 테스트** — `reading-saver.test.ts`의 `persistReadingSections` 테스트 삭제.
- [ ] **Step 4: 검증** — `pnpm type-check && pnpm exec vitest run src/__tests__/lib/reading-saver`.
- [ ] **Step 5: 커밋** — `git commit -m "refactor(reading-saver): persistReadingSections 제거 (섹션 미생성)"`

### Task 8: UI — 섹션 블록 제거

**Files:**
- Modify: `src/app/(immersive)/saju/session/page.tsx`(섹션 렌더 96-123 영역), `src/app/(site)/saju/result/[id]/*`(92-139, hasSajuSections 62·102), `src/app/(site)/shinjeom/result/[id]/*`(50-97), `src/app/(immersive)/shinjeom/session/*`(섹션 렌더 있으면)
- Delete: `src/components/session/ReadingSectionBlock.tsx` + 그 테스트 (사주·신점 전용, 미사용화)

- [ ] **Step 1: 실측** — `grep -rn "ReadingSectionBlock\|sajuSections\|shinjeomSections\|hasSajuSections\|hasShinjeomSections" src/app src/components`로 렌더/분기 전수 파악.
- [ ] **Step 2: 렌더 제거** — saju/shinjeom 세션·result 페이지에서 `ReadingSectionBlock` 렌더와 `hasSajuSections`/`hasShinjeomSections` 분기·데이터 조회 제거. `overallReading`·`topicReading`·`advice`·`directAnswer`(`ResultTextCard`/`ReadingText`) 렌더는 유지 → overallReading의 【】가 스캔성 담당.
- [ ] **Step 3: 컴포넌트 삭제** — 잔여 사용처 0 확인 후 `ReadingSectionBlock.tsx`·테스트 삭제. `sonar-project.properties`의 해당 경로 exclusions 제거.
- [ ] **Step 4: 검증** — `pnpm type-check && pnpm lint`. `grep -rn "ReadingSectionBlock" src/` → 0.
- [ ] **Step 5: 커밋** — `git commit -m "refactor(ui): 사주·신점 결과에서 중복 ReadingSectionBlock 제거 (overallReading 정본)"`

### Task 9: i18n 섹션 키 제거

**Files:** Modify `src/i18n/translations/{ko,en,ja}/index.ts`, `src/i18n/translations/shared/keys.ts`, (필요시) `src/services/core/prompt-builder.ts:20-21`

- [ ] **Step 1: 실측** — `grep -rn "section" src/i18n/translations`로 `saju.section.*`·`shinjeom.section.*`(ReadingSectionBlock 라벨) 키 식별.
- [ ] **Step 2: 제거** — `keys.ts` 타입 + ko/en/ja 3개 사전에서 해당 키 삭제. `prompt-builder.ts` LANGUAGE_INSTRUCTIONS가 섹션 필드명을 명시하면 정리.
- [ ] **Step 3: 검증** — `pnpm i18n:check` 통과(drift 0), `pnpm type-check`.
- [ ] **Step 4: 커밋** — `git commit -m "i18n: ReadingSectionBlock 섹션 라벨 키 제거 (섹션 스키마 폐지)"`

### Task 10: eval 하네스 계약 갱신

**Files:** Modify `scripts/eval-reading.ts`

- [ ] **Step 1** — `verifyContract`의 saju/shinjeom 분기(현재 `sectionsComplete(result.sajuSections, [...])` / `shinjeomSections`)를 제거하고, 공통 계약(directAnswer·overallReading·advice)에 **`topicReading` 존재** 검증을 추가. saju/shinjeom 전용 섹션 검증 삭제. 타로 3-섹션(cardInterpretations) 검증은 유지. 미사용이 된 `sectionsComplete` 헬퍼 제거.
- [ ] **Step 2: 검증** — `pnpm exec tsc --noEmit scripts/eval-reading.ts --skipLibCheck --module esnext --moduleResolution bundler --target es2022 --lib es2022,dom` 통과. (프로덕션 실행은 배포 후 Task 11 검증에서)
- [ ] **Step 3: 커밋** — `git commit -m "test(eval-reading): 섹션 폐지 반영 — overallReading/topicReading 계약으로 갱신"`

### Task 11: 최종 정리 · 전수 검증

**Files:** `sonar-project.properties`, `docs/architecture/db-abstraction.md`, `docs/architecture/data-model.md`, `CLAUDE.md`, `src/services/CLAUDE.md`, `.claude/rules/services.md`, 잔여 테스트/mock

- [ ] **Step 1: 잔여 참조 전수** — `grep -rn "sajuSections\|shinjeomSections\|SajuSections\|ShinjeomSections\|promoteNestedFields\|persistReadingSections\|ReadingSectionBlock" src/ scripts/`. `src/test-helpers/mock-ai.ts`의 섹션 mock 필드 등 잔여 전부 제거. 결과가 0(또는 의도적 잔존만).
- [ ] **Step 2: 문서 동기화** — `db-abstraction.md`(024 컬럼 deprecated 표기), `data-model.md`·`CLAUDE.md`·`src/services/CLAUDE.md`·`.claude/rules/services.md`의 sajuSections/shinjeomSections 언급을 "폐지(overallReading 정본)"로 정정. `known-issues.md`의 리딩 스키마 중복 항목 해소 표기.
- [ ] **Step 3: 전체 게이트** — `pnpm type-check && pnpm lint && pnpm test:coverage && pnpm check:doc-links && pnpm i18n:check` 전부 통과.
- [ ] **Step 4: 커밋** — `git commit -m "chore(reading): 섹션 폐지 잔여 정리 + 문서 동기화"`

---

## 배포 후 검증 (머지·배포 이후)

- [ ] `EVAL_BASE_URL=<prod> pnpm eval:reading` — 3서비스 갱신 계약 통과 확인.
- [ ] 사주·신점 반복 호출(재현) + `grep "[reading-parse-error]"` 로그로 truncation/missing_fields 기저율이 현 기준(사주~21%·신점67%) 대비 실제로 내려가는지 실측. 감소폭은 사전 단정하지 않음.

## Self-Review (작성자 확인 완료)

- **스펙 커버리지**: ②(Task 1-2), ① 프롬프트/파서(4-5)·타입(3)·파서정리(6)·영속(7)·UI(8)·i18n(9)·eval(10)·문서·잔여(11)·검증(배포후) — 스펙 전 섹션 대응.
- **플레이스홀더**: NEW 코드(logReadingParseError)는 전체 제공. 삭제 태스크는 정확한 파일:line 앵커 + 검증(grep 0). 기존 파일 전체 재현 대신 앵커+잔여+검증으로 실행자 재확인 유도(대규모 삭제 리팩터 특성).
- **타입 일관성**: `logReadingParseError` 시그니처 Task 1에서 정의·이후 참조 일치. 제거 심볼(SajuSections/ShinjeomSections/promoteNestedFields/persistReadingSections/SECTIONS_COLUMN/ReadingSectionBlock)은 Task 11 grep로 0 확인.
