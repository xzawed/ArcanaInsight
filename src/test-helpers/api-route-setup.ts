import { vi } from "vitest"
import { NextRequest } from "next/server"
import { makeMockDb } from "@/test-helpers/mock-db"
import { makeAuthMock, MOCK_USER } from "@/test-helpers/mock-auth"
import { makeMockAiModule } from "@/test-helpers/mock-ai"

type MockDb = ReturnType<typeof makeMockDb>

/**
 * POST session 라우트 (tarot/saju/shinjeom) 공통 setup.
 * vi.doMock → DB·Auth 모킹 → 동적 import 순으로 실행.
 */
export async function makeSessionRouteSetup<TSession>(
  routeImport: () => Promise<{ POST: unknown }>,
  mockSession: TSession,
  options: { user?: typeof MOCK_USER | null } = {}
): Promise<{ POST: (req: Request) => Promise<Response>; mockDb: MockDb }> {
  const mockDb = makeMockDb()
  mockDb.insert.mockResolvedValue(mockSession)

  const user = "user" in options ? options.user : MOCK_USER
  vi.doMock("@/lib/db", () => ({ getDb: vi.fn().mockReturnValue(mockDb) }))
  vi.doMock("@/lib/auth", () => makeAuthMock(user))

  const route = await routeImport()
  return { POST: route.POST as (req: Request) => Promise<Response>, mockDb }
}

/**
 * GET result 라우트 (tarot/saju/shinjeom) 공통 setup.
 * vi.doMock → DB 모킹 → 동적 import 순으로 실행.
 * makeGetRequest 로 동적 ID 전달.
 */
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

/**
 * POST SSE streaming 라우트 (saju-reading / shinjeom-message) 공통 setup.
 * rate-limit·DB·Auth·FallbackProvider 모킹.
 */
export async function makeStreamingRouteSetup(
  routeImport: () => Promise<{ POST: unknown }>,
  mockDbSetup?: (db: MockDb) => void
): Promise<{ POST: (req: Request) => Promise<Response>; mockDb: MockDb }> {
  const mockDb = makeMockDb()
  if (mockDbSetup) mockDbSetup(mockDb)

  vi.doMock("@/lib/rate-limit", () => ({
    checkRateLimit: vi.fn().mockReturnValue(true),
    rateLimitResponse: vi.fn(),
  }))
  vi.doMock("@/lib/db", () => ({ getDb: vi.fn().mockReturnValue(mockDb) }))
  vi.doMock("@/lib/auth", () => makeAuthMock())
  vi.doMock("@/services/core/fallback-provider", () => makeMockAiModule())

  const route = await routeImport()
  return { POST: route.POST as (req: Request) => Promise<Response>, mockDb }
}
