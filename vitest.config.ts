import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    reporters: ["default"],
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.ts", "src/**/*.spec.ts"],
    exclude: [
      "e2e/**",
      "node_modules/**",
      ".next/**",
      "src/app/**",         // Next.js 페이지·API 라우트 → E2E 커버
      "src/components/**",  // React 컴포넌트 → E2E 커버
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "lcov", "html"],
      reportsDirectory: "./coverage",
      include: [
        "src/data/topics.ts",        // 유효 토픽 목록 — 테스트 있음
        "src/lib/env.ts",            // 환경변수 getter — 테스트 있음
        "src/lib/db/supabase-adapter.ts", // DB 어댑터 — 테스트 있음
        "src/lib/rate-limit.ts",          // Rate Limiter — 테스트 있음
        "src/lib/validation/api-schemas.ts", // Zod 스키마 — null/undefined 경계 테스트 있음
        "src/hooks/useSSEStream.ts",   // SSE 공통 유틸 — 테스트 있음
        "src/services/**/*.ts",        // 모든 서비스 계층 — 테스트 있음
        "src/lib/verum/**/*.ts",       // Verum SDK — 타임아웃·서킷·resolver 테스트 있음
        "src/app/api/tarot/session/route.ts",         // PR B
        "src/app/api/saju/session/route.ts",          // PR B
        "src/app/api/shinjeom/session/route.ts",      // PR B
        "src/app/api/tarot/result/[id]/route.ts",     // PR C
        "src/app/api/saju/result/[id]/route.ts",      // PR C
        "src/app/api/profile/favorite-character/route.ts", // PR C
        "src/app/api/daily-card/route.ts",            // PR C
        "src/app/api/tarot/reading/route.ts",         // PR C
        "src/app/api/saju/reading/route.ts",          // PR C
        "src/app/api/shinjeom/message/route.ts",      // PR C
      ],
      exclude: [
        "src/**/*.test.ts",
        "src/**/*.spec.ts",
        "src/types/**",
        "**/*.d.ts",
        // 정적 사전·상수 데이터 — 로직 없음
        "src/data/characters/**",
        "src/data/skins/**",
        "src/data/cards/**",
        "src/data/home/**",
        "src/data/spreads/**",
        "src/data/saju/constants.ts",
        "src/data/saju/categories.ts",
        "src/data/birth-hours.ts",
        "src/data/error-messages.ts",
        // hooks — useSSEStream 제외한 나머지 (jsdom 필요)
        "src/hooks/useCardAnimation.ts",
        "src/hooks/useCharacter.ts",
        "src/hooks/useFavoriteCharacter.ts",
        "src/hooks/useGenderStore.ts",
        "src/hooks/useSajuSession.ts",
        "src/hooks/useSession.ts",
        "src/hooks/useShinjeomSession.ts",
        "src/hooks/useSkinStore.ts",
        "src/hooks/useTheme.ts",
        // lib 계층 — 테스트 미작성 (auth/storage는 Phase C-4 완료 전까지 제외)
        "src/lib/supabase/**",
        "src/lib/auth/**",
        "src/lib/storage/**",
        "src/lib/db/schema/**",
        "src/lib/db/types.ts",
        "src/lib/db/index.ts",
        "src/services/core/ai-provider.ts",   // re-export only
        "src/services/saju/saju-types.ts",    // 타입 정의만
      ],
      thresholds: {
        branches: 50,
        functions: 60,
        lines: 60,
        statements: 60,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "server-only": path.resolve(__dirname, "./vitest-mocks/server-only.ts"),
    },
  },
});
