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

export type { DbClient } from "./types"
