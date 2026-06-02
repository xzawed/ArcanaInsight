import { vi, type MockInstance } from "vitest";
import type { DbClient } from "@/lib/db/types";

/**
 * 각 DB 메서드를 원본 시그니처 + Mock 헬퍼(mockResolvedValue 등)로 노출한다.
 * vitest 4부터 `ReturnType<typeof vi.fn>`이 제네릭 메서드(`findOne<T>`)와
 * 호환되지 않으므로, `DbClient[K]`와 `MockInstance`를 교차해 둘 다 만족시킨다.
 */
export type MockDbClient = {
  [K in keyof DbClient]: DbClient[K] & MockInstance;
};

export function makeMockDb(overrides: Partial<MockDbClient> = {}): MockDbClient {
  return {
    findOne: vi.fn(),
    findMany: vi.fn(),
    findManyIn: vi.fn(),
    insert: vi.fn(),
    insertMany: vi.fn(),
    update: vi.fn(),
    upsert: vi.fn(),
    ...overrides,
  } as MockDbClient;
}
