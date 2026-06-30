"use client";

import { useState, useEffect, useCallback } from "react";
import { useThemeStore, themes, ThemeId } from "@/hooks/useTheme";
import { useSkinStore } from "@/hooks/useSkinStore";
import { useGenderStore } from "@/hooks/useGenderStore";
import { useReducedMotionStore } from "@/hooks/useReducedMotionStore";
import { useCardStyleStore } from "@/hooks/useCardStyleStore";
import { GenderFilter } from "@/types/character";
import { useT } from "@/i18n/useT";
import { useLocaleStore } from "@/hooks/useLocaleStore";

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

/**
 * 설정 페이지의 상태·핸들러·storage 로직을 캡슐화한 컨트롤러 훅.
 * (이전에는 page.tsx 인라인이었으나 view/controller 분리를 위해 추출 — 동작은 verbatim 유지.)
 */
export function useSettings() {
  const { t } = useT();
  const locale = useLocaleStore((s) => s.locale);
  const { mode, activeTheme, setMode } = useThemeStore();
  const { selectedSkinId, setSkin } = useSkinStore();
  const { styleOverride, useSkinMode, setStyleOverride, clearOverride, enableSkinMode } = useCardStyleStore();
  const { genderFilter, setGenderFilter } = useGenderStore();
  const { reducedMotion, setReducedMotion } = useReducedMotionStore();

  const isStyleMode = !useSkinMode;
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
    enableSkinMode();
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

  return {
    t, locale,
    mode, activeTheme, isStyleMode, styleOverride, useSkinMode, selectedSkinId,
    genderFilter, reducedMotion, confirmEachCard, hasSavedInfo, toastVisible,
    setStyleOverride, clearOverride, showToast,
    handleThemeChange, handleSkinChange, handleGenderChange, toggleConfirmMode, toggleReducedMotion, clearSavedInfo,
    themeOptions, genderOptions,
  };
}
