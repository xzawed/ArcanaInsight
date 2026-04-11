import { createClient } from "@/lib/supabase/server"

export async function getSupabaseUser(): Promise<{ id: string; email: string } | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.id) return null
  return { id: user.id, email: user.email ?? "" }
}
