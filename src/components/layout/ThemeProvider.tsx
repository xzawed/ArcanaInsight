"use client";

import { useEffect } from "react";
import { useThemeStore, themes } from "@/hooks/useTheme";

/** CSS 변수를 :root에 동적 적용하고, 시간 경과 시 자동 갱신 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { mode, activeTheme, setMode, refresh } = useThemeStore();

  // localStorage에서 저장된 모드 복원 (최초 1회)
  useEffect(() => {
    const saved = localStorage.getItem("arcana-theme-mode");
    if (saved) {
      setMode(saved as typeof mode);
    }
  }, [setMode]);

  // 활성 테마 색상을 CSS 변수로 자동 적용
  useEffect(() => {
    const { colors } = themes[activeTheme];
    const root = document.documentElement;
    const cssVarMap: Record<string, string> = {
      bg: "bg", surface: "surface", card: "card", border: "border",
      primary: "purple", secondary: "indigo", accent: "gold",
      text: "text", muted: "muted",
    };
    Object.entries(colors).forEach(([key, value]) => {
      const cssName = cssVarMap[key] || key;
      root.style.setProperty(`--color-arcana-${cssName}`, value);
    });
  }, [activeTheme]);

  // auto 모드: 1분마다 시간/계절 체크하여 자동 갱신
  useEffect(() => {
    if (mode !== "auto") return;
    const interval = setInterval(refresh, 60 * 1000);
    return () => clearInterval(interval);
  }, [mode, refresh]);

  return <>{children}</>;
}
