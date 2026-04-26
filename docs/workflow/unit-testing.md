# 단위 테스트 가이드

Vitest 기반 단위 테스트 작성 패턴과 주의사항입니다.

---

## 1. 테스트 현황

- **663개 테스트** / statements 88%+ 커버리지
- **Vitest 2.0** (node env, v8 coverage)
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

`vitest.config.ts`의 `exclude: ["src/app/**"]` 설정이 테스트 파일도 제외합니다.

```
src/app/api/tarot/reading/route.test.ts  ← ❌ 수집 불가
src/__tests__/api/tarot-reading.test.ts  ← ✅ 여기에 배치
```

import 방식:
```ts
// ✅ 절대 경로로 import
import { POST } from "@/app/api/tarot/reading/route";
```

현재 `src/__tests__/api/` 파일 목록 (10개):
- `tarot-session.test.ts` (13개), `saju-session.test.ts` (11개), `shinjeom-session.test.ts` (11개)
- `tarot-result.test.ts` (4개), `saju-result.test.ts` (4개)
- `tarot-reading.test.ts` (7개), `saju-reading.test.ts` (5개), `shinjeom-message.test.ts` (5개)
- `favorite-character.test.ts` (5개), `daily-card.test.ts` (6개)

---

## 3. `vi.doMock` factory 누출 방지 ⚠️

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

## 4. 테스트 헬퍼 (`src/test-helpers/`)

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

## 5. 커버리지 임계값

`vitest.config.ts`:
```ts
coverage: {
  thresholds: {
    branches: 75,
    functions: 85,
    lines: 88,
    statements: 88,
  }
}
```

임계값 변경 시 PR 설명에 근거 명시 필수.

---

## 6. CLAUDE.md 테스트 수 동기화

테스트가 추가/삭제될 때마다 CLAUDE.md의 테스트 수를 동기화합니다:

```bash
pnpm exec tsx scripts/sync-test-count.ts          # CLAUDE.md 자동 갱신
pnpm exec tsx scripts/sync-test-count.ts --check  # CI 모드: 불일치 시 exit 1
```
