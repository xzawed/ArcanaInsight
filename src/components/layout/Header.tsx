"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useThemeStore, themes, getThemeName, type ThemeId } from "@/hooks/useTheme";
import { Icon } from "@/components/common/Icon";
import { useT } from "@/i18n/useT";
import { useLocaleStore } from "@/hooks/useLocaleStore";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import type { User } from "@supabase/supabase-js";

const themeList = Object.values(themes);

export function Header() {
  const [user, setUser] = useState<User | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isThemeOpen, setIsThemeOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const themeRef = useRef<HTMLDivElement>(null);
  const mobileThemeRef = useRef<HTMLDivElement>(null);
  const { mode, activeTheme, setMode } = useThemeStore();
  const { t } = useT();
  const locale = useLocaleStore((s) => s.locale);
  const activeThemeName = getThemeName(themes[activeTheme], locale);

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
      const insideDesktopTheme = themeRef.current?.contains(e.target as Node) ?? false;
      const insideMobileTheme = mobileThemeRef.current?.contains(e.target as Node) ?? false;
      if (!insideDesktopTheme && !insideMobileTheme) {
        setIsThemeOpen(false);
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
        <nav data-testid="desktop-nav" className="hidden md:flex items-center gap-6">
          <Link
            href="/tarot"
            className="text-arcana-muted hover:text-arcana-text transition-colors font-sans text-sm"
          >
            {t("header.nav.tarot")}
          </Link>
          <Link
            href="/saju"
            className="text-arcana-muted hover:text-arcana-text transition-colors font-sans text-sm"
          >
            {t("header.nav.saju")}
          </Link>
          <Link
            href="/shinjeom"
            className="text-arcana-muted hover:text-arcana-text transition-colors font-sans text-sm"
          >
            {t("header.nav.shinjeom")}
          </Link>
          <Link
            href="/mypage"
            className="text-arcana-muted hover:text-arcana-text transition-colors font-sans text-sm"
          >
            {t("header.nav.mypage")}
          </Link>

          <LanguageSwitcher variant="desktop" />

          {/* 테마 선택 */}
          <div ref={themeRef} className="relative">
            <button
              onClick={() => setIsThemeOpen(!isThemeOpen)}
              className="text-lg hover:scale-110 transition-transform min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label={t("header.theme.change-aria")}
              title={`${t("settings.theme.current")} ${activeThemeName}`}
            >
              <Image src={themes[activeTheme].iconPath} alt="" width={20} height={20} unoptimized />
            </button>
            {isThemeOpen && (
              <div className="absolute right-0 mt-2 w-52 bg-arcana-card/90 backdrop-blur-md rounded-xl border border-arcana-border shadow-xl shadow-black/30 overflow-hidden">
                <div className="px-3 py-2 border-b border-arcana-border">
                  <p className="text-arcana-muted text-[10px] font-serif">{t("header.theme.settings-label")}</p>
                </div>
                <button
                  onClick={() => { setMode("auto"); setIsThemeOpen(false); }}
                  className={`w-full text-left px-3 py-2.5 text-sm flex items-center gap-2 transition-colors ${
                    mode === "auto" ? "bg-arcana-purple/15 text-arcana-purple" : "text-arcana-text hover:bg-arcana-purple/10"
                  }`}
                >
                  <Icon id="ui-auto-theme" size={16} />
                  <span className="font-serif text-xs">{t("settings.theme.auto-label")}</span>
                  {mode === "auto" && <span className="ml-auto text-[10px] text-arcana-muted">{activeThemeName}</span>}
                </button>
                <div className="border-t border-arcana-border" />
                {themeList.map((th) => (
                  <button
                    key={th.id}
                    data-testid={`theme-option-${th.id}`}
                    onClick={() => { setMode(th.id as ThemeId); setIsThemeOpen(false); }}
                    className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors ${
                      mode === th.id ? "bg-arcana-purple/15 text-arcana-purple" : "text-arcana-text hover:bg-arcana-purple/10"
                    }`}
                  >
                    <Image src={th.iconPath} alt="" width={16} height={16} unoptimized />
                    <span className="font-serif text-xs">{getThemeName(th, locale)}</span>
                    <span
                      className="ml-auto w-3 h-3 rounded-full border border-arcana-border"
                      style={{ backgroundColor: th.colors.primary }}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 유저 영역 */}
          {user ? (
            <div ref={dropdownRef} className="relative">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="w-9 h-9 rounded-full bg-gradient-to-br from-arcana-purple to-arcana-indigo text-white font-serif font-bold text-sm flex items-center justify-center hover:opacity-90 transition-opacity min-h-[44px] min-w-[44px]"
                aria-label={t("header.user-menu-aria")}
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
                    {t("header.nav.mypage")}
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-3 text-sm text-arcana-muted hover:text-arcana-text hover:bg-arcana-purple/10 transition-colors border-t border-arcana-border"
                  >
                    {t("header.auth.logout")}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/auth/login"
              className="px-4 py-2 rounded-full text-xs font-serif font-bold bg-gradient-to-r from-arcana-purple to-arcana-indigo text-white hover:opacity-90 shadow-lg shadow-arcana-purple/20 transition-opacity min-h-[44px] flex items-center"
            >
              {t("header.auth.login")}
            </Link>
          )}
        </nav>

        {/* 모바일: 언어 + 설정 + 테마 */}
        <div className="md:hidden flex items-center gap-1">
          <LanguageSwitcher variant="mobile" />
          <Link
            href="/settings"
            className="text-lg hover:scale-110 transition-transform min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label={t("header.nav.mypage")}
          >
            <Icon id="ui-settings" size={20} />
          </Link>
          <div ref={mobileThemeRef} className="relative">
            <button
              onClick={() => setIsThemeOpen(!isThemeOpen)}
              className="text-lg hover:scale-110 transition-transform min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label={t("header.theme.change-aria")}
            >
              <Image src={themes[activeTheme].iconPath} alt="" width={20} height={20} unoptimized />
            </button>
            {isThemeOpen && (
              <div className="absolute right-0 mt-2 w-52 bg-arcana-card/90 backdrop-blur-md rounded-xl border border-arcana-border shadow-xl shadow-black/30 overflow-hidden z-50">
                <button
                  onClick={() => { setMode("auto"); setIsThemeOpen(false); }}
                  className={`w-full text-left px-3 py-2.5 text-sm flex items-center gap-2 transition-colors ${
                    mode === "auto" ? "bg-arcana-purple/15 text-arcana-purple" : "text-arcana-text hover:bg-arcana-purple/10"
                  }`}
                >
                  <Icon id="ui-auto-theme" size={16} />
                  <span className="font-serif text-xs">{t("settings.theme.auto-label")}</span>
                </button>
                {themeList.map((th) => (
                  <button
                    key={th.id}
                    data-testid={`mobile-theme-option-${th.id}`}
                    onClick={() => { setMode(th.id as ThemeId); setIsThemeOpen(false); }}
                    className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors ${
                      mode === th.id ? "bg-arcana-purple/15 text-arcana-purple" : "text-arcana-text hover:bg-arcana-purple/10"
                    }`}
                  >
                    <Image src={th.iconPath} alt="" width={16} height={16} unoptimized />
                    <span className="font-serif text-xs">{getThemeName(th, locale)}</span>
                    <span className="ml-auto w-3 h-3 rounded-full border border-arcana-border" style={{ backgroundColor: th.colors.primary }} />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
