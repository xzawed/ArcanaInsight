import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/db";

/**
 * DB 준비 상태 확인 — **Railway 헬스체크와 분리된** readiness 엔드포인트.
 *
 * ## 왜 `/api/health`가 아니라 별도인가
 *
 * `railway.toml`의 `healthcheckPath`는 `/api/health`를 가리킨다. 거기에 DB 조회를 넣으면
 * **DB 장애 시 배포 롤아웃이 막히고 재기동 루프**에 빠진다 — 앱 프로세스는 멀쩡한데도.
 * 기동 판정과 의존성 상태는 다른 질문이므로 엔드포인트를 나눈다.
 *
 * ## 왜 필요한가 — 9일간 아무도 몰랐다
 *
 * 2026-07-23 ~ 08-01 프로덕션 Supabase 프로젝트가 **일시정지(INACTIVE)** 상태였다.
 * 그동안 세션·리딩 저장이 전부 실패했는데:
 *
 *   - `/api/health`는 DB를 안 보므로 **200**
 *   - `pnpm smoke:prod`도 DB를 안 보므로 **5/5 통과**
 *   - DLQ(`failed_readings`)조차 **DB에 쓰는 것**이라 기록이 남지 않았다
 *
 * 즉 모든 자동 신호가 초록인 채로 DB가 죽어 있었다. 이 엔드포인트가 그 사각을 메운다.
 *
 * ## 응답
 *
 *   200 `{ db: "ok", latencyMs }`          — 조회 성공
 *   503 `{ db: "unavailable", error }`     — 조회 실패(일시정지·자격증명·네트워크)
 *
 * 오류 메시지는 접속 문자열·자격증명을 담지 않도록 **종류만** 남긴다.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const started = Date.now();
  try {
    // 가장 가벼운 실제 조회. 존재하지 않는 키를 찾으므로 행을 읽지 않고 연결만 검증한다.
    await getAdminDb().findOne("sessions", { id: "00000000-0000-0000-0000-000000000000" });
    return NextResponse.json({ db: "ok", latencyMs: Date.now() - started });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { db: "unavailable", error: message.slice(0, 200), latencyMs: Date.now() - started },
      { status: 503 },
    );
  }
}
