import { describe, it, expect, beforeAll } from 'vitest';
import {
  getCardStyleImageUrl,
  getCardStyleBackUrl,
} from '@/lib/storage/card-style';

const SUPABASE_URL = 'https://test.supabase.co';
const BASE = `${SUPABASE_URL}/storage/v1/object/public/card-styles`;

beforeAll(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = SUPABASE_URL;
});

describe('getCardStyleImageUrl', () => {
  it('Major Arcana 카드 URL을 올바르게 반환한다', () => {
    expect(getCardStyleImageUrl('dark-fantasy', 'major-00')).toBe(
      `${BASE}/cards/dark-fantasy/major/00.png`
    );
    expect(getCardStyleImageUrl('dark-fantasy', 'major-21')).toBe(
      `${BASE}/cards/dark-fantasy/major/21.png`
    );
  });

  it('Cups 슈트 카드 URL을 올바르게 반환한다', () => {
    expect(getCardStyleImageUrl('art-nouveau', 'cups-01')).toBe(
      `${BASE}/cards/art-nouveau/cups/01.png`
    );
    expect(getCardStyleImageUrl('art-nouveau', 'cups-14')).toBe(
      `${BASE}/cards/art-nouveau/cups/14.png`
    );
  });

  it('Wands 슈트 카드 URL을 올바르게 반환한다', () => {
    expect(getCardStyleImageUrl('anime-mystical', 'wands-07')).toBe(
      `${BASE}/cards/anime-mystical/wands/07.png`
    );
  });

  it('Swords 슈트 카드 URL을 올바르게 반환한다', () => {
    expect(getCardStyleImageUrl('modern-digital', 'swords-10')).toBe(
      `${BASE}/cards/modern-digital/swords/10.png`
    );
  });

  it('Pentacles 슈트 카드 URL을 올바르게 반환한다', () => {
    expect(getCardStyleImageUrl('dark-fantasy', 'pentacles-14')).toBe(
      `${BASE}/cards/dark-fantasy/pentacles/14.png`
    );
  });

  it('잘못된 cardId 형식에서 에러를 던진다', () => {
    expect(() => getCardStyleImageUrl('dark-fantasy', 'invalid')).toThrow(
      'Invalid cardId format'
    );
  });
});

describe('getCardStyleBackUrl', () => {
  it('카드 뒷면 URL을 올바르게 반환한다', () => {
    expect(getCardStyleBackUrl('dark-fantasy')).toBe(
      `${BASE}/cards/dark-fantasy/card-back.png`
    );
    expect(getCardStyleBackUrl('anime-mystical')).toBe(
      `${BASE}/cards/anime-mystical/card-back.png`
    );
  });
});
