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
        "src/lib/color-utils.ts",    // hex 색상 유틸 — 테스트 있음
        "src/lib/env.ts",            // 환경변수 getter — 테스트 있음
        "src/lib/request-utils.ts",       // IP 추출·pickFields·jsonError·SSE_HEADERS — 테스트 있음
        "src/lib/time-utils.ts",          // 시간 포맷 유틸 — 테스트 있음 (B-4 점진 확장)
        "src/lib/guest-sessions.ts",      // 익명 세션 localStorage 보관 — 테스트 있음 (B-4 점진 확장)
        "src/lib/db/reading-saver.ts",    // 리딩 저장 + logReadingSaveFailure — 테스트 있음 (B-4 점진 확장)
        "src/lib/db/character-context.ts", // fetchMemoryPrompt — 테스트 14건 (B-4 점진 확장 2차, stmts 100%)
        "src/lib/db/supabase-adapter.ts", // DB 어댑터 — 테스트 있음
        "src/lib/rate-limit.ts",          // Rate Limiter — 테스트 있음
        "src/lib/validation/api-schemas.ts", // Zod 스키마 — null/undefined 경계 테스트 있음
        "src/hooks/useSSEStream.ts",   // SSE 공통 유틸 — 테스트 있음
        "src/services/**/*.ts",        // 모든 서비스 계층 — 테스트 있음
        "src/app/api/tarot/session/route.ts",         // PR B
        "src/app/api/saju/session/route.ts",          // PR B
        "src/app/api/shinjeom/session/route.ts",      // PR B
        "src/app/api/tarot/result/[id]/route.ts",     // PR C
        "src/app/api/saju/result/[id]/route.ts",      // PR C
        "src/app/api/profile/favorite-character/route.ts", // PR C
        "src/app/api/daily-card/route.ts",            // PR C
        "src/app/api/daily-fortune/route.ts",         // PR C
        "src/app/api/tarot/reading/route.ts",         // PR C
        "src/app/api/saju/reading/route.ts",          // PR C
        "src/app/api/shinjeom/message/route.ts",      // PR C
        "src/app/api/shinjeom/result/[id]/route.ts",  // PR-L
        "src/app/api/sessions/claim/route.ts",        // 익명 세션 claim
        "src/lib/supabase/admin.ts",  // Admin client — 테스트 있음
        "src/lib/db/index.ts",        // DB provider 팩토리 — 테스트 있음
        "src/i18n/config.ts",         // PR-1 i18n config — 테스트 있음
        "src/i18n/detect.ts",         // PR-1 locale detection — 테스트 있음
        "src/i18n/translations/index.ts", // PR-1 t() fallback — 테스트 있음
        "src/i18n/translations/shared/keys.ts", // PR-2 flatten 헬퍼 — 테스트 있음
        "src/hooks/useLocaleStore.ts",    // PR-1 Zustand store — 테스트 있음
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
        "src/lib/supabase/client.ts",
        "src/lib/supabase/server.ts",
        "src/lib/supabase/middleware.ts",
        "src/lib/supabase/storage.ts",
        "src/lib/auth/**",
        "src/lib/storage/**",
        "src/lib/db/schema/**",
        "src/lib/db/types.ts",
        "src/services/core/ai-provider.ts",   // re-export only
        "src/services/saju/saju-types.ts",    // 타입 정의만
      ],
      thresholds: {
        // vitest 4 + coverage-v8 4.x는 함수·분기를 더 세밀하게 카운트하므로
        // (Lines 100%여도 Funcs<100%로 잡히는 측정 방식 변화) 임계값을 재보정한다.
        // 테스트 자체는 동일하게 전부 통과하며 실제 커버리지 누락이 아니다.
        branches: 90,
        functions: 97,
        lines: 98,
        statements: 98,
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
