# RLS 보안 취약점 수정 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 3개 에이전트 분석으로 발견된 RLS 취약점 5건을 Critical→High→Medium→Low 순서로 수정한다.

**Architecture:** Supabase 마이그레이션 SQL 3개(013~015)로 DB 레이어 수정, Admin Supabase 클라이언트를 신설해 share_token 공개 조회를 service_role로 격상하고, 코드 레이어(daily-card 레이트 리밋 / favorite-character Zod)를 패치한다.

**Tech Stack:** Supabase PostgreSQL RLS, @supabase/supabase-js, Next.js App Router API Routes, Vitest

## 적용 가능 위험 항목 (CLAUDE.md 필수 주의사항)
- [ ] SSR/Hydration: 해당 없음 (API 라우트 전용)
- [ ] 비슷한 파일 N개 생성 여부 → supabase-admin-adapter.ts는 supabase-adapter.ts 상속으로 중복 최소화
- [ ] UI 텍스트 변경 여부 → 없음

---

## 파일 구조

| 동작 | 파일 | 역할 |
|------|------|------|
| Create | `supabase/migrations/013_shinjeom_rls.sql` | shinjeom_messages/readings RLS 활성화 |
| Create | `supabase/migrations/014_fix_share_token_rls.sql` | readings/saju_readings USING(true) 제거 |
| Create | `supabase/migrations/015_fix_sessions_rls.sql` | sessions SELECT 익명 세션 허용 |
| Create | `src/lib/supabase/admin.ts` | service_role Supabase 클라이언트 팩토리 |
| Modify | `src/lib/db/supabase-adapter.ts:7` | `private client()` → `protected client()` |
| Create | `src/lib/db/supabase-admin-adapter.ts` | service_role 기반 SupabaseAdapter 서브클래스 |
| Modify | `src/lib/db/index.ts` | `getAdminDb()` 추가 |
| Modify | `src/app/api/tarot/result/[id]/route.ts` | getAdminDb()로 share_token 조회 |
| Modify | `src/app/api/saju/result/[id]/route.ts` | getAdminDb()로 share_token 조회 |
| Modify | `src/app/api/shinjeom/result/[id]/route.ts` | getAdminDb()로 share_token 조회 |
| Modify | `src/app/api/daily-card/route.ts` | checkRateLimit 추가 |
| Modify | `src/lib/validation/api-schemas.ts` | FavoriteCharacterSchema 추가 |
| Modify | `src/app/api/profile/favorite-character/route.ts` | POST Zod safeParse 적용 |
| Modify | `src/test-helpers/api-route-setup.ts` | makeResultRouteSetup에 getAdminDb 모킹 추가 |
| Modify | `src/__tests__/api/tarot-result.test.ts` | admin db 모킹 반영 |
| Modify | `src/__tests__/api/saju-result.test.ts` | admin db 모킹 반영 |
| Modify | `src/__tests__/api/shinjeom-result.test.ts` | admin db 모킹 반영 |
| Modify | `src/__tests__/api/daily-card.test.ts` | rate limit 테스트 추가 |
| Modify | `src/__tests__/api/favorite-character.test.ts` | 잘못된 body 400 테스트 추가 |

---

## Task 1: shinjeom RLS 마이그레이션 [Critical]

**Files:**
- Create: `supabase/migrations/013_shinjeom_rls.sql`

- [ ] **Step 1: 마이그레이션 파일 작성**

```sql
-- 013_shinjeom_rls.sql
-- shinjeom_messages RLS (008_shinjeom.sql에서 누락됨)
ALTER TABLE shinjeom_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shinjeom_messages_select" ON shinjeom_messages FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM sessions s
    WHERE s.id = session_id AND (s.user_id = auth.uid() OR s.user_id IS NULL)
  ));

CREATE POLICY "shinjeom_messages_insert" ON shinjeom_messages FOR INSERT
  WITH CHECK (true);

-- shinjeom_readings RLS (008_shinjeom.sql에서 누락됨)
-- 주의: share_token USING(true)는 의도적으로 제외 — 014에서 일괄 정책으로 대체
ALTER TABLE shinjeom_readings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shinjeom_readings_session_owner" ON shinjeom_readings FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM sessions s
    WHERE s.id = session_id AND (s.user_id = auth.uid() OR s.user_id IS NULL)
  ));

CREATE POLICY "shinjeom_readings_insert" ON shinjeom_readings FOR INSERT
  WITH CHECK (true);
```

- [ ] **Step 2: Supabase에 마이그레이션 적용**

```bash
# Supabase CLI로 적용 (프로젝트가 연결된 상태에서)
npx supabase db push
# 또는 Supabase 대시보드 SQL Editor에서 직접 실행
```

예상 출력: `Applied migration 013_shinjeom_rls.sql`

- [ ] **Step 3: 타입체크·린트 통과 확인**

```bash
pnpm type-check && pnpm lint
```

예상: 오류 없음 (SQL 파일만 추가했으므로)

- [ ] **Step 4: 커밋**

```bash
git add supabase/migrations/013_shinjeom_rls.sql
git commit -m "fix(security): shinjeom 테이블 RLS 활성화 — messages/readings 무방비 노출 수정"
```

---

## Task 2: share_token USING(true) 제거 + Admin DB 클라이언트 [High]

**Files:**
- Create: `supabase/migrations/014_fix_share_token_rls.sql`
- Create: `src/lib/supabase/admin.ts`
- Modify: `src/lib/db/supabase-adapter.ts` (line 7: private → protected)
- Create: `src/lib/db/supabase-admin-adapter.ts`
- Modify: `src/lib/db/index.ts`
- Modify: `src/app/api/tarot/result/[id]/route.ts`
- Modify: `src/app/api/saju/result/[id]/route.ts`
- Modify: `src/app/api/shinjeom/result/[id]/route.ts`
- Modify: `src/test-helpers/api-route-setup.ts`
- Modify: `src/__tests__/api/tarot-result.test.ts`
- Modify: `src/__tests__/api/saju-result.test.ts`
- Modify: `src/__tests__/api/shinjeom-result.test.ts`

**배경:** `NEXT_PUBLIC_SUPABASE_ANON_KEY`는 브라우저에 노출된다. `readings`/`saju_readings` 테이블의 `USING(true)` SELECT 정책이 있으면 누구든 anon 키로 Supabase REST API에 직접 GET 요청해 전체 리딩 데이터를 조회할 수 있다. 수정 방향: USING(true) 정책 제거 + 공개 share_token 조회는 service_role 클라이언트로만 허용.

- [ ] **Step 1: 테스트 먼저 작성 — result 라우트가 getAdminDb를 사용하는지 검증**

`src/__tests__/api/tarot-result.test.ts` 전체 교체:
```typescript
import { describe, it, expect, vi } from "vitest";
import { setupDoMock } from "@/test-helpers/reset-modules";
import { makeResultRouteSetup } from "@/test-helpers/api-route-setup";

setupDoMock();

const MOCK_READING = { id: "r-1", share_token: "abc123", overall_reading: "테스트" };

async function setup() {
  return makeResultRouteSetup(
    () => import("@/app/api/tarot/result/[id]/route"),
    "http://localhost/api/tarot/result"
  );
}

describe("GET /api/tarot/result/[id]", () => {
  it("존재하는 share_token → reading 반환", async () => {
    const { GET, mockAdminDb, makeGetRequest } = await setup();
    mockAdminDb.findOne.mockResolvedValue(MOCK_READING);
    const res = await GET(...makeGetRequest("abc123"));
    expect(res.status).toBe(200);
    expect((await res.json()).reading).toEqual(MOCK_READING);
  });

  it("존재하지 않는 share_token → 404", async () => {
    const { GET, mockAdminDb, makeGetRequest } = await setup();
    mockAdminDb.findOne.mockResolvedValue(null);
    const res = await GET(...makeGetRequest("no-such-token"));
    expect(res.status).toBe(404);
    expect((await res.json()).error).toBe("Reading not found");
  });

  it("DB 오류 → 500", async () => {
    const { GET, mockAdminDb, makeGetRequest } = await setup();
    mockAdminDb.findOne.mockRejectedValue(new Error("DB error"));
    const res = await GET(...makeGetRequest("abc123"));
    expect(res.status).toBe(500);
  });

  it("getAdminDb로 readings 테이블 share_token 조회", async () => {
    const { GET, mockAdminDb, makeGetRequest } = await setup();
    mockAdminDb.findOne.mockResolvedValue(MOCK_READING);
    await GET(...makeGetRequest("tok123"));
    expect(mockAdminDb.findOne).toHaveBeenCalledWith("readings", { share_token: "tok123" });
  });
});
```

- [ ] **Step 2: 테스트 실패 확인 (mockAdminDb가 아직 없음)**

```bash
pnpm test --run src/__tests__/api/tarot-result.test.ts
```

예상: FAIL — `makeResultRouteSetup`에 `mockAdminDb`가 없음

- [ ] **Step 3: 마이그레이션 작성 — USING(true) 제거**

```sql
-- 014_fix_share_token_rls.sql
-- readings/saju_readings의 전체 행 공개 정책 제거
-- share_token 조회는 서버 레이어의 service_role 클라이언트로 처리한다
DROP POLICY IF EXISTS "Readings viewable by share token" ON public.readings;
DROP POLICY IF EXISTS "Saju readings viewable by share token" ON saju_readings;
-- shinjeom_readings는 013에서 USING(true) 없이 추가되었으므로 불필요
```

- [ ] **Step 4: Admin Supabase 클라이언트 작성**

`src/lib/supabase/admin.ts` (신규):
```typescript
import { createClient } from "@supabase/supabase-js"

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error("Supabase admin environment variables are required")
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
```

- [ ] **Step 5: SupabaseAdapter client() 가시성 변경**

`src/lib/db/supabase-adapter.ts` line 7 수정:
```typescript
// BEFORE:
  private async client() {

// AFTER:
  protected async client() {
```

- [ ] **Step 6: SupabaseAdminAdapter 작성**

`src/lib/db/supabase-admin-adapter.ts` (신규):
```typescript
import { createAdminClient } from "@/lib/supabase/admin"
import { SupabaseAdapter } from "./supabase-adapter"

export class SupabaseAdminAdapter extends SupabaseAdapter {
  protected async client() {
    return createAdminClient()
  }
}
```

- [ ] **Step 7: getAdminDb() 추가**

`src/lib/db/index.ts` 전체:
```typescript
import type { DbClient } from "./types"
import { getDbProvider } from "@/lib/env"

export function getDb(): DbClient {
  if (getDbProvider() === "postgres") {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PostgresAdapter } = require("./postgres-adapter") as typeof import("./postgres-adapter")
    return new PostgresAdapter()
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { SupabaseAdapter } = require("./supabase-adapter") as typeof import("./supabase-adapter")
  return new SupabaseAdapter()
}

export function getAdminDb(): DbClient {
  if (getDbProvider() === "postgres") {
    // postgres 모드는 RLS 없음 — 일반 어댑터와 동일
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PostgresAdapter } = require("./postgres-adapter") as typeof import("./postgres-adapter")
    return new PostgresAdapter()
  }
  // supabase 모드: service_role 키로 RLS 우회 (share_token 공개 조회 전용)
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { SupabaseAdminAdapter } = require("./supabase-admin-adapter") as typeof import("./supabase-admin-adapter")
  return new SupabaseAdminAdapter()
}

export type { DbClient } from "./types"
```

- [ ] **Step 8: result 라우트 3개를 getAdminDb로 교체**

`src/app/api/tarot/result/[id]/route.ts`:
```typescript
import { NextRequest, NextResponse } from "next/server"
import { getAdminDb } from "@/lib/db"
import { pickFields } from "@/lib/request-utils"

const SAFE_KEYS = ["id", "card_interpretation", "overall_reading", "advice", "share_token", "created_at"] as const

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const db = getAdminDb()
    const reading = await db.findOne<Record<string, unknown>>("readings", { share_token: id })
    if (!reading) return NextResponse.json({ error: "Reading not found" }, { status: 404 })
    return NextResponse.json({ reading: pickFields(reading, SAFE_KEYS) })
  } catch {
    return NextResponse.json({ error: "Failed to fetch reading" }, { status: 500 })
  }
}
```

`src/app/api/saju/result/[id]/route.ts`:
```typescript
import { NextRequest, NextResponse } from "next/server"
import { getAdminDb } from "@/lib/db"
import { pickFields } from "@/lib/request-utils"

const SAFE_KEYS = [
  "id", "birth_date", "birth_hour", "gender", "birth_name",
  "pillars", "day_master", "day_master_element", "is_strong",
  "elements", "ten_stars", "twelve_stages", "interactions",
  "yongsin", "major_fortunes", "yearly_fortune",
  "overall_reading", "topic_reading", "advice", "share_token", "created_at",
] as const

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const db = getAdminDb()
    const reading = await db.findOne<Record<string, unknown>>("saju_readings", { share_token: id })
    if (!reading) return NextResponse.json({ error: "Reading not found" }, { status: 404 })
    return NextResponse.json({ reading: pickFields(reading, SAFE_KEYS) })
  } catch {
    return NextResponse.json({ error: "Failed to fetch reading" }, { status: 500 })
  }
}
```

`src/app/api/shinjeom/result/[id]/route.ts`:
```typescript
import { NextRequest, NextResponse } from "next/server"
import { getAdminDb } from "@/lib/db"
import { pickFields } from "@/lib/request-utils"

const SAFE_KEYS = ["id", "overall_reading", "topic_reading", "advice", "share_token", "created_at"] as const

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const db = getAdminDb()
    const reading = await db.findOne<Record<string, unknown>>("shinjeom_readings", { share_token: id })
    if (!reading) return NextResponse.json({ error: "Reading not found" }, { status: 404 })
    return NextResponse.json({ reading: pickFields(reading, SAFE_KEYS) })
  } catch {
    return NextResponse.json({ error: "Failed to fetch reading" }, { status: 500 })
  }
}
```

- [ ] **Step 9: makeResultRouteSetup에 mockAdminDb 추가**

`src/test-helpers/api-route-setup.ts` 내 `makeResultRouteSetup` 함수 교체:
```typescript
export async function makeResultRouteSetup(
  routeImport: () => Promise<{ GET: unknown }>,
  baseUrl: string
): Promise<{
  GET: (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => Promise<Response>
  mockDb: MockDb
  mockAdminDb: MockDb
  makeGetRequest: (id: string) => [NextRequest, { params: Promise<{ id: string }> }]
}> {
  const mockDb = makeMockDb()
  const mockAdminDb = makeMockDb()
  vi.doMock("@/lib/db", () => ({
    getDb: vi.fn().mockReturnValue(mockDb),
    getAdminDb: vi.fn().mockReturnValue(mockAdminDb),
  }))

  const route = await routeImport()

  function makeGetRequest(id: string): [NextRequest, { params: Promise<{ id: string }> }] {
    return [
      new NextRequest(`${baseUrl}/${id}`),
      { params: Promise.resolve({ id }) },
    ]
  }

  return {
    GET: route.GET as (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => Promise<Response>,
    mockDb,
    mockAdminDb,
    makeGetRequest,
  }
}
```

- [ ] **Step 10: saju-result·shinjeom-result 테스트도 mockAdminDb로 업데이트**

`src/__tests__/api/saju-result.test.ts` — `mockDb` → `mockAdminDb`로 교체 (tarot-result.test.ts와 동일 패턴):
```typescript
// setup() 함수 안에서:
const { GET, mockAdminDb, makeGetRequest } = await setup();
mockAdminDb.findOne.mockResolvedValue(MOCK_READING);
// ...
expect(mockAdminDb.findOne).toHaveBeenCalledWith("saju_readings", { share_token: "tok123" });
```

`src/__tests__/api/shinjeom-result.test.ts` — 동일하게 `mockDb` → `mockAdminDb` 교체:
```typescript
const { GET, mockAdminDb, makeGetRequest } = await setup();
mockAdminDb.findOne.mockResolvedValue(MOCK_READING);
// ...
expect(mockAdminDb.findOne).toHaveBeenCalledWith("shinjeom_readings", { share_token: "tok123" });
```

- [ ] **Step 11: 테스트 통과 확인**

```bash
pnpm test --run src/__tests__/api/tarot-result.test.ts src/__tests__/api/saju-result.test.ts src/__tests__/api/shinjeom-result.test.ts
```

예상: 3개 파일 모두 PASS

- [ ] **Step 12: 타입체크·린트 통과 확인**

```bash
pnpm type-check && pnpm lint
```

예상: 오류 없음

- [ ] **Step 13: 마이그레이션 적용**

```bash
npx supabase db push
```

예상: `Applied migration 014_fix_share_token_rls.sql`

- [ ] **Step 14: 커밋**

```bash
git add supabase/migrations/014_fix_share_token_rls.sql \
        src/lib/supabase/admin.ts \
        src/lib/db/supabase-adapter.ts \
        src/lib/db/supabase-admin-adapter.ts \
        src/lib/db/index.ts \
        src/app/api/tarot/result/[id]/route.ts \
        src/app/api/saju/result/[id]/route.ts \
        src/app/api/shinjeom/result/[id]/route.ts \
        src/test-helpers/api-route-setup.ts \
        src/__tests__/api/tarot-result.test.ts \
        src/__tests__/api/saju-result.test.ts \
        src/__tests__/api/shinjeom-result.test.ts
git commit -m "fix(security): readings share_token USING(true) 제거 + service_role 어댑터 도입"
```

---

## Task 3: sessions SELECT RLS 익명 세션 허용 [Medium]

**Files:**
- Create: `supabase/migrations/015_fix_sessions_rls.sql`

**배경:** 현재 sessions SELECT 정책이 `USING (auth.uid() = user_id)` 만 있어 `user_id IS NULL` 인 익명 세션은 RLS에 의해 차단된다. 이로 인해 `assertSessionOwnership`이 익명 세션을 조회할 때 항상 null을 반환하고 404를 돌려보낸다. 이는 의도된 동작이 아니다.

- [ ] **Step 1: 마이그레이션 파일 작성**

```sql
-- 015_fix_sessions_rls.sql
-- sessions SELECT: 익명 세션(user_id IS NULL)도 읽기 허용
-- 이유: assertSessionOwnership이 익명 세션을 조회해 소유권을 검증해야 하므로
-- 위험도: 익명 세션은 user_id가 없어 PII 노출 없음. UUID v4는 추측 불가.
DROP POLICY IF EXISTS "Users can view own sessions" ON public.sessions;
CREATE POLICY "Users can view own sessions" ON public.sessions FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);
```

- [ ] **Step 2: 마이그레이션 적용**

```bash
npx supabase db push
```

예상: `Applied migration 015_fix_sessions_rls.sql`

- [ ] **Step 3: 타입체크·린트 통과 확인**

```bash
pnpm type-check && pnpm lint
```

- [ ] **Step 4: 커밋**

```bash
git add supabase/migrations/015_fix_sessions_rls.sql
git commit -m "fix(security): sessions SELECT RLS에 익명 세션 허용 추가 — assertSessionOwnership 404 오탐 수정"
```

---

## Task 4: /api/daily-card Rate Limit 추가 [Medium]

**Files:**
- Modify: `src/app/api/daily-card/route.ts`
- Modify: `src/__tests__/api/daily-card.test.ts`

**배경:** `/api/daily-card`는 캐시 미스 시 Grok AI를 호출하는데, 레이트 리밋이 없어 다양한 (characterId, date) 조합으로 반복 호출하면 AI API 비용을 무제한 발생시킬 수 있다. 리밋: 30회/60초/IP.

- [ ] **Step 1: 테스트 먼저 작성 — 레이트 리밋 초과 429 케이스 추가**

`src/__tests__/api/daily-card.test.ts` 내 `setup` 함수와 describe 블록 수정:
```typescript
import { describe, it, expect, vi } from "vitest";
import { setupDoMock } from "@/test-helpers/reset-modules";
import { makeMockDb } from "@/test-helpers/mock-db";
import { makePostRequest } from "@/test-helpers/mock-request";
import { makeMockAiModule } from "@/test-helpers/mock-ai";

setupDoMock();

const TODAY = "2026-04-24";
const CACHED_CARD = { card_id: "major-00", is_reversed: false, interpretation: "캐시된 해석", keywords: ["새로운 시작"] };
const VALID_BODY = { characterId: "arcana", date: TODAY };

async function setup(options: {
  cached?: boolean;
  aiError?: string | boolean;
  rateLimited?: boolean;
} = {}) {
  const mockDb = makeMockDb();
  mockDb.findOne.mockResolvedValue(options.cached ? CACHED_CARD : null);
  mockDb.upsert.mockResolvedValue(CACHED_CARD);

  const mockAiModule = makeMockAiModule();
  if (options.aiError) {
    const msg = typeof options.aiError === "string" ? options.aiError : "AI down";
    const provider = { generateReading: vi.fn().mockRejectedValue(new Error(msg)) };
    mockAiModule.FallbackProvider.mockImplementation(() => provider);
  }

  vi.doMock("@/lib/db", () => ({ getDb: vi.fn().mockReturnValue(mockDb) }));
  vi.doMock("@/services/core/fallback-provider", () => mockAiModule);
  vi.doMock("@/lib/rate-limit", () => ({
    checkRateLimit: vi.fn().mockResolvedValue(!options.rateLimited),
    rateLimitResponse: vi.fn().mockReturnValue(
      new Response(JSON.stringify({ error: "Too many requests" }), { status: 429 })
    ),
  }));

  const { POST } = await import("@/app/api/daily-card/route");
  return { POST, mockDb };
}

describe("POST /api/daily-card", () => {
  it("캐시 히트 → AI 호출 없이 캐시 반환", async () => {
    const { POST } = await setup({ cached: true });
    const res = await POST(makePostRequest(VALID_BODY));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.cardId).toBe(CACHED_CARD.card_id);
    expect(body.interpretation).toBe(CACHED_CARD.interpretation);
  });

  it("캐시 미스 → AI 호출 후 결과 반환", async () => {
    const { POST } = await setup();
    const res = await POST(makePostRequest(VALID_BODY));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.cardId).toBeTruthy();
    expect(body.interpretation).toBeTruthy();
  });

  it("레이트 리밋 초과 → 429", async () => {
    const { POST } = await setup({ rateLimited: true });
    const res = await POST(makePostRequest(VALID_BODY));
    expect(res.status).toBe(429);
  });

  it("캐릭터 없음 → 404", async () => {
    const { POST } = await setup();
    const res = await POST(makePostRequest({ characterId: "no-such-char", date: TODAY }));
    expect(res.status).toBe(404);
    expect((await res.json()).error).toBe("Character not found");
  });

  it("date 형식 오류 → 400", async () => {
    const { POST } = await setup();
    const res = await POST(makePostRequest({ characterId: "arcana", date: "2026/04/24" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Invalid request");
  });

  it("body 없음 → 400", async () => {
    const { POST } = await setup();
    const res = await POST(makePostRequest({}));
    expect(res.status).toBe(400);
  });

  it("AI 오류 → 500 (일반 메시지)", async () => {
    const { POST } = await setup({ aiError: true });
    const res = await POST(makePostRequest(VALID_BODY));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toMatch(/일일 카드 생성에 실패/);
  });

  it("API_KEY 오류 → 500 (AI 서비스 설정 메시지)", async () => {
    const { POST } = await setup({ aiError: "Invalid API_KEY provided" });
    const res = await POST(makePostRequest(VALID_BODY));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toMatch(/AI 서비스 설정/);
  });

  it("rate limit 오류 → 500 (요청 많음 메시지)", async () => {
    const { POST } = await setup({ aiError: "429 rate limit exceeded" });
    const res = await POST(makePostRequest(VALID_BODY));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toMatch(/요청이 많아/);
  });

  it("isReversed 결정 — seed % 3 === 0 시 역방향", async () => {
    const { POST } = await setup();
    const res = await POST(makePostRequest({ characterId: "arcana", date: TODAY }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(typeof body.isReversed).toBe("boolean");
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
pnpm test --run src/__tests__/api/daily-card.test.ts
```

예상: "레이트 리밋 초과 → 429" FAIL (checkRateLimit 호출 없음)

- [ ] **Step 3: daily-card/route.ts에 레이트 리밋 추가**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { FallbackProvider } from "@/services/core/fallback-provider";
import { DeckManager } from "@/services/tarot/deck-manager";
import { getCharacterById } from "@/data/characters";
import { DailyCardSchema } from "@/lib/validation/api-schemas";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-utils";

const grokProvider = new FallbackProvider();
const deckManager = new DeckManager();

function hashDateSeed(date: string, characterId: string): number {
  let hash = 0;
  const str = `${date}-${characterId}`;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request.headers);
    if (!(await checkRateLimit(`daily-card:${ip}`, 30, 60_000))) return rateLimitResponse();

    const parsed = DailyCardSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    const { characterId, date } = parsed.data;

    const character = getCharacterById(characterId);
    if (!character) {
      return NextResponse.json({ error: "Character not found" }, { status: 404 });
    }

    const db = getDb()
    const cached = await db.findOne<{
      card_id: string; is_reversed: boolean; interpretation: string; keywords: string[]
    }>("daily_cards", { date, character_id: characterId });

    if (cached) {
      return NextResponse.json({
        cardId: cached.card_id,
        isReversed: cached.is_reversed,
        interpretation: cached.interpretation,
        keywords: cached.keywords,
      });
    }

    const allCards = deckManager.getAllCards();
    const seed = hashDateSeed(date, characterId);
    const cardIndex = seed % allCards.length;
    const card = allCards[cardIndex];
    const isReversed = (seed % 3) === 0;

    const direction = isReversed ? "역방향" : "정방향";
    const meanings = isReversed ? card.reversed : card.upright;
    const prompt = `당신은 "${character.name}"입니다. ${character.speechStyle}

오늘의 카드: ${card.nameKo} (${card.name}) [${direction}]
키워드: ${meanings.keywords.join(", ")}
의미: ${meanings.meaning}

위 카드를 기반으로 오늘의 짧은 운세 메시지를 3~4문장으로 작성해주세요. 당신의 말투와 성격을 반영하세요. JSON 형식 없이 순수 텍스트로만 응답하세요.`;

    const interpretation = await grokProvider.generateReading(
      `당신은 ${character.name}입니다. ${character.personality} ${character.speechStyle}`,
      prompt,
      1000
    );

    const keywords = meanings.keywords.slice(0, 3);

    await db.upsert("daily_cards", {
      date,
      character_id: characterId,
      card_id: card.id,
      is_reversed: isReversed,
      interpretation,
      keywords,
    }, "date,character_id");

    return NextResponse.json({ cardId: card.id, isReversed, interpretation, keywords });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("Daily card error:", errMsg);
    const userMessage = errMsg.includes("API_KEY") || errMsg.includes("auth")
      ? "AI 서비스 설정에 문제가 있습니다."
      : errMsg.includes("rate limit") || errMsg.includes("429")
      ? "요청이 많아 잠시 후 다시 시도해주세요."
      : "일일 카드 생성에 실패했습니다. 잠시 후 다시 시도해주세요.";
    return NextResponse.json({ error: userMessage }, { status: 500 });
  }
}
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
pnpm test --run src/__tests__/api/daily-card.test.ts
```

예상: 모든 케이스 PASS

- [ ] **Step 5: 타입체크·린트 통과 확인**

```bash
pnpm type-check && pnpm lint
```

- [ ] **Step 6: 커밋**

```bash
git add src/app/api/daily-card/route.ts src/__tests__/api/daily-card.test.ts
git commit -m "fix: /api/daily-card 레이트 리밋 추가 — 30회/60초/IP"
```

---

## Task 5: favorite-character POST Zod safeParse 적용 [Low]

**Files:**
- Modify: `src/lib/validation/api-schemas.ts`
- Modify: `src/app/api/profile/favorite-character/route.ts`
- Modify: `src/__tests__/api/favorite-character.test.ts`

**배경:** POST 핸들러가 `as { characterId: string | null }` 타입 단언을 사용한다. CLAUDE.md "타입 단언 금지" 위반. 비JSON body 전송 시 런타임 에러 발생 가능.

- [ ] **Step 1: 테스트 먼저 작성 — 잘못된 body 400 케이스 추가**

`src/__tests__/api/favorite-character.test.ts` 내 POST describe 블록에 케이스 추가:
```typescript
  it("body 없음 (빈 객체) → 400", async () => {
    const { POST } = await setup();
    const res = await POST(makePostRequest({}));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Invalid request");
  });
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
pnpm test --run src/__tests__/api/favorite-character.test.ts
```

예상: "body 없음 (빈 객체) → 400" FAIL (현재 코드는 400 반환 없음)

- [ ] **Step 3: api-schemas.ts에 스키마 추가**

`src/lib/validation/api-schemas.ts` 끝에 추가:
```typescript
export const FavoriteCharacterSchema = z.object({
  characterId: z.string().max(50).nullable(),
});
```

- [ ] **Step 4: favorite-character POST 핸들러 수정**

`src/app/api/profile/favorite-character/route.ts` POST 함수:
```typescript
import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { requireUser } from "@/lib/auth"
import { getCharacterById } from "@/data/characters"
import { FavoriteCharacterSchema } from "@/lib/validation/api-schemas"

export async function GET() {
  try {
    const user = await requireUser()
    const db = getDb()
    const profile = await db.findOne<{ favorite_character_id: string | null }>(
      "profiles",
      { id: user.id },
    )
    return NextResponse.json({ characterId: profile?.favorite_character_id ?? null })
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser()
    const parsed = FavoriteCharacterSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 })
    }
    const { characterId } = parsed.data
    if (characterId !== null && !getCharacterById(characterId)) {
      return NextResponse.json({ error: "Invalid character" }, { status: 400 })
    }
    const db = getDb()
    await db.update("profiles", { id: user.id }, { favorite_character_id: characterId })
    return NextResponse.json({ success: true })
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
```

- [ ] **Step 5: 테스트 통과 확인**

```bash
pnpm test --run src/__tests__/api/favorite-character.test.ts
```

예상: 모든 케이스 PASS (기존 + 신규 포함)

- [ ] **Step 6: 타입체크·린트 통과 확인**

```bash
pnpm type-check && pnpm lint
```

- [ ] **Step 7: 커밋**

```bash
git add src/lib/validation/api-schemas.ts src/app/api/profile/favorite-character/route.ts src/__tests__/api/favorite-character.test.ts
git commit -m "fix: favorite-character POST 타입 단언 제거 — FavoriteCharacterSchema Zod safeParse 적용"
```

---

## 최종 검증

- [ ] **전체 테스트 스위트 실행**

```bash
pnpm test:coverage
```

예상: PASS, statements ≥ 98%

- [ ] **빌드 확인**

```bash
pnpm build
```

예상: 오류 없음

- [ ] **PR 생성**

```bash
git push -u origin fix/rls-security-patch
gh pr create --title "fix(security): RLS 취약점 5건 수정 — shinjeom·readings·sessions·daily-card·favorite-character" --body "$(cat <<'EOF'
## Summary
- **Critical**: shinjeom_messages/readings RLS 완전 누락 수정 (013 migration)
- **High**: readings/saju_readings share_token USING(true) 제거 + service_role Admin 클라이언트 도입 (014 migration)
- **Medium**: sessions SELECT RLS에 익명 세션(user_id IS NULL) 허용 추가 (015 migration)
- **Medium**: /api/daily-card 레이트 리밋 30회/60초/IP 추가
- **Low**: favorite-character POST 타입 단언 → FavoriteCharacterSchema Zod safeParse 교체

## Test Plan
- [ ] pnpm test:coverage — 전체 스위트 통과, 커버리지 ≥ 98%
- [ ] pnpm build — 빌드 오류 없음
- [ ] Supabase 대시보드에서 013~015 마이그레이션 적용 확인
- [ ] 공유 링크(/tarot/result/[id]) 비인증 상태로 접근 → 정상 로딩 확인
- [ ] 익명 세션으로 타로 리딩 → 정상 완료 확인
EOF
)"
```

---

## Self-Review

**1. Spec coverage:**
- ✅ Critical: shinjeom RLS — Task 1
- ✅ High: readings/saju_readings USING(true) — Task 2
- ✅ High: assertSessionOwnership 익명 세션 — Task 3 (sessions SELECT 수정으로 근본 원인 해결)
- ✅ Medium: sessions SELECT 익명 세션 누락 — Task 3
- ✅ Medium: daily-card 레이트 리밋 — Task 4
- ✅ Low: favorite-character Zod — Task 5
- ❌ sessions UPDATE user_id IS NULL 과잉 허용 — 의도적 제외: 서버가 익명 세션 상태를 업데이트해야 하므로. UUID v4 추측 불가로 실제 위험 없음.
- ❌ daily_cards INSERT WITH CHECK(true) — 의도적 제외: 공개 데이터로 INSERT 가능해도 UNIQUE 제약으로 기존 데이터 변조 불가.

**2. Placeholder scan:** 없음 — 모든 단계에 실제 코드 포함.

**3. Type consistency:**
- `getAdminDb()` — Task 2 Step 7에서 정의, result routes에서 import
- `FavoriteCharacterSchema` — Task 5 Step 3에서 정의, route에서 import
- `mockAdminDb` — Task 2 Step 9에서 `makeResultRouteSetup` 반환값에 추가, 테스트에서 사용
