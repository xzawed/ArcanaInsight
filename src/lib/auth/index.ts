import { getDbProvider } from "@/lib/env"

export interface AuthUser {
  id: string
  email: string
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  if (getDbProvider() === "postgres") {
    const { auth } = await import("./nextauth")
    const session = await auth()
    if (!session?.user?.id) return null
    return { id: session.user.id, email: session.user.email ?? "" }
  }
  const { getSupabaseUser } = await import("./supabase-auth")
  return getSupabaseUser()
}

export async function requireUser(): Promise<AuthUser> {
  const user = await getCurrentUser()
  if (!user) throw new Error("Unauthorized")
  return user
}

const JSON_HEADER = { "Content-Type": "application/json" };

/**
 * 리딩 접근 권한 검증.
 * mode="public" — share_token으로 열람하는 공개 결과 페이지. 항상 허용 (공유 링크 생성 = 공개 의도).
 * mode="owner"  — 소유자 전용 쓰기·삭제 경로. 로그인 + session 소유자만 허용.
 *
 * mode는 필수 인수 — 기본값 없음. 쓰기 경로에 "public"을 실수로 전달하면 인증 우회가 되므로
 * 호출 측에서 반드시 의도를 명시해야 한다.
 */
export async function assertReadingAccess(
  sessionId: string,
  mode: "public" | "owner"
): Promise<Response | null> {
  if (mode === "public") return null
  return assertSessionOwnership(sessionId)
}

/**
 * 세션 소유권 검증.
 * - 소유자 없는 세션(user_id=null) → 누구나 허용
 * - 소유자 있는 세션 + 미인증 요청 → 403
 * - 소유자 있는 세션 + 다른 사용자 → 403
 * 반환값: 에러 Response(403/404) 또는 null(통과)
 */
export async function assertSessionOwnership(sessionId: string): Promise<Response | null> {
  const { getAdminDb } = await import("@/lib/db")
  const db = getAdminDb()
  const [user, session] = await Promise.all([
    getCurrentUser(),
    db.findOne<{ user_id: string | null }>("sessions", { id: sessionId }),
  ])
  if (!session) return new Response(JSON.stringify({ error: "Session not found" }), { status: 404, headers: JSON_HEADER })
  if (!session.user_id) return null
  if (!user) {
    console.warn("[security] 비인증 요청이 소유된 세션에 접근 시도:", sessionId)
    return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: JSON_HEADER })
  }
  if (session.user_id !== user.id) {
    console.warn("[security] IDOR 시도: user=%s session=%s owner=%s", user.id, sessionId, session.user_id)
    return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: JSON_HEADER })
  }
  return null
}
