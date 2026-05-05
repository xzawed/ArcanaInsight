import { createAdminClient } from "@/lib/supabase/admin"
import { SupabaseAdapter } from "./supabase-adapter"

export class SupabaseAdminAdapter extends SupabaseAdapter {
  protected async client() {
    return createAdminClient()
  }
}
