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
