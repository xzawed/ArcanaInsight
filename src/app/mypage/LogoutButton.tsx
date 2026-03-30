"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function LogoutButton() {
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <button
      type="button"
      onClick={handleLogout}
      className="rounded-full px-4 py-2 text-xs border border-arcana-border text-arcana-muted hover:border-red-400 hover:text-red-400 transition-colors shrink-0"
    >
      로그아웃
    </button>
  );
}
