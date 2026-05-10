import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  CardStyleId,
  DEFAULT_STYLE_ID,
  THEME_TO_STYLE_MAP,
} from '@/data/cardStyles';

interface CardStyleState {
  /** 사용자가 명시적으로 선택한 스타일 오버라이드 (null = 테마 자동 매핑 사용) */
  styleOverride: CardStyleId | null;
  setStyleOverride: (styleId: CardStyleId) => void;
  clearOverride: () => void;
  /** 현재 활성 테마 기반으로 최종 스타일 ID 반환 */
  resolvedStyle: (activeTheme: string) => CardStyleId;
}

export const useCardStyleStore = create<CardStyleState>()(
  persist(
    (set, get) => ({
      styleOverride: null,

      setStyleOverride: (styleId: CardStyleId) =>
        set({ styleOverride: styleId }),

      clearOverride: () => set({ styleOverride: null }),

      resolvedStyle: (activeTheme: string): CardStyleId => {
        const { styleOverride } = get();
        if (styleOverride !== null) return styleOverride;
        return (THEME_TO_STYLE_MAP[activeTheme] as CardStyleId) ?? DEFAULT_STYLE_ID;
      },
    }),
    {
      name: 'arcana-card-style',
    }
  )
);
