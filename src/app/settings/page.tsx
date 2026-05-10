"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useThemeStore, themes, getThemeName, ThemeId } from "@/hooks/useTheme";
import { useSkinStore } from "@/hooks/useSkinStore";
import { useGenderStore } from "@/hooks/useGenderStore";
import { useReducedMotionStore } from "@/hooks/useReducedMotionStore";
import { cardSkins, getSkinName, getSkinDescription } from "@/data/skins";
import { cardStyles, getStyleName, getStyleDescription } from "@/data/cardStyles";
import { useCardStyleStore } from "@/hooks/useCardStyleStore";
import { GenderFilter } from "@/types/character";
import { useT } from "@/i18n/useT";
import { useLocaleStore } from "@/hooks/useLocaleStore";

const STYLE_COLORS: Record<string, string> = {
  "dark-fantasy": "linear-gradient(135deg, #1a0a2e, #6b21a8)",
  "art-nouveau": "linear-gradient(135deg, #7c5c1e, #d4af37)",
  "anime-mystical": "linear-gradient(135deg, #1e3a8a, #60a5fa)",
  "modern-digital": "linear-gradient(135deg, #0f2944, #00b4d8)",
};

const USER_INFO_KEY = "arcana_user_info";
const USER_INFO_CONSENT_KEY = "arcana_privacy_agreed";

function hasSavedUserInfo(): boolean {
  try {
    return !!sessionStorage.getItem(USER_INFO_KEY);
  } catch {
    return false;
  }
}

function clearSavedUserInfo(): void {
  try {
    sessionStorage.removeItem(USER_INFO_KEY);
    sessionStorage.removeItem(USER_INFO_CONSENT_KEY);
    // 이전 localStorage 저장 방식에서 남은 데이터를 함께 정리한다.
    localStorage.removeItem(USER_INFO_KEY);
    localStorage.removeItem(USER_INFO_CONSENT_KEY);
  } catch {
    // storage 차단 환경에서는 표시 상태만 갱신한다.
  }
}

function isConfirmEachCardEnabled(): boolean {
  try {
    return localStorage.getItem("arcana-confirm-each-card") === "true";
  } catch {
    return false;
  }
}

function saveConfirmEachCard(enabled: boolean): void {
  try {
    localStorage.setItem("arcana-confirm-each-card", String(enabled));
  } catch {
    // storage 차단 환경에서는 현재 화면 상태만 유지한다.
  }
}

function SaveToast({ visible, text }: { visible: boolean; text: string }) {
  return (
    <div
      className={`fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-full bg-arcana-purple text-white text-sm font-sans shadow-lg shadow-arcana-purple/30 pointer-events-none transition-all duration-300 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
      }`}
      aria-live="polite"
      aria-atomic="true"
    >
      {text}
    </div>
  );
}

export default function SettingsPage() {
  const { t } = useT();
  const locale = useLocaleStore((s) => s.locale);
  const { mode, activeTheme, setMode } = useThemeStore();
  const { selectedSkinId, setSkin } = useSkinStore();
  const { styleOverride, setStyleOverride, clearOverride, resolvedStyle } = useCardStyleStore();
  const { genderFilter, setGenderFilter } = useGenderStore();
  const { reducedMotion, setReducedMotion } = useReducedMotionStore();

  const [activeSection, setActiveSection] = useState<"style" | "skin">(() => styleOverride !== null ? "style" : "skin");
  const [confirmEachCard, setConfirmEachCard] = useState(false);
  const [hasSavedInfo, setHasSavedInfo] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setConfirmEachCard(isConfirmEachCardEnabled());
      setHasSavedInfo(hasSavedUserInfo());
    }, 0);
    return () => clearTimeout(t);
  }, []);

  const showToast = useCallback(() => {
    setToastVisible(true);
    const t = setTimeout(() => setToastVisible(false), 1800);
    return () => clearTimeout(t);
  }, []);

  const handleThemeChange = (id: "auto" | ThemeId) => {
    setMode(id);
    showToast();
  };

  const handleSkinChange = (skinId: string) => {
    setSkin(skinId);
    setActiveSection("skin");
    showToast();
  };

  const handleGenderChange = (id: GenderFilter) => {
    setGenderFilter(id);
    showToast();
  };

  const toggleConfirmMode = () => {
    const next = !confirmEachCard;
    setConfirmEachCard(next);
    saveConfirmEachCard(next);
    showToast();
  };

  const toggleReducedMotion = () => {
    setReducedMotion(!reducedMotion);
    showToast();
  };

  const clearSavedInfo = () => {
    clearSavedUserInfo();
    setHasSavedInfo(false);
    showToast();
  };

  const themeOptions: { id: "auto" | ThemeId; label: string; icon: string }[] = [
    { id: "auto", label: t("settings.theme.auto-label"), icon: "🔄" },
    ...Object.values(themes).map((th) => ({ id: th.id, label: th.nameKo, icon: th.icon })),
  ];

  const genderOptions: { id: GenderFilter; label: string }[] = [
    { id: "all", label: t("settings.gender.all") },
    { id: "female", label: t("settings.gender.female") },
    { id: "male", label: t("settings.gender.male") },
  ];

  return (
    <div className="relative min-h-screen">
      {/* 배경 */}
      <div className="fixed inset-0 -z-10">
        <Image src="/images/backgrounds/session-bg.jpg" alt="" fill className="object-cover" sizes="100vw" />
        <div className="absolute inset-0 bg-arcana-bg/70" />
      </div>

      <SaveToast visible={toastVisible} text={t("settings.toast.saved")} />

      <div className="max-w-2xl mx-auto px-4 py-8">
        <Link href="/" className="text-arcana-muted text-sm hover:text-arcana-purple transition-colors">
          {t("settings.back-home")}
        </Link>

        <h1 className="text-2xl md:text-3xl font-display font-bold text-arcana-purple mt-4 mb-8 drop-shadow-md">
          {t("settings.page.title")}
        </h1>

        <div className="space-y-6">

          {/* 테마 */}
          <section className="bg-arcana-card/70 backdrop-blur-sm border border-arcana-border rounded-2xl p-5">
            <h2 className="font-sans font-bold text-base md:text-lg text-arcana-text mb-1">{t("settings.section.theme")}</h2>
            <p className="text-arcana-muted text-xs mb-4">{`${t("settings.theme.current")} ${mode === "auto" ? `${t("settings.theme.auto-label")} (${getThemeName(themes[activeTheme], locale)})` : getThemeName(themes[activeTheme], locale)}`}</p>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {themeOptions.map((t) => (
                <button
                  key={t.id}
                  onClick={() => handleThemeChange(t.id)}
                  className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border text-xs transition-all ${
                    mode === t.id
                      ? "border-arcana-purple bg-arcana-purple/15 text-arcana-purple shadow-sm"
                      : "border-arcana-border/50 text-arcana-muted hover:border-arcana-border"
                  }`}
                >
                  <span className="text-lg">{t.icon}</span>
                  <span className="font-sans text-xs leading-tight text-center">{t.label}</span>
                </button>
              ))}
            </div>
          </section>

          {/* 카드 스킨 (아트 스타일 5 + 팔레트 6 = 11) */}
          <section className="bg-arcana-card/70 backdrop-blur-sm border border-arcana-border rounded-2xl p-5">
            <h2 className="font-sans font-bold text-base md:text-lg text-arcana-text mb-1">{t("settings.section.card-skin")}</h2>
            <p className="text-arcana-muted text-xs mb-4">{t("settings.card-style.description")}</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {/* 테마 자동 매핑 */}
              <button
                onClick={() => { clearOverride(); setActiveSection("style"); showToast(); }}
                className={`p-3 rounded-xl border text-left transition-all ${
                  activeSection === "style" && styleOverride === null
                    ? "border-arcana-purple bg-arcana-purple/10 shadow-sm shadow-arcana-purple/10"
                    : "border-arcana-border/50 hover:border-arcana-border"
                }`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="w-4 h-4 rounded-full border border-white/20 flex items-center justify-center text-[10px]">🎨</span>
                  <span className="font-sans font-bold text-xs text-arcana-text">{t("settings.card-style.auto-label")}</span>
                </div>
                <p className="text-arcana-muted text-xs leading-relaxed">{t("settings.card-style.auto-active")} ({resolvedStyle(activeTheme)})</p>
              </button>

              {/* 4개 아트 스타일 */}
              {cardStyles.map((style) => (
                <button
                  key={style.id}
                  onClick={() => { setStyleOverride(style.id); setActiveSection("style"); showToast(); }}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    activeSection === "style" && styleOverride === style.id
                      ? "border-arcana-purple bg-arcana-purple/10 shadow-sm shadow-arcana-purple/10"
                      : "border-arcana-border/50 hover:border-arcana-border"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="w-4 h-4 rounded-full border border-white/20" style={{ background: STYLE_COLORS[style.id] }} />
                    <span className="font-sans font-bold text-xs text-arcana-text">{getStyleName(style, locale)}</span>
                  </div>
                  <p className="text-arcana-muted text-xs leading-relaxed">{getStyleDescription(style, locale)}</p>
                </button>
              ))}

              {/* 6개 팔레트 스킨 */}
              {cardSkins.map((skin) => (
                <button
                  key={skin.id}
                  onClick={() => handleSkinChange(skin.id)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    activeSection === "skin" && selectedSkinId === skin.id
                      ? "border-arcana-purple bg-arcana-purple/10 shadow-sm shadow-arcana-purple/10"
                      : "border-arcana-border/50 hover:border-arcana-border"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <span
                      className="w-4 h-4 rounded-full border border-white/20"
                      style={{ background: `linear-gradient(135deg, ${skin.palette.primary}, ${skin.palette.secondary})` }}
                    />
                    <span className="font-sans font-bold text-xs text-arcana-text">{getSkinName(skin, locale)}</span>
                  </div>
                  <p className="text-arcana-muted text-xs leading-relaxed">{getSkinDescription(skin, locale)}</p>
                </button>
              ))}
            </div>
          </section>

          {/* 상담사 성별 필터 */}
          <section className="bg-arcana-card/70 backdrop-blur-sm border border-arcana-border rounded-2xl p-5">
            <h2 className="font-sans font-bold text-base md:text-lg text-arcana-text mb-1">{t("settings.section.gender-filter")}</h2>
            <p className="text-arcana-muted text-xs mb-4">{t("settings.section.gender-filter.desc")}</p>
            <div className="flex gap-2">
              {genderOptions.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => handleGenderChange(opt.id)}
                  className={`flex-1 py-2.5 rounded-full text-sm font-display font-bold transition-all ${
                    genderFilter === opt.id
                      ? "bg-gradient-to-r from-arcana-purple to-arcana-indigo text-white shadow-lg shadow-arcana-purple/20"
                      : "bg-arcana-card/50 border border-arcana-border text-arcana-muted hover:border-arcana-purple"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </section>

          {/* 카드 선택 */}
          <section className="bg-arcana-card/70 backdrop-blur-sm border border-arcana-border rounded-2xl p-5">
            <h2 className="font-sans font-bold text-base md:text-lg text-arcana-text mb-1">{t("settings.section.card-selection")}</h2>
            <p className="text-arcana-muted text-xs mb-4">{t("settings.section.card-selection.desc")}</p>
            <button
              onClick={toggleConfirmMode}
              className="w-full flex items-center justify-between p-3 rounded-xl border border-arcana-border/50 hover:border-arcana-border transition-colors"
            >
              <div>
                <span className="text-arcana-text text-sm font-sans">{t("settings.card-confirm.label")}</span>
                <p className="text-arcana-muted text-xs mt-0.5">
                  {confirmEachCard ? t("settings.card-confirm.on") : t("settings.card-confirm.off")}
                </p>
              </div>
              <div className={`w-10 h-6 rounded-full flex items-center px-0.5 transition-colors ${
                confirmEachCard ? "bg-arcana-purple" : "bg-arcana-border"
              }`}>
                <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
                  confirmEachCard ? "translate-x-4" : "translate-x-0"
                }`} />
              </div>
            </button>
          </section>

          {/* 애니메이션 */}
          <section className="bg-arcana-card/70 backdrop-blur-sm border border-arcana-border rounded-2xl p-5">
            <h2 className="font-sans font-bold text-base md:text-lg text-arcana-text mb-1">{t("settings.section.animation")}</h2>
            <p className="text-arcana-muted text-xs mb-4">{t("settings.section.animation.desc")}</p>
            <button
              onClick={toggleReducedMotion}
              className="w-full flex items-center justify-between p-3 rounded-xl border border-arcana-border/50 hover:border-arcana-border transition-colors"
              aria-pressed={reducedMotion}
            >
              <div>
                <span className="text-arcana-text text-sm font-sans">{t("settings.reduced-motion.label")}</span>
                <p className="text-arcana-muted text-xs mt-0.5">
                  {reducedMotion ? t("settings.reduced-motion.on") : t("settings.reduced-motion.off")}
                </p>
              </div>
              <div className={`w-10 h-6 rounded-full flex items-center px-0.5 transition-colors ${
                reducedMotion ? "bg-arcana-purple" : "bg-arcana-border"
              }`}>
                <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
                  reducedMotion ? "translate-x-4" : "translate-x-0"
                }`} />
              </div>
            </button>
          </section>

          {/* 저장된 개인정보 */}
          <section className="bg-arcana-card/70 backdrop-blur-sm border border-arcana-border rounded-2xl p-5">
            <h2 className="font-sans font-bold text-base md:text-lg text-arcana-text mb-1">{t("settings.section.privacy")}</h2>
            <p className="text-arcana-muted text-xs mb-4">{t("settings.section.privacy.desc")}</p>
            {hasSavedInfo ? (
              <div className="flex items-center justify-between">
                <span className="text-arcana-text text-sm">{t("settings.privacy.saved")}</span>
                <button
                  onClick={clearSavedInfo}
                  className="px-4 py-1.5 rounded-full border border-red-500/30 text-red-400 text-xs font-sans hover:bg-red-500/10 transition-colors"
                >
                  {t("settings.privacy.delete")}
                </button>
              </div>
            ) : (
              <p className="text-arcana-muted text-sm">{t("settings.privacy.empty")}</p>
            )}
          </section>

        </div>
      </div>
    </div>
  );
}
