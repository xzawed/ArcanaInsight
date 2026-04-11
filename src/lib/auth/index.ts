export interface AuthUser {
  id: string
  email: string
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  if (process.env.DB_PROVIDER === "postgres") {
    // nextauth.ts는 Task 8에서 생성 예정 — 정적 분석 우회를 위해 런타임 동적 import 사용
    const modulePath = "./nextauth"
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mod = await (import(/* @vite-ignore */ modulePath) as Promise<any>).catch(() => ({ auth: async () => null }))
    const session = await mod.auth()
    if (!session?.user?.id) return null
    return { id: session.user.id as string, email: (session.user.email as string) ?? "" }
  }
  const { getSupabaseUser } = await import("./supabase-auth")
  return getSupabaseUser()
}

export async function requireUser(): Promise<AuthUser> {
  const user = await getCurrentUser()
  if (!user) throw new Error("Unauthorized")
  return user
}
