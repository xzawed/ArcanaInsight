> 이전 위치: `e2e/README.md` (PR-2에서 이동)
> E2E 테스트 실행·작성·검증에 대한 Single Source of Truth.

# ArcanaInsight E2E 테스트 가이드

> **담당**: Codex (spec 작성·수정·실행) | Claude (테스트 시나리오 기획·셀렉터 전략 결정)
> 협업 프로토콜 정본: [`claude-codex-collaboration.md`](claude-codex-collaboration.md)

- **25개 spec 파일** (Desktop Chrome 기준; 실제 테스트 수는 `npx playwright test --list --project="Desktop Chrome"` 기준)
- **3개 디바이스 프로필**: Desktop Chrome · Mobile Android (Pixel 7) · Mobile iOS (iPhone 14)
- **Playwright 버전**: `v1.59.1` — CI Docker 이미지와 버전 고정, 임의 변경 금지

---

## 목차

1. [실행 방법](#1-실행-방법)
2. [CI 파이프라인](#2-ci-파이프라인)
3. [스펙 파일별 책임 매트릭스](#3-스펙-파일별-책임-매트릭스)
4. [테스트 작성 컨벤션](#4-테스트-작성-컨벤션)
5. [Helper 사용 가이드](#5-helper-사용-가이드)
6. [통과 기준](#6-통과-기준)
7. [실패 시 대응 프로세스](#7-실패-시-대응-프로세스)
8. [디바이스 프로필별 차이](#8-디바이스-프로필별-차이)
9. [자주 발생하는 실패 패턴 FAQ](#9-자주-발생하는-실패-패턴-faq)
10. [유지보수 규칙](#10-유지보수-규칙)

---

## 1. 실행 방법

### 1.1 로컬 실행 (macOS / Linux)

```bash
pnpm test:e2e          # 3개 디바이스 전체 (headless)
pnpm test:e2e:ui       # UI 모드 (시각적 디버깅, 브라우저 창 열림)

# Mobile iOS 제외 (WebKit 설치 없이 실행)
SKIP_WEBKIT=1 pnpm test:e2e

# 특정 프로젝트만
npx playwright test --project="Desktop Chrome"
npx playwright test --project="Mobile Android"
npx playwright test --project="Mobile iOS"

# 특정 파일만
npx playwright test e2e/tarot-flow.spec.ts --project="Desktop Chrome"

# 테스트 목록만 확인 (실행 없이)
npx playwright test --list
```

`playwright.config.ts`의 `webServer` 설정이 `pnpm dev`를 자동 기동합니다. `reuseExistingServer: true`이므로 이미 `pnpm dev`가 실행 중이면 재사용합니다.

### 1.2 Windows Docker 실행 (필수)

**왜 Docker가 필요한가**: Claude Code Bash 세션은 Playwright 브라우저 프로세스의 stdout을 캡처하지 못합니다. Linux 컨테이너(Docker)에서 실행해야 정상적으로 결과를 받을 수 있습니다.

아래 스크립트에서 `{PROJECT_PATH}`를 실제 프로젝트 절대경로로 교체하세요.

```bash
docker run --rm \
  -v "{PROJECT_PATH}/src:/work/src:ro" \
  -v "{PROJECT_PATH}/public:/work/public:ro" \
  -v "{PROJECT_PATH}/e2e:/work/e2e:ro" \
  -v "{PROJECT_PATH}/package.json:/work/package.json:ro" \
  -v "{PROJECT_PATH}/pnpm-lock.yaml:/work/pnpm-lock.yaml:ro" \
  -v "{PROJECT_PATH}/tsconfig.json:/work/tsconfig.json:ro" \
  -v "{PROJECT_PATH}/next.config.ts:/work/next.config.ts:ro" \
  -v "{PROJECT_PATH}/postcss.config.mjs:/work/postcss.config.mjs:ro" \
  -v "{PROJECT_PATH}/playwright.config.ts:/work/playwright.config.ts:ro" \
  -v "{PROJECT_PATH}/.env.local:/work/.env.local:ro" \
  -w //work \
  -e NEXT_TELEMETRY_DISABLED=1 \
  mcr.microsoft.com/playwright:v1.59.1-noble \
  bash -c '
    corepack enable && corepack prepare pnpm@10.33.0 --activate 2>/dev/null &&
    pnpm install --frozen-lockfile &&
    pnpm build &&
    npx next start -p 3000 &
    for i in $(seq 1 20); do curl -s http://localhost:3000 >/dev/null 2>&1 && break; sleep 1; done &&
    npx playwright test --project="Desktop Chrome" --reporter=list 2>&1
  '
```

> **주의**: Docker 실행 후 `node_modules`가 Linux 바이너리로 교체됩니다. 이후 Windows에서 `pnpm dev` 실행 시 `rm -rf node_modules && pnpm install` 필수.

---

## 2. CI 파이프라인

### 파이프라인 요약

| 파이프라인 | 워크플로우 | 트리거 | 디바이스 | artifact 보존 |
|-----------|-----------|--------|---------|--------------|
| PR CI | `deploy.yml` | PR → main | Desktop Chrome + Mobile Android | 7일 |
| 주간 QA | `weekly-qa.yml` | 토요일 09:00 KST + 수동 | Desktop Chrome + Mobile Android + Mobile iOS | 30일 |
| QA 재검증 | `qa-recheck.yml` | main push (QA Issue 열린 상태) | 주간 QA와 동일 | 30일 |

**문서 변경(*.md, docs/, n8n/)만의 PR/push는 E2E를 자동 스킵합니다.**

> ⚠️ **CI 재현성 필수**: `playwright.config.ts`의 `use.locale: "ko"` 절대 제거 금지. CI 브라우저 기본값은 en-US이므로 제거 시 SSR이 영어로 렌더링되어 한국어 단언이 전부 실패합니다 (PR #243, 25개 실패 사례).

### QA 자동 루프

```
주간 QA (토요일 09:00)
  ├─ 통과 → 열린 QA Issue 자동 닫기 → 끝
  └─ 실패 → Issue 자동 생성 (실패 목록 + 로그 링크 + 수정 안내)
       └─ fix/* 브랜치 → PR CI 통과 → main 머지
            └─ QA Issue 열림 감지 → QA 재검증 자동 트리거
                 ├─ 통과 → Issue 자동 닫기 → 끝
                 └─ 실패 → Issue 업데이트 → 수정 반복
```

---

## 3. 스펙 파일별 책임 매트릭스

| 파일 | 담당 범위 | 의존 Helper | 디바이스 제한 |
|------|---------|-----------|------------|
| `home.spec.ts` | HeroSection CTA · CharacterGallery · DailyCard · FAQ · BottomCTA | — | 없음 |
| `navigation.spec.ts` | Header 데스크탑 링크 · 테마 드롭다운 · Footer 링크 · MobileNav · 스크롤 초기화 | — | 없음 |
| `character.spec.ts` | 캐릭터 상세 페이지 12개 · 존재하지 않는 ID 404 처리 | — | 없음 |
| `daily-card.spec.ts` | 오늘의 카드 섹션 존재 · 탭 전환 | — | 없음 |
| `static-pages.spec.ts` | 이용약관(/terms) · 개인정보처리방침(/privacy) 페이지 | — | 없음 |
| `tarot-flow.spec.ts` | 타로 Step 1→4 플로우 · 뒤로가기 | — | 없음 |
| `saju-flow.spec.ts` | 사주 Step 1→4 플로우 (개인정보 입력 포함) | — | 없음 |
| `shinjeom-flow.spec.ts` | 신점 Step 1→3 플로우 · 대화형 상담 · 결과 버튼 | — | 없음 |
| `form-validation.spec.ts` | 사주 폼 유효성(birthDate+birthHour+gender 필수) · 신점 메시지 전송 · 설정 상태 저장 | — | 없음 |
| `ai-response-rendering.spec.ts` | SSE AI 응답 렌더링 · JSON 잔여물 미노출 (신점·타로·사주·공통) | `sse-mock.ts` 전체 | 없음 |
| `api-error-handling.spec.ts` | API 500/400/429/504/네트워크 차단 mock 오류 처리 | `page.route` mock | 없음 |
| `auth.spec.ts` | 로그인 페이지 UI · 구글 버튼 존재 | — | 없음 |
| `auth-session.spec.ts` | 인증 상태 · Supabase 이메일 로그인 시도 | — | 없음 |
| `mypage.spec.ts` | 마이페이지 비로그인 리디렉트 · 히스토리 페이지 | — | 없음 |
| `settings.spec.ts` | 설정 5개 섹션 · 테마/필터/토글 상태 저장 | — | 없음 |
| `result-pages.spec.ts` | 결과 공유 페이지 없는 ID → 404 처리 | — | 없음 |
| `responsive.spec.ts` | 3개 뷰포트(데스크탑·태블릿·모바일) 레이아웃 깨짐 여부 | — | 없음 |
| `cross-platform.spec.ts` | 콘솔 에러 · 이미지 로드 · safe-area · 링크 200 응답 | — | Desktop + Mobile |
| `ui-quality.spec.ts` | JSON 잔여물 감지 · 핵심 텍스트 존재 · 레이아웃 깨짐 · 빈 페이지 감지 | — | 없음 |
| `theme.spec.ts` | 테마 드롭다운 · 7종 테마 전환 · 3개 디바이스 | — | 없음 |
| `i18n-matrix.spec.ts` | ko/en/ja 3개 locale 전환 · UI 텍스트 렌더링 검증 | — | 없음 |
| `theme-atmosphere.spec.ts` | 7종 테마 분위기 이펙트 · 파티클·배경 렌더링 | — | 없음 |
| `tarot-text-reveal.spec.ts` | 타로 showLabel 제어 동작 — result phase 진입 전 카드명 텍스트 미노출 검증 | — | 없음 |
| `theme-effects.spec.ts` | ThemeAtmosphereLayer 렌더링 검증 — 테마별 레이어 DOM 존재 확인 | — | 없음 |
| `smart-ci.spec.ts` | 실 Supabase 세션 기반 플로우 검증 (CI `testIgnore` 대상) — 파일 상단 `// ⚠️ 실 Supabase 인증 세션 필요 — CI testIgnore 대상` 주석 필수 | — | ⚠️ 실 세션 필요 |

---

## 4. 테스트 작성 컨벤션

### 4.1 파일 명명 + describe 구조

```ts
// 파일명: kebab-case.spec.ts
// describe: "서비스/컴포넌트 — 기능 그룹"
test.describe("타로 서비스 플로우", () => {
  test("Step 1→2: 캐릭터 선택 → 주제 선택 전환", async ({ page }) => { ... });
});
```

- 1 파일 = 1개 이상의 `describe`, 각 `describe` 안에 관련 `test` 그룹
- 비즈니스 도메인 기준으로 파일 분리 (UI 컴포넌트별 × — 기능 플로우 기준 ○)

### 4.2 Playwright 주의사항 ⚠️

#### fixed 헤더 intercept — 가장 흔한 실패 원인

Playwright `.click()`은 내부적으로 `scrollIntoViewIfNeeded()`를 호출합니다. 요소를 뷰포트 최상단으로 스크롤하면 `z-50 fixed` 헤더(높이 약 56px)가 요소 위를 가려 `pointer-events` 가로채기가 발생합니다.

```ts
// ❌ 실패: scrollIntoViewIfNeeded() → 헤더가 요소 위를 가림
await spreadBtn.click();

// ✅ 성공: DOM 직접 클릭 → 스크롤·좌표 계산 우회
await spreadBtn.evaluate((el) => (el as HTMLElement).click());
```

**적용 대상**: 스프레드 버튼, 주제 선택 버튼, MobileNav 탭, 테마 드롭다운 옵션 등 헤더 근처에 위치하거나 페이지 이동을 유발하는 요소.

#### strict mode 위반 — 2번째로 흔한 실패 원인

Playwright는 동일한 DOM에서 2개 이상의 요소가 매칭되면 strict mode 에러를 던집니다. 헤더 데스크탑/모바일 양쪽에 동일한 선택자가 존재하는 경우가 많습니다.

```ts
// ❌ 실패: desktop nav + mobile nav 모두 매칭
await page.locator("nav a[href='/tarot']").click();

// ✅ 성공: .first()로 첫 번째만 선택
await page.locator("nav a[href='/tarot']").first().click();
```

#### nextjs-portal 간섭

모바일 viewport 테스트에서 Next.js 개발 오버레이(`<nextjs-portal>`)가 클릭을 가로채는 경우가 있습니다. `evaluate(el => el.click())`으로 동일하게 우회합니다.

```ts
// MobileNav 탭 클릭 (nextjs-portal 우회)
const tarotTab = page.locator("nav a[href='/tarot']").last();
await tarotTab.evaluate((el) => (el as HTMLElement).click());
```

#### 모바일 viewport에서 overlay 대응

```ts
// 모바일 설정 시 setViewportSize를 beforeEach 또는 테스트 초반에
await page.setViewportSize({ width: 390, height: 844 });
```

#### Mobile iOS WebKit 입력·이미지 대기

Mobile iOS 프로젝트(WebKit)는 `page.mouse.wheel()`을 지원하지 않는다. 스크롤 검증은
`window.scrollTo()` 또는 터치 기반 액션으로 수행하고, 이미지 로드 검증은 lazy 이미지가
뷰포트에 들어오도록 `locator.scrollIntoViewIfNeeded()` 후 `complete && naturalWidth > 0`을
폴링한다.

### 4.3 셀렉터 우선순위

1. `getByRole("button", { name: "전송" })` — 접근성 기반, 가장 안정
2. `data-testid` 속성 — 빠른 접근, UI 리팩토링 영향 없음
3. `locator("text=상담 시작하기")` — 텍스트 기반, 번역/리네이밍 시 깨짐
4. CSS 클래스명 — 스타일 변경에 취약, 마지막 수단

### 4.4 대기 전략

| 상황 | 사용 |
|------|------|
| 페이지 이동 완료 대기 | `page.waitForURL("**/tarot/session**")` |
| 특정 요소 표시 대기 | `expect(locator).toBeVisible({ timeout: 10_000 })` |
| SSE 응답 완료 대기 | `page.waitForTimeout(2000)` (mock 완료 후 렌더링 보장) |
| 레이아웃/정적 UI 준비 | `page.goto(path, { waitUntil: "domcontentloaded" })` 후 핵심 요소 `toBeVisible()` |
| API·이미지까지 포함한 로딩 완료 | `page.waitForLoadState("networkidle")` (외부 API를 mock한 경우에만 권장) |
| 사용 금지 | `waitForTimeout` 단독 의존 — 대신 명시적 상태 체크 우선 |

---

## 5. Helper 사용 가이드

> 참조: [`e2e/helpers/sse-mock.ts`](../../e2e/helpers/sse-mock.ts), [`e2e/helpers/service-navigation.ts`](../../e2e/helpers/service-navigation.ts)

### service-navigation.ts

서비스 진입 로직(캐릭터 선택, 타로/사주/신점 페이지 이동, 폼 입력)을 집중 관리합니다.
UI 변경 시 이 파일을 **먼저** 수정하면 이 파일을 import하는 모든 spec 파일이 자동 대응됩니다.

```ts
import {
  selectFirstCharacter,        // 캐릭터 목록에서 첫 번째 캐릭터 클릭
  navigateToSajuForm,          // /saju 이동 후 캐릭터 선택 → 사주 폼 진입
  fillSajuForm,                // 생년월일·성별·시간 입력
  submitSajuForm,              // 사주 폼 제출
  enterSajuSession,            // 사주 세션까지 전체 진입
  navigateToShinjeomSession,   // /shinjeom 이동 후 캐릭터·주제 선택
  enterShinjeomSession,        // 신점 세션 진입 (주제 선택 + 첫 메시지 전송)
  enterTarotSession,           // /tarot 이동 후 캐릭터·주제·스프레드 선택까지
} from "../helpers/service-navigation";
```

**변경 전 영향 파일 확인 필수**:
```bash
grep -rn "service-navigation" e2e/ --include="*.ts"
```

AI 응답 렌더링 테스트(`ai-response-rendering.spec.ts`)에서 실제 API 호출 없이 SSE 스트리밍을 mock합니다.

### 함수

```ts
// SSE 스트림 바디 생성
createSSEBody(chunks: string[], finalData?: Record<string, unknown>): string
// chunks: 스트리밍 청크 배열
// finalData: { done: true, ...페이로드 } — 마지막 이벤트에 추가

// page.route로 SSE mock 설정
mockSSERoute(page: Page, urlPattern: string, sseBody: string): Promise<void>

// 세션 생성 API mock (session id: "mock-session-id" 반환)
mockSessionCreate(page: Page, urlPattern: string): Promise<void>
```

### 사용 예시

```ts
// 세션 생성 mock
await mockSessionCreate(page, "**/api/shinjeom/session");

// SSE 응답 mock (청크 분할 전송)
const sseBody = createSSEBody(
  ["첫 번째 청크. ", "두 번째 청크."],
  { isFinal: false, message: "첫 번째 청크. 두 번째 청크." }
);
await mockSSERoute(page, "**/api/shinjeom/message", sseBody);
```

### Mock 데이터 상수

| 상수 | 용도 |
|------|------|
| `SHINJEOM_MID_RESPONSE` | 신점 중간 대화 텍스트 |
| `SHINJEOM_FINAL_RESULT` | 신점 최종 결과 `{ overallReading, topicReading, advice }` |
| `TAROT_READING_RESULT` | 타로 리딩 결과 `{ cardInterpretations, overallReading, advice }` |
| `SAJU_READING_RESULT` | 사주 리딩 결과 `{ overallReading, advice }` |
| `SAJU_DATA` | 사주 계산 결과 `{ pillars, dayMaster, elements, ... }` |
| `TAROT_READING_CHUNKS` / `SAJU_READING_CHUNKS` | 스트리밍용 청크 배열 |

### JSON_ARTIFACTS

AI 응답이 raw JSON 문자열 그대로 화면에 노출되지 않는지 검증합니다.

```ts
import { JSON_ARTIFACTS } from "./helpers/sse-mock";

const bodyText = await page.textContent("body");
for (const pattern of JSON_ARTIFACTS) {
  expect(bodyText).not.toMatch(pattern);
}
// 검사 패턴: "overallReading", "cardInterpretations", "cardId",
// "interpretation", 독립된 {/}/[/], \\n\\n 이스케이프 등 8개
```

---

## 6. 통과 기준

| 기준 | 세부 내용 |
|------|---------|
| **Exit code** | Playwright `exit 0` = PASS. 1개라도 실패 시 `exit 1` |
| **Flaky 허용** | CI `retries: 2` — 동일 테스트 2회 재시도 후에도 실패하면 FAIL |
| **JSON 잔여물** | `JSON_ARTIFACTS` 8개 정규식 모두 미매칭 |
| **콘솔 에러** | `page.on("pageerror")` 이벤트 0개 (일부 테스트에서 명시적으로 검증) |
| **링크 상태** | `cross-platform.spec.ts`에서 주요 내부 링크 200 응답 확인 |

---

## 7. 실패 시 대응 프로세스

### 로컬 실패

1. `playwright-report/index.html` 열기 — HTML 리포트에서 스크린샷·trace 확인
2. `--headed` 플래그로 브라우저 직접 관찰: `npx playwright test --headed e2e/타겟.spec.ts`
3. UI 모드로 단계별 디버깅: `pnpm test:e2e:ui`

### CI 실패

1. GitHub Actions → 해당 워크플로우 → `playwright-report` artifact 다운로드
2. `index.html`에서 실패한 테스트 클릭 → trace viewer에서 재현
3. 스크린샷 확인 (`only-on-failure` 설정)
4. `fix/*` 브랜치에서 수정 → PR → CI 통과 후 머지

### 주간 QA 실패 자동 루프

QA 실패 시 GitHub Issue(`🚨 주간 QA 실패`)가 자동 생성됩니다. main 브랜치에 push할 때마다 열린 QA Issue가 있으면 자동으로 QA가 재실행됩니다. 수동으로 재실행하려면 `.github/workflows/weekly-qa.yml` → `workflow_dispatch` 사용.

---

## 8. 디바이스 프로필별 차이

| 프로필 | 뷰포트 | 브라우저 | 실행 환경 |
|--------|--------|---------|---------|
| Desktop Chrome | 1280×720 | Chromium | PR CI + 주간 QA |
| Mobile Android (Pixel 7) | 412×915 | Chromium | PR CI + 주간 QA |
| Mobile iOS (iPhone 14) | 390×844 | WebKit | **주간 QA만** (PR CI 제외) |

**iOS-only 이슈**:
- `100dvh`(dynamic viewport height) — iOS Safari 주소창 높이 변화 대응
- `safe-area-inset-*` — 노치·홈바 영역
- WebKit touch event 차이 — `touch-action: manipulation` 전역 적용 필수
- iOS에서만 실패하는 테스트 발생 시 주간 QA artifact의 `Mobile iOS` 리포트 확인

---

## 9. 자주 발생하는 실패 패턴 FAQ

### Q1. `Element is outside of the viewport` 또는 `Error: locator.click: ...` 오류

**원인**: `.click()` 내부 `scrollIntoViewIfNeeded()`가 요소를 뷰포트 상단으로 스크롤하면서 fixed 헤더에 가려짐.

**해결**: `evaluate(el => (el as HTMLElement).click())` 으로 교체.

```ts
// Before
await btn.click();
// After
await btn.evaluate((el) => (el as HTMLElement).click());
```

---

### Q2. `strict mode violation: ... resolved to X elements`

**원인**: 동일한 선택자가 데스크탑 nav + 모바일 nav 등 2곳에 존재.

**해결**: `.first()` 또는 더 구체적인 선택자 사용.

```ts
page.locator("nav a[href='/tarot']").first()           // 데스크탑 헤더
page.locator("nav a[href='/tarot']").last()            // 모바일 nav
page.locator("button[aria-label='테마 변경']").first()  // 테마 버튼
page.locator("footer").first()                         // 앱 footer (Next.js 오버레이 footer 제외)
```

---

### Q3. 모바일 뷰에서 탭 클릭이 무반응

**원인**: `<nextjs-portal>` 오버레이 요소가 pointer events 가로채기.

**해결**: `evaluate()` 방식으로 DOM 직접 클릭.

```ts
const tarotTab = page.locator("nav a[href='/tarot']").last();
await tarotTab.evaluate((el) => (el as HTMLElement).click());
```

---

### Q4. 사주 폼 제출 버튼이 계속 disabled

**원인**: 사주 폼 `isValid = !!(birthDate && birthHour && gender)` — 세 가지 모두 필수. birthHour 선택 누락이 흔한 원인.

**해결**: date + gender만 아니라 select(시진) 도 선택.

```ts
await page.locator("input[type='date']").fill("1995-06-15");
await page.getByRole("button", { name: "여성" }).click();
const hourSelect = page.locator("select");
if (await hourSelect.isVisible()) {
  await hourSelect.selectOption({ index: 1 }); // index 0 = "선택하세요"
}
```

---

### Q5. 성별 필터 후 캐릭터 카드 수가 예상보다 많음

**원인**: `page.locator("button").count()`가 필터 버튼 · nav 버튼 등을 모두 포함.

**해결**: 캐릭터명으로 필터링.

```ts
const characterCards = page.locator("button").filter({
  hasText: /아르카나|미코|선화|호시|루나|레이|카이른|제로|하루|렌|릭스|에단/,
});
```

---

### Q6. SSE mock 테스트에서 AI 응답이 렌더링되지 않음

**원인**: `waitForTimeout` 시간이 짧거나 mock 라우트가 등록되기 전에 요청이 발생.

**해결**: mock 설정을 페이지 이동 **전에** 완료, 대기 시간을 2000ms 이상으로 설정.

```ts
// mock 먼저 등록
await mockSessionCreate(page, "**/api/shinjeom/session");
await mockSSERoute(page, "**/api/shinjeom/message", sseBody);
// 그 다음 페이지 이동
await enterShinjeomSession(page);
```

---

## 10. 유지보수 규칙

### spec 파일 추가 시 체크리스트

- [ ] `docs/workflow/e2e-testing.md` §3 매트릭스에 새 행 추가
- [ ] spec 파일 수 확인: `ls e2e/*.spec.ts | wc -l`
- [ ] 필요 시 helper 함수 추가 → §5 동시 업데이트

### 수치 동기화

수치가 변경될 때마다 아래 3곳을 동기화합니다:

| 파일 | 위치 |
|------|------|
| `docs/workflow/e2e-testing.md` (이 파일) | 맨 상단 수치 |
| `CLAUDE.md` | `e2e/` 설명 섹션 |
| `README.md` | E2E 테스트 기술 스택 행 |

```bash
# 재검증 커맨드
ls e2e/*.spec.ts | wc -l                                         # spec 파일 수 (현재 25개)
npx playwright test --list --project="Desktop Chrome" | tail -1  # 테스트 수
```

### helper 변경 시

`e2e/helpers/sse-mock.ts`의 공개 함수 시그니처나 상수를 변경할 때 §5 Helper 사용 가이드를 동시 수정합니다.

### Playwright 버전 업그레이드

`playwright.config.ts` 버전과 `.github/workflows/` 내 `mcr.microsoft.com/playwright:vX.X.X-noble` 이미지 버전을 **반드시 동시에** 변경합니다. CI와 로컬 환경 불일치 방지.

## i18n 셀렉터 정책

UI 텍스트가 i18n으로 변경되므로 한글 `hasText` regex 셀렉터 금지 — `data-testid` 우선. 핵심 testid:
- 데스크탑 nav: `desktop-nav` (Header)
- 모바일 nav: `mobile-nav-${name}` (각 항목)
- LanguageSwitcher: `lang-option-${l}`, `mobile-lang-option-${l}`
- LocaleConfirmModal: `locale-confirm-modal`, `locale-confirm-keep`, `locale-confirm-accept`
- Toast: `toast`
- 타로 플로우: `topic-btn-${topic}`, `spread-btn-${spread}`, `topic-back-btn` (`src/app/tarot/page.tsx`)
- 재시도 버튼: `reading-retry` (타로·사주 세션 페이지 타임아웃/에러 시)

PR-6에서 locale 매트릭스 (165 test × 3 locale = 495 실행) 도입 예정. 상세: [`../conventions/i18n-style.md`](../conventions/i18n-style.md)
