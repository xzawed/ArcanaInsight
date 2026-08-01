import { NextResponse } from "next/server";

/**
 * 배포 헬스체크 전용 경량 엔드포인트. `railway.toml`의 `healthcheckPath`가 이걸 가리켜,
 * 무거운 홈(/) SSR·이미지 최적화로 기동 판정이 지연·재기동되는 것을 피한다.
 * 미들웨어 matcher에서 제외되어 Supabase 세션 호출 없이 즉시 200을 반환한다.
 *
 * ⚠️ **여기에 DB 조회를 넣지 말 것.** Railway가 이 경로로 기동을 판정하므로 DB 장애 시
 * 배포 롤아웃이 막히고 재기동 루프에 빠진다. 의존성 상태는 `/api/health/db`가 담당한다.
 *
 * ## `commit` 필드 — 프로덕션이 어느 코드인지 보이게 한다
 *
 * 2026-08-01, main에 머지한 커밋이 하루가 지나도 배포되지 않았는데 **그 사실을 확인할 방법이
 * 없었다.** 새 엔드포인트가 404인 것이 "배포 안 됨"인지 "코드 결함"인지 구분되지 않아,
 * 로컬 standalone 빌드로 직접 재현해 보고서야 배포 누락임을 알 수 있었다.
 *
 * Railway가 주입하는 `RAILWAY_GIT_COMMIT_SHA`를 그대로 노출해, 스모크와 사람이
 * **프로덕션 코드와 main의 격차**를 한 번에 볼 수 있게 한다. 비밀이 아니며 공개 저장소의
 * 커밋 해시일 뿐이다.
 */
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({
    status: "ok",
    commit: process.env.RAILWAY_GIT_COMMIT_SHA?.slice(0, 7) ?? "unknown",
  });
}
