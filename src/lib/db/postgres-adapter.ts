import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import { eq, and } from "drizzle-orm"
import type { PgTable, PgColumn } from "drizzle-orm/pg-core"
import type { ColumnBaseConfig, ColumnDataType } from "drizzle-orm"
import * as schema from "./schema/index"
import type { DbClient } from "./types"

let _db: ReturnType<typeof drizzle> | null = null

function getConnection() {
  if (!_db) {
    if (!process.env.POSTGRES_URL) throw new Error("POSTGRES_URL is required")
    const client = postgres(process.env.POSTGRES_URL, { max: 10 })
    _db = drizzle(client, { schema })
  }
  return _db
}

const TABLE_MAP: Record<string, PgTable> = {
  profiles: schema.profiles,
  sessions: schema.sessions,
  session_cards: schema.sessionCards,
  readings: schema.readings,
  daily_cards: schema.dailyCards,
  saju_readings: schema.sajuReadings,
  shinjeom_messages: schema.shinjeomMessages,
  shinjeom_readings: schema.shinjeomReadings,
  services: schema.services,
}

function resolveTable(name: string): PgTable {
  const t = TABLE_MAP[name]
  if (!t) throw new Error(`Unknown table: ${name}`)
  return t
}

function snakeToCamel(s: string): string {
  return s.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase())
}

function buildConditions(table: PgTable, where: Record<string, unknown>) {
  return Object.entries(where).map(([k, v]) => {
    const col = (table as unknown as Record<string, unknown>)[k]
      ?? (table as unknown as Record<string, unknown>)[snakeToCamel(k)]
    if (!col) throw new Error(`Unknown column: ${k}`)
    return eq(col as Parameters<typeof eq>[0], v)
  })
}

export class PostgresAdapter implements DbClient {
  async findOne<T>(table: string, where: Record<string, unknown>): Promise<T | null> {
    const db = getConnection()
    const t = resolveTable(table)
    const conditions = buildConditions(t, where)
    const result = await db.select().from(t).where(and(...conditions)).limit(1)
    return (result[0] as T) ?? null
  }

  async findMany<T>(table: string, where?: Record<string, unknown>): Promise<T[]> {
    const db = getConnection()
    const t = resolveTable(table)
    if (!where || Object.keys(where).length === 0) {
      const result = await db.select().from(t)
      return result as T[]
    }
    const conditions = buildConditions(t, where)
    const result = await db.select().from(t).where(and(...conditions))
    return result as T[]
  }

  async insert<T>(table: string, data: Record<string, unknown>): Promise<T> {
    const db = getConnection()
    const t = resolveTable(table)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await db.insert(t).values(data as any).returning()
    if (!result[0]) throw new Error(`Insert failed for table: ${table}`)
    return result[0] as T
  }

  async insertMany<T>(table: string, data: Record<string, unknown>[]): Promise<T[]> {
    const db = getConnection()
    const t = resolveTable(table)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await db.insert(t).values(data as any).returning()
    return result as T[]
  }

  async update<T>(table: string, where: Record<string, unknown>, data: Record<string, unknown>): Promise<T | null> {
    const db = getConnection()
    const t = resolveTable(table)
    const conditions = buildConditions(t, where)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await db.update(t).set(data as any).where(and(...conditions)).returning()
    return (result[0] as T) ?? null
  }

  async upsert<T>(table: string, data: Record<string, unknown>, conflictOn: string): Promise<T> {
    const db = getConnection()
    const t = resolveTable(table)
    const conflictKeys = new Set(conflictOn.split(",").map((k) => k.trim()))
    const conflictCols = Array.from(conflictKeys).map((key) => {
      const col = (t as unknown as Record<string, unknown>)[key]
        ?? (t as unknown as Record<string, unknown>)[snakeToCamel(key)]
      if (!col) throw new Error(`Unknown conflict column: ${key}`)
      return col as PgColumn<ColumnBaseConfig<ColumnDataType, string>>
    })
    // conflict 컬럼은 SET 절에서 제외 (PostgreSQL 제약)
    const updateValues = Object.fromEntries(
      Object.entries(data).filter(([k]) => !conflictKeys.has(k))
    )
    const result = await db
      .insert(t)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .values(data as any)
      .onConflictDoUpdate({
        target: conflictCols,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        set: updateValues as any,
      })
      .returning()
    if (!result[0]) throw new Error(`Upsert failed for table: ${table}`)
    return result[0] as T
  }
}
