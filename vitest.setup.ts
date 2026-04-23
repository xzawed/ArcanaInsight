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
