import { vi } from "vitest";
import type { AuthUser } from "@/lib/auth";

export const MOCK_USER: AuthUser = { id: "user-test-123", email: "test@example.com" };

export function makeAuthMock(user: AuthUser | null = MOCK_USER) {
  return {
    getCurrentUser: vi.fn().mockResolvedValue(user),
    requireUser: user
      ? vi.fn().mockResolvedValue(user)
      : vi.fn().mockRejectedValue(new Error("Unauthorized")),
    assertReadingAccess: vi.fn().mockResolvedValue(null),
    assertSessionOwnership: vi.fn().mockResolvedValue(null),
  };
}
