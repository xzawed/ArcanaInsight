import { describe, it, expect, afterEach } from "vitest";
import { GET } from "@/app/api/health/route";

describe("GET /api/health", () => {
  const original = process.env.RAILWAY_GIT_COMMIT_SHA;
  afterEach(() => {
    if (original === undefined) delete process.env.RAILWAY_GIT_COMMIT_SHA;
    else process.env.RAILWAY_GIT_COMMIT_SHA = original;
  });

  it("200과 status:'ok'를 반환한다 (배포 헬스체크)", async () => {
    const res = GET();
    expect(res.status).toBe(200);
    expect((await res.json()).status).toBe("ok");
  });

  // 프로덕션이 어느 코드인지 보이게 하는 필드. 2026-08-01, main 머지가 하루 넘게 배포되지
  // 않았는데 새 엔드포인트 404가 "배포 안 됨"인지 "코드 결함"인지 구분할 수단이 없었다.
  it("배포된 커밋 SHA를 7자리로 노출한다", async () => {
    process.env.RAILWAY_GIT_COMMIT_SHA = "9942c12abcdef0123456789";
    expect((await GET().json()).commit).toBe("9942c12");
  });

  it("SHA가 없으면 unknown을 반환한다 (로컬·CI)", async () => {
    delete process.env.RAILWAY_GIT_COMMIT_SHA;
    expect((await GET().json()).commit).toBe("unknown");
  });
});
