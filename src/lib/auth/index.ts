export interface AuthUser {
  id: string
  email: string
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  if (process.env.DB_PROVIDER === "postgres") {
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
 */
export async function assertReadingAccess(
  sessionId: string,
  mode: "public" | "owner" = "public"
): Promise<Response | null> {
  if (mode === "public") return null
  return assertSessionOwnership(sessionId)
}

/**
 * 세션 소유권 검증.
 * 로그인 사용자가 다른 사람의 세션에 쓰기 요청하는 IDOR를 차단.
 * 익명 사용자(user=null)는 허용, 미인증 로그인 사용자도 허용.
 * 반환값: 에러 Response(403/404) 또는 null(통과)
 */
export async function assertSessionOwnership(sessionId: string): Promise<Response | null> {
  const { getDb } = await import("@/lib/db")
  const user = await getCurrentUser()
  if (!user) return null
  const db = getDb()
  const session = await db.findOne<{ user_id: string | null }>("sessions", { id: sessionId })
  if (!session) return new Response(JSON.stringify({ error: "Session not found" }), { status: 404, headers: JSON_HEADER })
  if (session.user_id && session.user_id !== user.id) {
    return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: JSON_HEADER })
  }
  return null
}
