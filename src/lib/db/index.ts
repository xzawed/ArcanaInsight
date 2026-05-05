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
