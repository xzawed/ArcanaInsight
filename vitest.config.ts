import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    reporters: ["default", ["junit", { outputFile: "./coverage/junit.xml" }]],
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
        "src/data/topics.ts",   // 유효 토픽 목록 — 테스트 있음
        "src/lib/env.ts",
        "src/services/**/*.ts",
      ],
      exclude: [
        "src/**/*.test.ts",
        "src/**/*.spec.ts",
        "src/types/**",
        "**/*.d.ts",
        // 정적 사전·상수 데이터 — 로직 없음, 커버리지 분모에서 제외
        "src/data/characters/**",
        "src/data/skins/**",
        "src/data/cards/**",
        "src/data/home/**",
        "src/data/spreads/**",
        "src/data/saju/constants.ts",
        "src/data/saju/categories.ts",
        "src/data/birth-hours.ts",
        "src/data/error-messages.ts",
        // hooks — jsdom 없이 node env 테스트 불가 (Phase C-5에서 useSSEStream만 별도 추가)
        "src/hooks/**",
        // lib 계층 — Phase C-4 완료 전까지 제외
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
    },
  },
});
