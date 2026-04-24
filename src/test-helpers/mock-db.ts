import { vi } from "vitest";
import type { DbClient } from "@/lib/db/types";

type MockDbClient = { [K in keyof DbClient]: ReturnType<typeof vi.fn> };

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
  };
}
