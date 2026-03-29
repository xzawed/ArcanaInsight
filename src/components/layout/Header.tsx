"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

export function Header() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-arcana-bg/80 backdrop-blur-md border-b border-arcana-border">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl font-display font-bold bg-gradient-to-r from-arcana-purple to-arcana-indigo bg-clip-text text-transparent">
            ArcanaInsight
          </span>
        </Link>
        <nav className="hidden md:flex items-center gap-6">
          <Link href="/tarot" className="text-arcana-muted hover:text-arcana-text transition-colors">타로</Link>
          <Link href="/mypage" className="text-arcana-muted hover:text-arcana-text transition-colors">마이페이지</Link>
          {user ? (
            <button onClick={handleLogout}
              className="px-4 py-2 rounded-full text-xs font-serif font-bold text-arcana-muted hover:text-arcana-purple transition-colors min-h-[44px] flex items-center">
              로그아웃
            </button>
          ) : (
            <Link href="/auth/login"
              className="px-4 py-2 rounded-full text-xs font-serif font-bold bg-gradient-to-r from-arcana-purple to-arcana-indigo text-white hover:opacity-90 shadow-lg shadow-arcana-purple/20 transition-opacity min-h-[44px] flex items-center">
              로그인
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
