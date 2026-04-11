import type { DbClient } from "./types"

export function getDb(): DbClient {
  if (process.env.DB_PROVIDER === "postgres") {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PostgresAdapter } = require("./postgres-adapter") as typeof import("./postgres-adapter")
    return new PostgresAdapter()
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { SupabaseAdapter } = require("./supabase-adapter") as typeof import("./supabase-adapter")
  return new SupabaseAdapter()
}

export type { DbClient } from "./types"
