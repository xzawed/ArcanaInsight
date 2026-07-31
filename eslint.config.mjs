import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import playwright from "eslint-plugin-playwright";
import noImagePriorityRemote from "./eslint-rules/no-image-priority-remote.mjs";

const arcana = {
  rules: { "no-image-priority-remote": noImagePriorityRemote },
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // App Router layout.tsx의 <link> 폰트 로딩은 올바른 패턴 — Pages Router 기준 룰 비활성화
  { rules: { "@next/next/no-page-custom-font": "off" } },
  // E2E 재발 방지 가드: networkidle 대기 금지. 외부 R2 배경(ServiceBackground)이 Mobile Android CI에서
  // window.load·networkidle을 게이트 → 타임아웃 플레이키(#121~#428). web-first 어서션
  // (toBeVisible/waitForFunction/toHaveCount)으로 대체한다. 정본: docs/operations/known-issues.md, PR #459 sweep.
  // scripts/e2e-full/**도 포함 — 가드가 e2e/**만 덮던 탓에 shinjeom-flow.ts의 networkidle이
  // 살아남아 `pnpm test:e2e:full`만 조용히 flaky했다(2026-07-29 검토에서 발견).
  {
    files: ["e2e/**/*.ts", "scripts/e2e-full/**/*.ts"],
    plugins: { playwright },
    rules: { "playwright/no-networkidle": "error" },
  },
  // 재발 방지 가드: <Image priority>는 로컬 정적 경로에만. 외부 CDN URL에 붙이면 preload가
  // window.load를 게이트해 E2E 타임아웃·LCP 악화를 만든다(PR #412). 이 규칙은
  // .claude/rules/e2e-testing.md에 **산문으로만** 있었고 그래서 지켜지지 않았다 —
  // 2026-08-01 감사에서 세션 3곳과 SpriteAnimator가 위반 중이었다. 린트로 강제한다.
  {
    files: ["src/**/*.tsx"],
    plugins: { arcana },
    rules: { "arcana/no-image-priority-remote": "error" },
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
