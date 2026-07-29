import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import playwright from "eslint-plugin-playwright";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // App Router layout.tsx의 <link> 폰트 로딩은 올바른 패턴 — Pages Router 기준 룰 비활성화
  { rules: { "@next/next/no-page-custom-font": "off" } },
  // E2E 재발 방지 가드: networkidle 대기 금지. 외부 R2 배경(ServiceBackground)이 Mobile Android CI에서
  // window.load·networkidle을 게이트 → 타임아웃 플레이키(#121~#428). web-first 어서션
  // (toBeVisible/waitForFunction/toHaveCount)으로 대체한다. 정본: docs/operations/known-issues.md, PR #459 sweep.
  {
    files: ["e2e/**/*.ts"],
    plugins: { playwright },
    rules: { "playwright/no-networkidle": "error" },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Git worktrees 빌드 아티팩트 제외
    ".worktrees/**",
    // 커버리지 리포트 (생성 파일)
    "coverage/**",
    // 디자인 툴 출력물 (앱 소스 아닌 jsx 프로토타입)
    "docs/design/output/**",
  ]),
]);

export default eslintConfig;
