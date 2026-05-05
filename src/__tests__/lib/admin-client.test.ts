import { describe, it, expect, vi, afterEach } from "vitest"

afterEach(() => {
  vi.resetModules()
})

describe("createAdminClient", () => {
  it("환경변수 미설정 시 오류 발생", async () => {
    const savedUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const savedKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    delete process.env.SUPABASE_SERVICE_ROLE_KEY

    vi.doMock("@supabase/supabase-js", () => ({
      createClient: vi.fn().mockReturnValue({ auth: {}, from: vi.fn() }),
    }))

    const { createAdminClient } = await import("@/lib/supabase/admin")
    expect(() => createAdminClient()).toThrow("Supabase admin environment variables are required")

    if (savedUrl !== undefined) process.env.NEXT_PUBLIC_SUPABASE_URL = savedUrl
    if (savedKey !== undefined) process.env.SUPABASE_SERVICE_ROLE_KEY = savedKey
  })

  it("환경변수 설정 시 service_role 클라이언트 반환", async () => {
    const savedUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const savedKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co"
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key-test"

    const mockCreateClient = vi.fn().mockReturnValue({ auth: {}, from: vi.fn() })
    vi.doMock("@supabase/supabase-js", () => ({
      createClient: mockCreateClient,
    }))

    const { createAdminClient } = await import("@/lib/supabase/admin")
    createAdminClient()
    expect(mockCreateClient).toHaveBeenCalledWith(
      "https://test.supabase.co",
      "service-role-key-test",
      { auth: { persistSession: false, autoRefreshToken: false } }
    )

    if (savedUrl !== undefined) process.env.NEXT_PUBLIC_SUPABASE_URL = savedUrl
    else delete process.env.NEXT_PUBLIC_SUPABASE_URL
    if (savedKey !== undefined) process.env.SUPABASE_SERVICE_ROLE_KEY = savedKey
    else delete process.env.SUPABASE_SERVICE_ROLE_KEY
  })
})
