import { vi } from "vitest";

// 테스트용 환경변수 기본값
process.env.GROK_API_KEY = "test-grok-key";
process.env.ANTHROPIC_API_KEY = "test-claude-key";
process.env.GROK_MODEL = "grok-3";
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:3000";
// NODE_ENV는 readonly라 직접 할당 불가 — vitest가 자동으로 "test"로 설정함

// fetch 전역 모킹 (AI Provider, 외부 HTTP 호출)
global.fetch = vi.fn();

// next/headers 전역 mock — server-only API 사용 코드(API 라우트·server-locale)의 단위 테스트 지원.
// 개별 테스트에서 vi.doMock("next/headers", ...) 으로 override 가능 (server-locale.test.ts 참고).
vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue({ get: () => null }),
  cookies: vi.fn().mockResolvedValue({ get: () => undefined }),
}));
