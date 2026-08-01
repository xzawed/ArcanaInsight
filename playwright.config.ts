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
  // CI workers는 `deploy.yml` 매트릭스가 `E2E_WORKERS`로 주입한다(현재 Desktop Chrome 1 · Mobile Android 2).
  // 매트릭스 레벨 프로젝트 병렬은 유지한다.
  //
  // 판단 기준 두 가지만 기억하면 된다.
  //   ① 제약 자원은 메모리가 아니라 **CPU**다. #462의 "2코어/7GB → 호스트 OOM" 가설은 실측으로 반증됐다.
  //   ② 상향 기준은 "위험"이 아니라 "이득"이다 — E2E 벽시계는 4잡의 최댓값이 정하므로
  //      임계경로가 아닌 잡을 올리면 테스트가 40% 빨라져도 CI 총 시간 이득은 0이다(#522 실증).
  //
  // 계측값·시간순 이력·폐기된 가설: docs/operations/e2e-incidents.md (정본)
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
