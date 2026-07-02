import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  getCardStyleImageUrl,
  getCardStyleBackUrl,
  getServiceBackgroundUrl,
} from '@/lib/storage/card-style';

const SUPABASE_URL = 'https://test.supabase.co';
const BASE = `${SUPABASE_URL}/storage/v1/object/public/card-styles`;

beforeAll(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = SUPABASE_URL;
  // 폴백(Supabase) 모드 테스트 격리 — R2 베이스가 설정돼 있으면 제거
  delete process.env.NEXT_PUBLIC_ASSET_BASE_URL;
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
      `${BASE}/cards/dark-fantasy/card-back.webp`
    );
    expect(getCardStyleBackUrl('anime-mystical')).toBe(
      `${BASE}/cards/anime-mystical/card-back.webp`
    );
  });
});

describe('getServiceBackgroundUrl', () => {
  it('서비스·테마 배경 URL을 올바르게 반환한다', () => {
    expect(getServiceBackgroundUrl('tarot', 'midnight')).toBe(
      `${BASE}/backgrounds/tarot/midnight.png`
    );
    expect(getServiceBackgroundUrl('saju', 'spring')).toBe(
      `${BASE}/backgrounds/saju/spring.png`
    );
    expect(getServiceBackgroundUrl('shinjeom', 'winter')).toBe(
      `${BASE}/backgrounds/shinjeom/winter.png`
    );
  });
});

describe('NEXT_PUBLIC_ASSET_BASE_URL 설정 시 (R2/CDN 우선)', () => {
  const ASSET_BASE = 'https://cdn.example.xyz';
  const R2_BASE = `${ASSET_BASE}/card-styles`;

  beforeAll(() => {
    process.env.NEXT_PUBLIC_ASSET_BASE_URL = ASSET_BASE;
  });
  afterAll(() => {
    delete process.env.NEXT_PUBLIC_ASSET_BASE_URL;
  });

  it('카드 이미지 URL이 자산 베이스를 사용한다', () => {
    expect(getCardStyleImageUrl('dark-fantasy', 'major-00')).toBe(
      `${R2_BASE}/cards/dark-fantasy/major/00.png`
    );
  });

  it('카드 뒷면 URL이 자산 베이스를 사용한다', () => {
    expect(getCardStyleBackUrl('anime-mystical')).toBe(
      `${R2_BASE}/cards/anime-mystical/card-back.webp`
    );
  });

  it('서비스 배경 URL이 자산 베이스를 사용한다', () => {
    expect(getServiceBackgroundUrl('tarot', 'spring')).toBe(
      `${R2_BASE}/backgrounds/tarot/spring.png`
    );
  });

  it('베이스 끝 슬래시를 정규화한다 (이중 슬래시 방지)', () => {
    process.env.NEXT_PUBLIC_ASSET_BASE_URL = `${ASSET_BASE}/`;
    expect(getCardStyleBackUrl('dark-fantasy')).toBe(
      `${R2_BASE}/cards/dark-fantasy/card-back.webp`
    );
    process.env.NEXT_PUBLIC_ASSET_BASE_URL = ASSET_BASE;
  });
});
