import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // App Router layout.tsx의 <link> 폰트 로딩은 올바른 패턴 — Pages Router 기준 룰 비활성화
  { rules: { "@next/next/no-page-custom-font": "off" } },
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
  ]),
]);

export default eslintConfig;
