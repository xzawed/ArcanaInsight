import { describe, it, expect, beforeEach } from 'vitest';
import { useCardStyleStore } from '@/hooks/useCardStyleStore';

describe('useCardStyleStore', () => {
  beforeEach(() => {
    useCardStyleStore.setState({ styleOverride: null, useSkinMode: false });
  });

  describe('resolvedStyle — 테마 자동 매핑', () => {
    it('midnight → dark-fantasy를 반환한다', () => {
      expect(useCardStyleStore.getState().resolvedStyle('midnight')).toBe('dark-fantasy');
    });

    it('dawn → art-nouveau를 반환한다', () => {
      expect(useCardStyleStore.getState().resolvedStyle('dawn')).toBe('art-nouveau');
    });

    it('sunset → modern-digital을 반환한다', () => {
      expect(useCardStyleStore.getState().resolvedStyle('sunset')).toBe('modern-digital');
    });

    it('spring → anime-mystical을 반환한다', () => {
      expect(useCardStyleStore.getState().resolvedStyle('spring')).toBe('anime-mystical');
    });

    it('summer → anime-mystical을 반환한다', () => {
      expect(useCardStyleStore.getState().resolvedStyle('summer')).toBe('anime-mystical');
    });

    it('autumn → dark-fantasy를 반환한다', () => {
      expect(useCardStyleStore.getState().resolvedStyle('autumn')).toBe('dark-fantasy');
    });

    it('winter → art-nouveau를 반환한다', () => {
      expect(useCardStyleStore.getState().resolvedStyle('winter')).toBe('art-nouveau');
    });

    it('알 수 없는 테마는 dark-fantasy(기본값)를 반환한다', () => {
      expect(useCardStyleStore.getState().resolvedStyle('unknown-theme')).toBe('dark-fantasy');
    });
  });

  describe('setStyleOverride / clearOverride', () => {
    it('override 설정 후 테마 무관하게 override를 반환한다', () => {
      useCardStyleStore.getState().setStyleOverride('anime-mystical');
      expect(useCardStyleStore.getState().resolvedStyle('midnight')).toBe('anime-mystical');
      expect(useCardStyleStore.getState().resolvedStyle('dawn')).toBe('anime-mystical');
    });

    it('clearOverride 후 테마 자동 매핑으로 복귀한다', () => {
      useCardStyleStore.getState().setStyleOverride('anime-mystical');
      useCardStyleStore.getState().clearOverride();
      expect(useCardStyleStore.getState().styleOverride).toBeNull();
      expect(useCardStyleStore.getState().resolvedStyle('midnight')).toBe('dark-fantasy');
    });
  });

  describe('useSkinMode — 팔레트 스킨 모드', () => {
    it('enableSkinMode 호출 시 useSkinMode가 true가 된다', () => {
      useCardStyleStore.getState().enableSkinMode();
      expect(useCardStyleStore.getState().useSkinMode).toBe(true);
    });

    it('skin 모드일 때 resolvedStyle은 테마와 무관하게 null을 반환한다', () => {
      useCardStyleStore.getState().enableSkinMode();
      expect(useCardStyleStore.getState().resolvedStyle('midnight')).toBeNull();
      expect(useCardStyleStore.getState().resolvedStyle('dawn')).toBeNull();
    });

    it('skin 모드일 때 styleOverride가 있어도 resolvedStyle은 null을 반환한다', () => {
      useCardStyleStore.getState().setStyleOverride('anime-mystical');
      useCardStyleStore.getState().enableSkinMode();
      expect(useCardStyleStore.getState().styleOverride).toBe('anime-mystical');
      expect(useCardStyleStore.getState().resolvedStyle('midnight')).toBeNull();
    });

    it('setStyleOverride 호출 시 useSkinMode가 false로 초기화된다', () => {
      useCardStyleStore.getState().enableSkinMode();
      useCardStyleStore.getState().setStyleOverride('anime-mystical');
      expect(useCardStyleStore.getState().useSkinMode).toBe(false);
      expect(useCardStyleStore.getState().resolvedStyle('midnight')).toBe('anime-mystical');
    });

    it('clearOverride 호출 시 useSkinMode가 false로 초기화된다', () => {
      useCardStyleStore.getState().enableSkinMode();
      useCardStyleStore.getState().clearOverride();
      expect(useCardStyleStore.getState().useSkinMode).toBe(false);
      expect(useCardStyleStore.getState().resolvedStyle('midnight')).toBe('dark-fantasy');
    });
  });
});
