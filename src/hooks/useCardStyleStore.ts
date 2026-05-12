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
  /** true이면 팔레트 스킨 모드 — resolvedStyle()이 null을 반환해 카드가 styleId 대신 skinId를 사용한다 */
  useSkinMode: boolean;
  setStyleOverride: (styleId: CardStyleId) => void;
  clearOverride: () => void;
  enableSkinMode: () => void;
  /** 현재 활성 테마 기반으로 최종 스타일 ID 반환. 스킨 모드에서는 null. */
  resolvedStyle: (activeTheme: string) => CardStyleId | null;
}

export const useCardStyleStore = create<CardStyleState>()(
  persist(
    (set, get) => ({
      styleOverride: null,
      useSkinMode: false,

      setStyleOverride: (styleId: CardStyleId) =>
        set({ styleOverride: styleId, useSkinMode: false }),

      clearOverride: () => set({ styleOverride: null, useSkinMode: false }),

      enableSkinMode: () => set({ useSkinMode: true }),

      resolvedStyle: (activeTheme: string): CardStyleId | null => {
        const { styleOverride, useSkinMode } = get();
        if (useSkinMode) return null;
        if (styleOverride !== null) return styleOverride;
        return (THEME_TO_STYLE_MAP[activeTheme] as CardStyleId) ?? DEFAULT_STYLE_ID;
      },
    }),
    {
      name: 'arcana-card-style',
    }
  )
);
