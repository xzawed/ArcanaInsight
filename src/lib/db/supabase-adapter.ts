import { createClient } from "@/lib/supabase/server"
import type { DbClient } from "./types"

export class SupabaseAdapter implements DbClient {
  private async client() {
    return createClient()
  }

  async findOne<T>(table: string, where: Record<string, unknown>): Promise<T | null> {
    const supabase = await this.client()
    let query = supabase.from(table).select("*")
    for (const [key, value] of Object.entries(where)) {
      query = query.eq(key, value) as typeof query
    }
    const { data, error } = await query.single()
    if (error) {
      if (error.code === 'PGRST116') return null  // no rows found
      if (!error.code) {
        // network/connection error (e.g. fetch failed, unreachable host)
        console.warn(`DB findOne [${table}] unavailable: ${error.message}`)
        return null
      }
      throw new Error(`DB read error [${error.code}]: ${error.message}`)
    }
    return data as T
  }

  async findMany<T>(table: string, where?: Record<string, unknown>, options?: { limit?: number; offset?: number; orderBy?: string; orderDir?: 'asc' | 'desc' }): Promise<T[]> {
    const supabase = await this.client()
    let query = supabase.from(table).select("*")
    if (where) {
      for (const [key, value] of Object.entries(where)) {
        query = query.eq(key, value) as typeof query
      }
    }
    if (options?.orderBy) {
      query = query.order(options.orderBy, { ascending: options.orderDir !== 'desc' })
    }
    if (options?.limit !== undefined) {
      const start = options.offset ?? 0
      query = query.range(start, start + options.limit - 1) as typeof query
    }
    const { data, error } = await query
    if (error) {
      if (!error.code) {
        console.warn(`DB findMany [${table}] unavailable: ${error.message}`)
        return []
      }
      throw new Error(`DB read error [${error.code}]: ${error.message}`)
    }
    return (data ?? []) as T[]
  }

  async findManyIn<T>(table: string, column: string, values: unknown[]): Promise<T[]> {
    if (values.length === 0) return []
    const supabase = await this.client()
    const { data, error } = await supabase.from(table).select("*").in(column, values)
    if (error) {
      if (!error.code) {
        console.warn(`DB findManyIn [${table}] unavailable: ${error.message}`)
        return []
      }
      throw new Error(`DB read error [${error.code}]: ${error.message}`)
    }
    return (data ?? []) as T[]
  }

  async insert<T>(table: string, data: Record<string, unknown>): Promise<T> {
    const supabase = await this.client()
    const { data: result, error } = await supabase.from(table).insert(data).select().single()
    if (error) throw new Error(error.message)
    return result as T
  }

  async insertMany<T>(table: string, data: Record<string, unknown>[]): Promise<T[]> {
    const supabase = await this.client()
    const { data: result, error } = await supabase.from(table).insert(data).select()
    if (error) throw new Error(error.message)
    return (result ?? []) as T[]
  }

  async update<T>(table: string, where: Record<string, unknown>, data: Record<string, unknown>): Promise<T | null> {
    const supabase = await this.client()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query: any = supabase.from(table).update(data)
    for (const [key, value] of Object.entries(where)) {
      query = query.eq(key, value)
    }
    const { data: result, error } = await query.select().single()
    if (error) {
      // PGRST116 = no rows matched (정상적인 null 케이스)
      if (error.code === 'PGRST116') return null
      throw new Error(`DB read error [${error.code}]: ${error.message}`)
    }
    return result as T
  }

  async upsert<T>(table: string, data: Record<string, unknown>, conflictOn: string): Promise<T> {
    const supabase = await this.client()
    const { data: result, error } = await supabase
      .from(table)
      .upsert(data, { onConflict: conflictOn })
      .select()
      .single()
    if (error) throw new Error(error.message)
    return result as T
  }
}
