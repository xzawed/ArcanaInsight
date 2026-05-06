# ArcanaInsight i18n 완성 계획 — Grok 자체 번역 방식

> **상태: ✅ 완료 (2026-05-06) — PR feat/i18n-locale-ai-response, 커밋 ef7c849**

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 기존 i18n 인프라(PR-1/PR-A 완료) 위에서, Grok LLM을 번역 소스로 활용해 AI 리딩 응답·UI·캐릭터 대사를 ko/en/ja 3개 locale로 완성한다.

**Architecture:** 추가 비용 0원 원칙 — Grok API(이미 사용 중)로 일회성 번역 배치 실행 후 정적 데이터 파일에 저장. AI 리딩 응답은 prompt-builder locale 분기로 Grok이 자동으로 해당 언어로 생성. 외부 번역가 미사용.

**Tech Stack:** TypeScript, Next.js App Router, Grok API(xAI), Zustand, Vitest, 기존 i18n 모듈

---

## 현재 상태 (5개 에이전트 병렬 검증 — 2026-05-06)

### 완료된 것 ✅
- `src/i18n/config.ts`, `detect.ts`, `LocaleProvider.tsx`, `useLocaleStore.ts` — 인프라 완비
- DB locale 컬럼: sessions, readings, saju_readings, shinjeom_readings 모두 추가됨
- Session 라우트 3개: `getRequestLocale()` 호출 + DB 저장 완료
- Reading 라우트 3개: `getRequestLocale()` 호출 완료 (但 prompt-builder에 미전달)
- `src/i18n/translations/en/index.ts`: home.*/settings.*/header.*/footer.*/common.*/locale.* 영어 값 존재
- `src/i18n/translations/ja/index.ts`: ko fallback 구조만 존재 (번역값 미입력)
- i18n 전용 테스트 43개 기존 존재 (detect/config/keys/server-locale/translations/locale-wiring)
- `sonar-project.properties` coverage.exclusions에 i18n 파일 그룹 등록 완료
- 카드 데이터: `card.name`(영어) + `card.nameKo`(한국어) 이미 분리 존재

### 남은 gap ❌
| 영역 | 구체적 누락 |
|---|---|
| **prompt-builder** | 라인 22 "한국어로만 응답합니다" 고정 → locale 분기 미적용 |
| **reading routes** | locale 값이 prompt-builder 함수로 전달되지 않음 (3개 라우트) |
| **UI 컴포넌트** | home, settings, tarot/saju/shinjeom result 페이지에 한국어 하드코딩 (~275줄) |
| **waiting-lines** | 12캐릭터 201줄 한국어 전용 |
| **캐릭터 데이터** | 72개 텍스트 블록 한국어 전용 |
| **카드 키워드/의미** | ~468개 한국어 전용 (표시용 — AI 응답과 별개) |
| **일본어 번역** | ja/index.ts 번역값 전체 미입력 |

---

## 적용 가능 위험 항목 (CLAUDE.md 필수 주의사항)

- [x] SSR/Hydration: prompt-builder는 서버사이드 → 해당 없음. UI t() 호출은 LocaleProvider 컨텍스트 SSR 안전
- [ ] 비슷한 파일 N개 생성 여부 → Grok 번역 스크립트 1개로 통합 (분리 금지)
- [ ] UI 텍스트 변경 시 E2E 셀렉터 동시 검토 필요 → 130개 셀렉터 중 locale 영향받는 10~15개 data-testid 교체 검토
- [ ] DB 조회 패턴 변경 없음 → 해당 없음
- [ ] 새 TS 파일 추가 시: vitest.config.ts coverage.include + sonar-project.properties sonar.coverage.exclusions 동시 확인

---

## Task 1: Prompt-builder locale 분기 (핵심 — AI 응답 언어 전환)

**우선순위**: P0 (10줄, 즉시 가능, 가장 높은 가치)

**Files:**
- Modify: `src/services/core/prompt-builder.ts`
- Modify: `src/app/api/tarot/reading/route.ts`
- Modify: `src/app/api/saju/reading/route.ts`
- Modify: `src/app/api/shinjeom/message/route.ts`
- Modify: `src/__tests__/api/locale-wiring.test.ts` (기존 파일에 3개 reading 테스트 추가)

**배경**: 현재 3개 reading 라우트가 `getRequestLocale()`로 locale을 읽지만, `buildReadingPrompt()` 등 prompt-builder 함수에 전달하지 않는다. `prompt-builder.ts:22`의 `"한국어로만 응답합니다."` 가 locale에 관계없이 항상 한국어로 응답하게 만든다.

- [ ] **Step 1: prompt-builder.ts에 locale 파라미터 추가**

```typescript
// src/services/core/prompt-builder.ts

const LANGUAGE_INSTRUCTIONS: Record<string, string> = {
  ko: "반드시 한국어로만 응답합니다.",
  en: "You must respond in English only.",
  ja: "必ず日本語のみで回答してください。",
};

// buildSystemPrompt 첫 번째 파라미터에 locale 추가:
export function buildSystemPrompt(
  character: CharacterConfig,
  locale: string = "ko",  // 기본값 ko (기존 동작 보존)
  options?: { ... }
): string {
  const langInstruction = LANGUAGE_INSTRUCTIONS[locale] ?? LANGUAGE_INSTRUCTIONS.ko;
  // 기존 "한국어로만 응답합니다." 라인을 아래로 교체:
  // return `... ${langInstruction} ...`;
}
```

실제 수정 위치: `prompt-builder.ts`에서 `"한국어로만 응답합니다."` 문자열 찾아 `LANGUAGE_INSTRUCTIONS[locale]` 로 교체. `buildSystemPrompt`, `buildReadingPrompt`, `buildUserInfoPrompt` 함수 시그니처에 `locale: string = "ko"` 추가.

- [ ] **Step 2: tarot reading 라우트에 locale 전달**

```typescript
// src/app/api/tarot/reading/route.ts
// 기존: const locale = getRequestLocale(headersList);
// 추가: await saveReadingToDb({ ..., locale });  ← 이미 있음
// 변경: buildSystemPrompt(character, locale, ...)
//       buildReadingPrompt({ ..., locale })
```

`getRequestLocale()` 결과를 이미 `locale` 변수에 담고 있으므로, prompt-builder 호출부에 `locale` 파라미터만 추가하면 됨.

- [ ] **Step 3: saju reading 라우트에 locale 전달 (동일 패턴)**

- [ ] **Step 4: shinjeom message 라우트에 locale 전달 (동일 패턴)**

- [ ] **Step 5: locale-wiring 테스트 추가**

```typescript
// src/__tests__/api/locale-wiring.test.ts (기존 파일 하단에 추가)
describe("Reading locale wiring — prompt-builder", () => {
  it("en locale → buildSystemPrompt에 'en' 전달됨", async () => {
    // mockGetRequestLocale.mockReturnValue("en");
    // GET 또는 POST 호출 후
    // expect(mockBuildSystemPrompt).toHaveBeenCalledWith(
    //   expect.any(Object), "en", expect.any(Object)
    // );
  });
  // tarot, saju, shinjeom 각 1개
});
```

- [ ] **Step 6: type-check + lint + test 통과 확인**

```bash
pnpm type-check && pnpm lint && pnpm test
```

Expected: 기존 705개 + 신규 3개 = 708개 통과

- [ ] **Step 7: 커밋**

```bash
git add src/services/core/prompt-builder.ts \
        src/app/api/tarot/reading/route.ts \
        src/app/api/saju/reading/route.ts \
        src/app/api/shinjeom/message/route.ts \
        src/__tests__/api/locale-wiring.test.ts
git commit -m "feat: prompt-builder locale 분기 — en/ja AI 응답 언어 전환 활성화"
```

---

## Task 2: UI 컴포넌트 i18n 배선 (기존 키 활용)

**우선순위**: P1 (키와 영어 값은 이미 존재, 컴포넌트만 t() 사용하도록 전환)

**Files:**
- Modify: `src/app/page.tsx` (home 페이지)
- Modify: `src/app/settings/page.tsx`
- Modify: `src/app/tarot/result/[id]/page.tsx` (한국어 제목/레이블)
- Modify: `src/app/saju/result/[id]/page.tsx`
- Modify: `src/app/shinjeom/result/[id]/page.tsx`

**배경**: `en/index.ts`에 home.*/settings.* 영어 번역값이 이미 존재하나, 컴포넌트는 `t()` 대신 한국어 리터럴을 직접 사용한다. Result 페이지들은 "타로 리딩 결과", "사주 분석 결과", "신점 결과" 등 제목을 하드코딩한다.

- [ ] **Step 1: home 페이지 t() 교체**

`src/app/page.tsx`에서 `useT` 또는 서버 컴포넌트용 `t()` 임포트 후 교체:
```typescript
// 기존: <h1>타로 & 운세 리딩</h1>
// 변경: <h1>{t("home.hero.title")}</h1>
```

참조할 기존 키 (`src/i18n/translations/en/index.ts` home 섹션에 값 존재):
- `home.hero.title` → "Tarot & Fortune Reading"
- `home.hero.subtitle` → "A divination platform with anime characters"
- `home.hero.cta` → "Get started"
- `home.section.services` → "Services"
- `home.service.tarot.title/desc`, `home.service.saju.title/desc`, `home.service.shinjeom.title/desc`
- `home.section.daily-card`, `home.daily-card.cta`

- [ ] **Step 2: settings 페이지 t() 교체**

`settings.page.title`, `settings.section.profile`, `settings.section.preferences` 등 (`en/index.ts` settings 섹션에 값 존재).

- [ ] **Step 3: result 페이지 제목 i18n 추가**

Result 페이지 제목에 필요한 키를 `src/i18n/translations/shared/keys.ts`에 추가하고 `ko/index.ts`, `en/index.ts`, `ja/index.ts`에 값 추가:
```
tarot.result.title: { ko: "타로 리딩 결과", en: "Tarot Reading Result", ja: "タロット鑑定結果" }
saju.result.title: { ko: "사주 분석 결과", en: "Saju Analysis Result", ja: "四柱分析結果" }
shinjeom.result.title: { ko: "신점 결과", en: "Shinjeom Result", ja: "神占結果" }
tarot.result.overall: { ko: "종합 해석", en: "Overall Reading", ja: "総合解釈" }
tarot.result.advice: { ko: "조언", en: "Advice", ja: "アドバイス" }
```

- [ ] **Step 4: type-check + lint + test + E2E 셀렉터 확인**

```bash
pnpm type-check && pnpm lint && pnpm test
# E2E 영향 확인: "타로 리딩 결과" 텍스트 셀렉터가 E2E에 있으면 data-testid로 교체
grep -r "타로 리딩 결과\|사주 분석 결과\|신점 결과" e2e/
```

- [ ] **Step 5: 커밋**

```bash
git commit -m "feat: UI 컴포넌트 i18n 배선 — home/settings/result 페이지 t() 전환"
```

---

## Task 3: Grok 배치 번역 스크립트 + 데이터 파일 생성

**우선순위**: P2 (일회성 실행, 정적 데이터로 저장)

**Files:**
- Create: `scripts/grok-translate.ts` (일회성 번역 스크립트)
- Create: `src/i18n/translations/ja/index.ts` (일본어 번역값 채우기)
- Create: `src/data/characters/en.ts` (캐릭터 영어 페르소나)
- Create: `src/data/characters/ja.ts` (캐릭터 일본어 페르소나)
- Create: `src/data/characters/waiting-lines-en.ts` (영어 대기 대사)
- Create: `src/data/characters/waiting-lines-ja.ts` (일본어 대기 대사)

**배경**: Grok API(이미 사용 중)를 사용해 일회성 번역 배치를 실행한다. 결과를 정적 파일로 저장하므로 런타임 비용 증가 없음.

- [ ] **Step 1: 번역 스크립트 작성**

```typescript
// scripts/grok-translate.ts
// 사용법: pnpm exec tsx scripts/grok-translate.ts --target=ja --scope=ui
// --target: en|ja
// --scope: ui|characters|waiting-lines (분리 실행 가능)

import { getGrokApiKey } from "@/lib/env";
// 번역 대상을 JSON으로 구성, Grok API에 한 번에 전송
// 캐릭터별로 분리 (12 API 호출), 결과를 파일에 저장
```

- [ ] **Step 2: UI 일본어 번역 실행 (ja/index.ts 채우기)**

스크립트로 `en/index.ts` 값들을 Grok에게 일본어 번역 요청:
```
입력: "Tarot & Fortune Reading"
프롬프트: "Translate to Japanese for an anime-style fortune telling app. Formal tone."
출력: "タロット＆占い鑑定"
```

결과를 `src/i18n/translations/ja/index.ts`에 저장.

- [ ] **Step 3: 캐릭터 영어 번역 실행 (12 Grok 호출)**

각 캐릭터의 greeting/personality/description/speciality/speechStyle을 영어로 번역:
- hoshi (GenZ casual) → English GenZ casual speech
- ren (archaic formal) → English archaic formal ("thee/thou")
- rei (dry/analytical) → English dry, precise tone
- 나머지 9명 → 한국어 말투 특성을 영어 화법으로 로컬라이즈

- [ ] **Step 4: waiting-lines 영어/일본어 번역 실행**

201줄의 한국어 대기 대사를 en/ja로 번역. mood 속성 보존.

- [ ] **Step 5: 새 파일 sonar + vitest 동기화**

신규 파일 추가 시:
```
# sonar-project.properties coverage.exclusions에 추가:
src/data/characters/en.ts
src/data/characters/ja.ts
src/data/characters/waiting-lines-en.ts
src/data/characters/waiting-lines-ja.ts
src/i18n/translations/ja/**
```

Note: `scripts/grok-translate.ts`는 이미 `sonar.coverage.exclusions`에 `scripts/**` 패턴으로 제외됨 — 확인 필요.

- [ ] **Step 6: 커밋**

```bash
git commit -m "feat: Grok 배치 번역 — 캐릭터/waiting-lines en/ja 데이터 파일 생성"
```

---

## Task 4: 캐릭터 데이터 locale 통합 + waiting-lines 컴포넌트

**우선순위**: P2

**Files:**
- Modify: `src/data/characters/index.ts` (locale 필드 통합)
- Modify: `src/data/characters/waiting-lines.ts` (locale별 분기)
- Modify: `src/components/character/CharacterDisplay.tsx` (locale별 대기 대사 선택)
- Modify: `src/services/core/prompt-builder.ts` (캐릭터 locale 페르소나 사용)

**배경**: Task 3에서 생성된 번역 데이터를 컴포넌트와 프롬프트에 통합한다.

- [ ] **Step 1: 캐릭터 타입에 locale 필드 추가**

```typescript
// src/types/character.ts
interface CharacterConfig {
  // 기존
  greeting: string;  // ko
  personality: string;  // ko
  // 추가
  greetingI18n?: Record<string, string>;  // { en: "...", ja: "..." }
  personalityI18n?: Record<string, string>;
}
```

- [ ] **Step 2: waiting-lines에 locale 선택 헬퍼 추가**

```typescript
// src/data/characters/waiting-lines.ts
export function getWaitingLines(characterId: CharacterId, locale: string): WaitingLine[] {
  if (locale === "en") return waitingLinesEn[characterId] ?? waitingLines[characterId];
  if (locale === "ja") return waitingLinesJa[characterId] ?? waitingLines[characterId];
  return waitingLines[characterId];
}
```

- [ ] **Step 3: CharacterDisplay에서 locale 인식 대기 대사 선택**

`useLocaleStore()`로 locale 읽어 `getWaitingLines(characterId, locale)` 호출.

- [ ] **Step 4: prompt-builder에서 locale 페르소나 사용**

```typescript
// buildSystemPrompt에서:
const persona = character.personalityI18n?.[locale] ?? character.personality;
```

- [ ] **Step 5: type-check + lint + test**

```bash
pnpm type-check && pnpm lint && pnpm test
```

Expected: 708개 + 신규 4~6개 = 712~714개

- [ ] **Step 6: 커밋**

```bash
git commit -m "feat: 캐릭터 locale 통합 — en/ja 페르소나·대기 대사 컴포넌트 연결"
```

---

## Task 5: 검증 게이트 + 문서 업데이트

**우선순위**: P1

- [ ] **Step 1: 전체 검증**

```bash
pnpm type-check && pnpm lint && pnpm test:coverage
pnpm build
pnpm exec tsx scripts/check-doc-links.ts
pnpm exec tsx scripts/check-env-docs.ts
```

- [ ] **Step 2: locale 시나리오 수동 검증**

```bash
# 개발 서버 실행 후:
# 1. 쿠키 ai_locale=en 설정 → 홈 영어 확인
# 2. 타로 세션 → 리딩 → AI 응답 영어 확인
# 3. ai_locale=ja → 홈/타로 일본어 확인
# 4. 공유 링크(/tarot/result/[token]) → locale 무관 표시 확인
```

- [ ] **Step 3: SonarCloud 상태 확인**

```bash
curl -s -u "$SONARQUBE_TOKEN:" \
  "https://sonarcloud.io/api/qualitygates/project_status?projectKey=xzawed_ArcanaInsight" \
  | jq '.projectStatus.status'
# Expected: "OK"
```

- [ ] **Step 4: CLAUDE.md 업데이트**

CLAUDE.md의 "ShuffleCeremony", "캐릭터 경험 시스템", "테스트 수(705→실제수)" 업데이트. i18n 완성 현황 반영.

- [ ] **Step 5: 마스터 플랜 업데이트**

`docs/superpowers/plans/i18n-master-plan.md`에 완료 상태 반영.

---

## 비용 분석 요약

| 항목 | 비용 |
|---|---|
| Grok API 번역 배치 (일회성) | ~$0.02 (1MB 미만 텍스트) |
| 영어 AI 응답 토큰 증가분 (EN 응답 ~1.5x) | ~$0.05~0.10/일 (500 사용자 기준) |
| 일본어 AI 응답 토큰 증가분 (JA ≈ KO) | ~$0.00 (한국어와 동등) |
| 외부 번역가 | **$0** (Grok 자체 번역으로 대체) |
| **추가 인프라 비용** | **$0** (기존 Grok 구독 활용) |

**결론**: 인프라 추가 비용은 실질적 0원. 영어 사용자 토큰 비용 증가는 미미(1일 $0.10 미만). 외부 번역가 대비 비용 절감 100%.

---

## 의존성 및 실행 순서

```
Task 1 (prompt-builder locale) ─→ 즉시 실행 가능, 독립적
Task 2 (UI 컴포넌트 배선) ─→ Task 1과 병렬 가능
Task 3 (Grok 배치 번역) ─→ Task 1, 2와 병렬 가능 (스크립트 실행 독립)
Task 4 (캐릭터 통합) ─→ Task 3 완료 후
Task 5 (검증 + 문서) ─→ Task 1~4 완료 후
```

**시간 추정**: Task 1 (2h) + Task 2 (4h) + Task 3 (3h) + Task 4 (3h) + Task 5 (1h) = **총 13시간**

---

## 위험 및 대응

| 위험 | 대응 |
|---|---|
| Grok 번역 품질 (특히 캐릭터 말투) | 3개 캐릭터(hoshi/rei/lix) 수동 검토 필수. 나머지는 Grok 자동 |
| 사주·신점 개념 영어 표현 불자연 | AI 리딩 자체는 Grok이 문맥에 맞게 영어로 설명 (번역 불필요) |
| waiting-lines 함수형 템플릿 번역 어려움 | 템플릿 변수({cardName} 등)는 locale 무관 — 텍스트 부분만 번역 |
| E2E 한국어 셀렉터 130개 | ko 기본 locale 유지 → E2E 깨지지 않음. locale 전환 E2E는 opt-in |
| SonarCloud 중복도 임계치 | Grok 번역 파일은 coverage.exclusions 등록 → 분모 제외 |
