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
  // CI 기본은 workers:1. 매트릭스 레벨 프로젝트 병렬은 유지한다.
  //
  // 근거는 2026-07-31 실측이다(#522). 이전 근거였던 "2코어/7GB 러너 → 호스트 OOM"(#462)은
  // 사실이 아니었다 — 러너는 nproc=4·15989MiB이고, E2E 구간 1초 샘플링에서 메모리 피크는
  // 2.4~3.4GiB(총량의 15~21%)·swap 0·dmesg OOM 흔적 0이었다. 오히려 "Target page, context
  // or browser has been closed" 시그니처가 workers:1 · available 13.1GiB 상태에서 재현돼
  // 메모리 서사 자체가 반증됐다.
  //
  // 실제 제약은 CPU다. 4코어에서 workers:1이 이미 평균 busy 63~75%(iowait 0.0~0.2%,
  // 즉 I/O 대기가 아닌 실제 런큐)이고 버스트는 100%다. workers:2로 올리면 Desktop Chrome
  // 테스트 시간은 2.9~3.9m → 2.0~2.9m로 줄지만 평균 busy가 83~95%까지 올라 30s 테스트
  // 타임아웃 여유가 얇아진다.
  //
  // 그럼에도 1로 두는 이유는 이득이 없기 때문이다: E2E 벽시계는 4잡의 최댓값이 정하는데
  // 임계경로는 Mobile Android(5.0~6.3m)라 Desktop Chrome만 빨라져도 CI 시간은 그대로다.
  // 양쪽 확대는 안정성 확인이 선행돼야 하는데, 그 판정을 오염시키는 상시 flake가 남아 있다.
  //
  // 프로젝트별 재측정은 매트릭스에서 E2E_WORKERS를 주면 된다. 미지정·비정상 값이면 1이다.
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
