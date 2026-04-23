import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
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
        "src/data/**/*.ts",
        "src/lib/env.ts",
        "src/services/**/*.ts",
      ],
      exclude: [
        "src/**/*.test.ts",
        "src/**/*.spec.ts",
        "src/types/**",
        "**/*.d.ts",
        "src/lib/supabase/**",
        "src/lib/auth/**",
        "src/lib/storage/**",
        "src/lib/db/schema/**",
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
