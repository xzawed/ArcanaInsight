import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ClaimSessionsSchema } from "@/lib/validation/api-schemas";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-utils";
import { getRequestLocale } from "@/i18n/server-locale";

/**
 * 익명 세션(user_id IS NULL)을 현재 로그인 사용자에게 귀속(claim)한다.
 * 게스트/만료 세션 상태에서 만든 리딩을 로그인 후 mypage 이력에 노출하기 위함.
 * 보안 순서: Rate Limit → Zod → Auth(로그인 필수) → claim(`WHERE user_id IS NULL` 가드).
 */
export async function POST(request: NextRequest) {
  try {
    const locale = await getRequestLocale();
    const ip = getClientIp(request.headers);
    if (!(await checkRateLimit(`claim:${ip}`, 20, 60_000))) return rateLimitResponse(locale);

    const parsed = ClaimSessionsSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const db = getAdminDb();
    const claimed = await db.claimSessions(parsed.data.sessionIds, user.id);
    return NextResponse.json({ claimed });
  } catch (e) {
    console.error("세션 claim 오류:", e instanceof Error ? e.message : String(e));
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
