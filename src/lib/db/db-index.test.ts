/**
 * getAdminDb / getDb 팩토리 함수 테스트
 *
 * index.ts의 require('./xxx') 호출: vite-node가 createRequire(href)를 통해
 * 자체 require shim을 사용. vi.mock()을 통해 모듈 캐시에 등록된 경로로
 * 인터셉트하지 않으므로, Module.prototype.require를 직접 스텁한다.
 */
import { describe, it, expect, vi, beforeAll, afterAll } from "vitest"
import Module from "node:module"
import path from "node:path"

const DB_DIR = path.resolve(__dirname)

class MockSupabaseAdminAdapter {}
class MockSupabaseAdapter {}
class MockPostgresAdapter {}

// Module.prototype.require 스텁 — require('./xxx') 호출을 가로챔
const originalRequire = Module.prototype.require
beforeAll(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Module.prototype.require = function patchedRequire(id: string): any {
    const resolved = path.resolve(DB_DIR, id)
    if (resolved.endsWith("supabase-admin-adapter") || resolved.includes("supabase-admin-adapter")) {
      return { SupabaseAdminAdapter: MockSupabaseAdminAdapter }
    }
    if (resolved.endsWith("supabase-adapter") || resolved.includes("supabase-adapter")) {
      return { SupabaseAdapter: MockSupabaseAdapter }
    }
    if (resolved.endsWith("postgres-adapter") || resolved.includes("postgres-adapter")) {
      return { PostgresAdapter: MockPostgresAdapter }
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return originalRequire.call(this, id)
  } as NodeRequire
})

afterAll(() => {
  Module.prototype.require = originalRequire
})

vi.mock("@/lib/env", () => ({
  getDbProvider: vi.fn().mockReturnValue("supabase"),
}))

import { getAdminDb, getDb } from "./index"
import { getDbProvider } from "@/lib/env"

const mockGetDbProvider = vi.mocked(getDbProvider)

describe("getAdminDb", () => {
  it("supabase 모드: SupabaseAdminAdapter 인스턴스 반환", () => {
    mockGetDbProvider.mockReturnValue("supabase")
    const db = getAdminDb()
    expect(db).toBeInstanceOf(MockSupabaseAdminAdapter)
  })

  it("postgres 모드: PostgresAdapter 인스턴스 반환", () => {
    mockGetDbProvider.mockReturnValue("postgres")
    const db = getAdminDb()
    expect(db).toBeInstanceOf(MockPostgresAdapter)
  })
})

describe("getDb", () => {
  it("supabase 모드: SupabaseAdapter 인스턴스 반환", () => {
    mockGetDbProvider.mockReturnValue("supabase")
    const db = getDb()
    expect(db).toBeInstanceOf(MockSupabaseAdapter)
  })

  it("postgres 모드: PostgresAdapter 인스턴스 반환", () => {
    mockGetDbProvider.mockReturnValue("postgres")
    const db = getDb()
    expect(db).toBeInstanceOf(MockPostgresAdapter)
  })
})
