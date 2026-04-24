import { vi, beforeEach } from "vitest";

export function setupDoMock() {
  beforeEach(() => {
    vi.resetModules();
  });
}
