import { defineConfig, devices } from "@playwright/test";
import "dotenv/config";

export default defineConfig({
  testDir: "./e2e",
  testIgnore: process.env.CI ? ["**/smart-ci.spec.ts"] : [],
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // CI는 workers:1 — workers:2 + fullyParallel이 브라우저 2개 + pnpm start Next 서버 + cold-cache
  // sharp 이미지 최적화(2816×1536 원본 디코드)를 한 2코어/7GB 러너에 공존시켜 호스트 OOM →
  // OOM-killer가 브라우저 프로세스 kill → Playwright "Target page/context/browser has been closed"
  // (chromium·webkit 양쪽 재현 = 엔진 무관 메모리 문제). 매트릭스 레벨 3-프로젝트 병렬은 유지.
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI
    ? [
        ["html", { open: "never" }],
        ["junit", { outputFile: "coverage/junit.xml" }],
        ["dot"],
      ]
    : [["html", { open: "never" }]],
  timeout: 30_000,

  use: {
    baseURL: "http://localhost:3000",
    locale: "ko",
    screenshot: "only-on-failure",
    trace: "on-first-retry",
  },

  projects: [
    {
      name: "Desktop Chrome",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "Mobile Android",
      use: { ...devices["Pixel 7"] },
    },
    ...(process.env.SKIP_WEBKIT
      ? []
      : [
          {
            name: "Mobile iOS",
            use: { ...devices["iPhone 14"] },
          },
        ]),
  ],

  webServer: {
    command: process.env.CI ? "pnpm start" : "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
