# 단위 테스트 가이드

> **담당**: Codex (테스트 작성·실행·커버리지 유지) | Claude (임계값 결정·패턴 정의)
> 협업 프로토콜 정본: [`claude-codex-collaboration.md`](claude-codex-collaboration.md)

Vitest 기반 단위 테스트 작성 패턴과 주의사항입니다.

---

## 1. 테스트 현황

- **Vitest 2.0** (node env, v8 coverage)
- 실제 테스트 수는 변경이 잦으므로 `pnpm test:coverage` 출력과 coverage 리포트를 기준으로 확인한다.
- 임계값: `branches 92 / functions 98 / lines 98 / statements 98`

```bash
pnpm test:coverage    # 테스트 실행 + 커버리지 리포트
```

---

## 2. 테스트 파일 배치 규칙

### 일반 모듈 테스트

`*.test.ts` 파일은 소스 파일 옆에 배치:
```
src/lib/env.ts
src/lib/env.test.ts       ← 같은 디렉토리
```

### API 라우트 테스트 ⚠️ 중요

`vitest.config.ts`의 `exclude: ["src/app/**", "src/components/**"]` 설정이 테스트 파일도 제외합니다.

```
src/app/api/tarot/reading/route.test.ts  ← ❌ 수집 불가
src/__tests__/api/tarot-reading.test.ts  ← ✅ 여기에 배치
```

import 방식:
```ts
// ✅ 절대 경로로 import
import { POST } from "@/app/api/tarot/reading/route";
```

현재 `src/__tests__/api/` 파일 목록 (13개):
- `tarot-session.test.ts` (14개), `saju-session.test.ts` (12개), `shinjeom-session.test.ts` (13개)
- `tarot-result.test.ts` (4개), `saju-result.test.ts` (4개), `shinjeom-result.test.ts` (5개)
- `tarot-reading.test.ts` (23개), `saju-reading.test.ts` (22개), `shinjeom-message.test.ts` (20개)
- `favorite-character.test.ts` (11개), `daily-card.test.ts` (10개), `locale-wiring.test.ts` (15개)
- `daily-fortune.test.ts`

---

## 3. SSE 스트리밍 테스트 timeout ⚠️

SSE 라우트 테스트는 스트림 완료까지 기본 timeout(5s)을 초과할 수 있습니다. `it()` 세 번째 인자로 명시합니다:

```ts
it("유효한 요청 → SSE 스트림 응답", { timeout: 15000 }, async () => {
  const { POST } = await setup();
  const res = await POST(makePostRequest(...));
  // SSE 스트림 소비
  const chunks = await readSSEStream(res);
  expect(chunks.some(c => c.done)).toBe(true);
});
```

적용 대상: `tarot-reading.test.ts`, `saju-reading.test.ts`, `shinjeom-message.test.ts`의 SSE 응답 테스트.

---

## 4. Outer catch 커버리지 패턴

API 라우트 최외부 `catch` 블록은 일반 요청 흐름에서 도달하지 않으므로 별도 테스트가 필요합니다. `checkRateLimit`을 예외 throw로 mock해 강제로 진입합니다:

```ts
it("checkRateLimit 예외 → 500 (outer catch 커버리지)", async () => {
  vi.doMock("@/lib/rate-limit", () => ({
    checkRateLimit: vi.fn().mockRejectedValue(new Error("redis error")),
    rateLimitResponse: vi.fn(),
  }));
  const { POST } = await import("@/app/api/tarot/session/route");
  const res = await POST(makePostRequest({ ... }));
  expect(res.status).toBe(500);
});
```

**적용 대상**: 모든 세션 라우트(`tarot/saju/shinjeom session`) + reading/message 라우트. Codecov patch 커버리지 통과 요건.

---

## 5. `vi.doMock` factory 누출 방지 ⚠️

`vi.doMock`으로 등록한 mock factory는 `vi.resetModules()` 후에도 **유지됩니다**.

문제: 이전 테스트가 rate-limit mock을 `false`로 설정하면 다음 테스트로 누출됨.

해결: `setup()` 내부에 rate-limit 통과 mock을 반드시 포함:

```ts
// ❌ 위험 — rate-limit mock 누락 시 이전 테스트의 false 값이 누출
async function setup() {
  vi.doMock("@/lib/auth/index", () => makeAuthMock());
  await vi.importActual("@/app/api/tarot/reading/route");
}

// ✅ 안전 — setup마다 rate-limit 통과 mock 명시
async function setup() {
  vi.doMock("@/lib/rate-limit", () => ({
    checkRateLimit: vi.fn().mockReturnValue({ allowed: true }),
  }));
  vi.doMock("@/lib/auth/index", () => makeAuthMock());
  await vi.importActual("@/app/api/tarot/reading/route");
}
```

---

## 6. 테스트 헬퍼 (`src/test-helpers/`)

| 파일 | 제공 함수 |
|------|---------|
| `mock-db.ts` | `makeMockDb()` — DbClient mock 팩토리 |
| `mock-auth.ts` | `makeAuthMock()` — getCurrentUser/requireUser/assertReadingAccess mock |
| `mock-request.ts` | `makePostRequest()` — NextRequest POST 헬퍼 |
| `mock-ai.ts` | `makeMockAiModule()`, `readSSEStream()` |
| `reset-modules.ts` | `setupDoMock()` — `beforeEach(vi.resetModules)` 등록 유틸 |
| `api-route-setup.ts` | `makeSessionRouteSetup()` / `makeResultRouteSetup()` / `makeStreamingRouteSetup()` — API 라우트 setup 보일러플레이트 |

### setupDoMock() 패턴

```ts
import { setupDoMock } from "@/test-helpers/reset-modules";

describe("API 테스트", () => {
  setupDoMock();  // beforeEach(vi.resetModules) 자동 등록

  it("성공 케이스", async () => {
    // setup() 호출 → 각 테스트마다 깨끗한 mock
    const { POST } = await setup();
    ...
  });
});
```

---

## 7. 커버리지 임계값

`vitest.config.ts`:
```ts
coverage: {
  thresholds: {
    branches: 92,
    functions: 98,
    lines: 98,
    statements: 98,
  }
}
```

임계값 변경 시 PR 설명에 근거 명시 필수.

---

## 8. 테스트 수 확인

테스트가 추가/삭제될 때마다 coverage 출력과 문서의 고정 숫자가 어긋나지 않는지 확인합니다. 고정 숫자를 유지하는 문서가 있다면 아래 스크립트로 동기화합니다:

```bash
pnpm exec tsx scripts/sync-test-count.ts          # 문서 자동 갱신
pnpm exec tsx scripts/sync-test-count.ts --check  # CI 모드: 불일치 시 exit 1
```
