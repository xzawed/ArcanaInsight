export interface DbClient {
  /** 단건 조회 — 없으면 null */
  findOne<T>(table: string, where: Record<string, unknown>): Promise<T | null>
  /** 목록 조회 */
  findMany<T>(table: string, where?: Record<string, unknown>): Promise<T[]>
  /** 단건 삽입 — 삽입된 행 반환 */
  insert<T>(table: string, data: Record<string, unknown>): Promise<T>
  /** 다건 삽입 */
  insertMany<T>(table: string, data: Record<string, unknown>[]): Promise<T[]>
  /** 조건 업데이트 — 업데이트된 첫 행 반환 */
  update<T>(table: string, where: Record<string, unknown>, data: Record<string, unknown>): Promise<T | null>
  /** Upsert — conflictOn은 콤마 구분 컬럼명 (예: "date,character_id") */
  upsert<T>(table: string, data: Record<string, unknown>, conflictOn: string): Promise<T>
}
