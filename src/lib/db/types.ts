export interface DbClient {
  /** 단건 조회 — 없으면 null */
  findOne<T>(table: string, where: Record<string, unknown>): Promise<T | null>
  /** 목록 조회 */
  findMany<T>(table: string, where?: Record<string, unknown>, options?: {
    limit?: number;
    offset?: number;
    orderBy?: string;
    orderDir?: 'asc' | 'desc';
  }): Promise<T[]>
  /** IN 조회 — WHERE column IN (values). N+1 대체용 */
  findManyIn<T>(table: string, column: string, values: unknown[]): Promise<T[]>
  /** 단건 삽입 — 삽입된 행 반환 */
  insert<T>(table: string, data: Record<string, unknown>): Promise<T>
  /** 다건 삽입 */
  insertMany<T>(table: string, data: Record<string, unknown>[]): Promise<T[]>
  /** 조건 업데이트 — 업데이트된 첫 행 반환 */
  update<T>(table: string, where: Record<string, unknown>, data: Record<string, unknown>): Promise<T | null>
  /** Upsert — conflictOn은 콤마 구분 컬럼명 (예: "date,character_id") */
  upsert<T>(table: string, data: Record<string, unknown>, conflictOn: string): Promise<T>
  /** 익명 세션(user_id IS NULL)을 사용자에게 귀속 — claim된 행 수 반환.
   *  `WHERE id IN (sessionIds) AND user_id IS NULL` 가드로 타인 소유 세션 보호. */
  claimSessions(sessionIds: string[], userId: string): Promise<number>
}
