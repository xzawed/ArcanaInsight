"use client";

import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

export function Header() {
  const [user, setUser] = useState<User | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data: { user: u } }) => {
      setUser(u);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // 스크롤 감지
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // 드롭다운 외부 클릭 감지
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setIsDropdownOpen(false);
    window.location.href = "/";
  };

  // 유저 이니셜 (이메일 첫 글자 또는 이름 첫 글자)
  const userInitial = user?.user_metadata?.name?.charAt(0)?.toUpperCase()
    ?? user?.email?.charAt(0)?.toUpperCase()
    ?? "U";

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 bg-arcana-bg/80 backdrop-blur-md border-b border-arcana-border transition-shadow duration-300 ${
        isScrolled ? "shadow-lg shadow-arcana-purple/10" : ""
      }`}
    >
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* 로고 */}
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl font-display font-bold bg-gradient-to-r from-arcana-purple to-arcana-indigo bg-clip-text text-transparent">
            ArcanaInsight
          </span>
        </Link>

        {/* 데스크탑 네비게이션 */}
        <nav className="hidden md:flex items-center gap-6">
          <Link
            href="/"
            className="text-arcana-muted hover:text-arcana-text transition-colors font-sans text-sm"
          >
            홈
          </Link>
          <Link
            href="/tarot"
            className="text-arcana-muted hover:text-arcana-text transition-colors font-sans text-sm"
          >
            타로 상담
          </Link>
          <Link
            href="/#daily-card"
            className="text-arcana-muted hover:text-arcana-text transition-colors font-sans text-sm"
          >
            오늘의 운세
          </Link>
          <Link
            href="/mypage"
            className="text-arcana-muted hover:text-arcana-text transition-colors font-sans text-sm"
          >
            마이페이지
          </Link>

          {/* 유저 영역 */}
          {user ? (
            <div ref={dropdownRef} className="relative">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="w-9 h-9 rounded-full bg-gradient-to-br from-arcana-purple to-arcana-indigo text-white font-serif font-bold text-sm flex items-center justify-center hover:opacity-90 transition-opacity min-h-[44px] min-w-[44px]"
                aria-label="사용자 메뉴"
              >
                {userInitial}
              </button>
              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-44 bg-arcana-card/70 backdrop-blur-sm rounded-xl border border-arcana-border shadow-xl shadow-black/20 overflow-hidden">
                  <Link
                    href="/mypage"
                    onClick={() => setIsDropdownOpen(false)}
                    className="block px-4 py-3 text-sm text-arcana-text hover:bg-arcana-purple/10 transition-colors"
                  >
                    마이페이지
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-3 text-sm text-arcana-muted hover:text-arcana-text hover:bg-arcana-purple/10 transition-colors border-t border-arcana-border"
                  >
                    로그아웃
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/auth/login"
              className="px-4 py-2 rounded-full text-xs font-serif font-bold bg-gradient-to-r from-arcana-purple to-arcana-indigo text-white hover:opacity-90 shadow-lg shadow-arcana-purple/20 transition-opacity min-h-[44px] flex items-center"
            >
              로그인
            </Link>
          )}
        </nav>

        {/* 모바일: 로고만 표시, 네비는 MobileNav 하단 바에서 처리 */}
      </div>
    </header>
  );
}
