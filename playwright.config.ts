import { defineConfig, devices } from "@playwright/test";
import "dotenv/config";

/** CI worker 수 — 미지정·NaN·0 이하이면 기존 동작(1)을 유지한다. */
function parseCiWorkers(raw: string | undefined): number {
  const parsed = Number.parseInt(raw ?? "", 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

export default defineConfig({
  testDir: "./e2e",
  testIgnore: process.env.CI ? ["**/smart-ci.spec.ts"] : [],
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // CI 기본은 workers:1 — workers:2 + fullyParallel이 브라우저 2개 + pnpm start Next 서버 +
  // cold-cache sharp 이미지 최적화(2816×1536 원본 디코드)를 한 러너에 공존시켜 호스트 OOM →
  // OOM-killer가 브라우저 프로세스 kill → Playwright "Target page/context/browser has been closed"
  // (chromium·webkit 양쪽 재현 = 엔진 무관 메모리 문제). 매트릭스 레벨 프로젝트 병렬은 유지.
  //
  // #522: 이 결정의 근거였던 "2코어/7GB 러너" 전제는 실측과 다르다. 프로젝트별로 값을 달리해
  // 실측 비교할 수 있도록 E2E_WORKERS로 주입받되, 미지정·비정상 값이면 안전한 1로 떨어진다.
  workers: process.env.CI ? parseCiWorkers(process.env.E2E_WORKERS) : undefined,
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
