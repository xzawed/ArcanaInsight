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
  // **2026-08-01 갱신 (S-2)**: 위 판단의 전제 두 가지가 바뀌어 재평가했고, 이번에는
  // **임계경로인 Mobile Android**를 2로 올렸다(Desktop Chrome은 1 유지 = 대조군).
  //   ① hydration 결함(#525) 해소로 평균 CPU busy 63~75% → 42~55%
  //   ② 상시 flake(#530) 해소로 안정성 판정이 가능해졌다
  //
  // 실측 2런 결과 (Mobile Android, workers:2)
  //   테스트 시간 5.0m → 2.9m / 4.2m → 2.7m (약 40% 단축), **flaky 0**
  //   평균 CPU busy 82~86%, 피크 메모리 2.9~3.2GiB(16GB 중) — 메모리는 여전히 무관
  // #522의 Desktop Chrome 시험과 달리 이번에는 **임계경로를 줄였으므로 CI 벽시계가 실제로 준다.**
  //
  // 이제 임계경로는 Desktop Chrome으로 넘어갔다. 추가 상향은 같은 방식으로
  // 매트릭스의 workers 값만 바꿔 재측정한다(E2E_WORKERS 주입, 미지정·비정상 값이면 1).
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
