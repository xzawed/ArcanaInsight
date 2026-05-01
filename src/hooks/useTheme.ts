import { create } from "zustand";

/** 테마 ID */
export type ThemeId = "midnight" | "dawn" | "sunset" | "spring" | "summer" | "autumn" | "winter";

/** 테마 모드: auto(시간/계절 자동), 또는 고정 테마 */
export type ThemeMode = "auto" | ThemeId;

interface ThemeColors {
  bg: string;
  surface: string;
  card: string;
  border: string;
  primary: string;
  secondary: string;
  accent: string;
  text: string;
  muted: string;
}

export interface ThemeConfig {
  id: ThemeId;
  name: string;
  nameKo: string;
  icon: string;
  iconPath: string;
  colors: ThemeColors;
}

export const themes: Record<ThemeId, ThemeConfig> = {
  midnight: {
    id: "midnight", name: "Midnight", nameKo: "한밤의 신비", icon: "🌙", iconPath: "/images/icons/theme-midnight.png",
    colors: {
      bg: "#0a0a1a", surface: "#12122a", card: "#1a1a3e", border: "#2a2a5e",
      primary: "#a78bfa", secondary: "#6366f1", accent: "#f59e0b",
      text: "#e2e8f0", muted: "#94a3b8",
    },
  },
  dawn: {
    id: "dawn", name: "Dawn", nameKo: "새벽빛 여명", icon: "🌅", iconPath: "/images/icons/theme-dawn.png",
    colors: {
      bg: "#1a0f1e", surface: "#241828", card: "#2e1f38", border: "#4a2d5e",
      primary: "#f0abfc", secondary: "#c084fc", accent: "#fbbf24",
      text: "#f5e6ff", muted: "#b891d4",
    },
  },
  sunset: {
    id: "sunset", name: "Sunset", nameKo: "황혼의 노을", icon: "🌇", iconPath: "/images/icons/theme-sunset.png",
    colors: {
      bg: "#1a0f0a", surface: "#2a1810", card: "#3a2218", border: "#5e3a2a",
      primary: "#fb923c", secondary: "#f97316", accent: "#fcd34d",
      text: "#fff1e6", muted: "#c4a882",
    },
  },
  spring: {
    id: "spring", name: "Spring", nameKo: "벚꽃 봄바람", icon: "🌸", iconPath: "/images/icons/theme-spring.png",
    colors: {
      bg: "#140f18", surface: "#1e1525", card: "#2a1e35", border: "#4a3060",
      primary: "#f9a8d4", secondary: "#ec4899", accent: "#a7f3d0",
      text: "#fce7f3", muted: "#b8a0c8",
    },
  },
  summer: {
    id: "summer", name: "Summer", nameKo: "한여름 밤", icon: "✨", iconPath: "/images/icons/theme-summer.png",
    colors: {
      bg: "#0a1628", surface: "#0f1f38", card: "#162a4a", border: "#1e3a6e",
      primary: "#38bdf8", secondary: "#0ea5e9", accent: "#fbbf24",
      text: "#e0f2fe", muted: "#7cb8d4",
    },
  },
  autumn: {
    id: "autumn", name: "Autumn", nameKo: "가을 단풍", icon: "🍂", iconPath: "/images/icons/theme-autumn.png",
    colors: {
      bg: "#1a100a", surface: "#261810", card: "#34201a", border: "#5a3828",
      primary: "#d97706", secondary: "#b45309", accent: "#dc2626",
      text: "#fef3c7", muted: "#b8956a",
    },
  },
  winter: {
    id: "winter", name: "Winter", nameKo: "겨울 설경", icon: "❄️", iconPath: "/images/icons/theme-winter.png",
    colors: {
      bg: "#0c1220", surface: "#141e30", card: "#1c2840", border: "#2a3a5a",
      primary: "#93c5fd", secondary: "#60a5fa", accent: "#e2e8f0",
      text: "#f0f4ff", muted: "#8ea4c4",
    },
  },
};

/** 현재 시간 기반 자동 테마 결정 (spec 시간대: 심야→새벽→낮→황혼) */
function getAutoTheme(): ThemeId {
  const now = new Date();
  const hour = now.getHours();
  const month = now.getMonth(); // 0-11

  // 심야 (22:00~05:59) — 짙은 남색 + 별 파티클 최대
  if (hour >= 22 || hour < 6) return "midnight";
  // 새벽/아침 (06:00~11:59) — 차분한 푸른빛 + 여명 그라데이션
  if (hour < 12) return "dawn";
  // 황혼 (18:00~21:59) — 보라+주황 매직아워
  if (hour >= 18) return "sunset";
  // 낮 (12:00~17:59) — 계절 기반 밝은 조명
  if (month >= 2 && month <= 4) return "spring";
  if (month >= 5 && month <= 7) return "summer";
  if (month >= 8 && month <= 10) return "autumn";
  return "winter";
}

interface ThemeState {
  mode: ThemeMode;
  activeTheme: ThemeId;
  setMode: (mode: ThemeMode) => void;
  refresh: () => void;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  mode: "auto",
  activeTheme: "midnight" as ThemeId, // SSR 초기값 — ThemeProvider에서 클라이언트 마운트 후 보정

  setMode: (mode) => {
    const activeTheme = mode === "auto" ? getAutoTheme() : mode;
    set({ mode, activeTheme });
    try {
      if (globalThis.window !== undefined) {
        localStorage.setItem("arcana-theme-mode", mode);
      }
    } catch { /* Safari Private 모드 등에서 localStorage 접근 실패 시 무시 */ } // NOSONAR
  },

  refresh: () => {
    const { mode } = get();
    if (mode === "auto") {
      set({ activeTheme: getAutoTheme() });
    }
  },
}));
