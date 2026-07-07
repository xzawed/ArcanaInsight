import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  getCardImageUrl,
  getCardBackUrl,
  getCardThumbnailUrl,
} from '@/lib/storage';

const SUPABASE_URL = 'https://test.supabase.co';
const SUPABASE_BASE = `${SUPABASE_URL}/storage/v1/object/public/card-skins`;
const ASSET_BASE = 'https://cdn.example.xyz';
const R2_BASE = `${ASSET_BASE}/card-skins`;

// env는 호출 시점에 읽히므로 테스트마다 격리 (원복 포함)
let savedAsset: string | undefined;
let savedProvider: string | undefined;

beforeEach(() => {
  savedAsset = process.env.NEXT_PUBLIC_ASSET_BASE_URL;
  savedProvider = process.env.DB_PROVIDER;
  process.env.NEXT_PUBLIC_SUPABASE_URL = SUPABASE_URL;
  delete process.env.NEXT_PUBLIC_ASSET_BASE_URL;
  delete process.env.DB_PROVIDER; // 기본 supabase
});

afterEach(() => {
  if (savedAsset === undefined) delete process.env.NEXT_PUBLIC_ASSET_BASE_URL;
  else process.env.NEXT_PUBLIC_ASSET_BASE_URL = savedAsset;
  if (savedProvider === undefined) delete process.env.DB_PROVIDER;
  else process.env.DB_PROVIDER = savedProvider;
});

describe('skin URL — Supabase 폴백 모드 (ASSET_BASE 미설정 + supabase)', () => {
  it('카드 앞면 URL', () => {
    expect(getCardImageUrl('gold-luxury', 'major-00')).toBe(
      `${SUPABASE_BASE}/gold-luxury/front/major-00.png`
    );
  });

  it('카드 뒷면 URL', () => {
    expect(getCardBackUrl('dark-gothic')).toBe(`${SUPABASE_BASE}/dark-gothic/back.png`);
  });

  it('썸네일은 원본 앞면 URL과 동일 (변환 파라미터 없음)', () => {
    expect(getCardThumbnailUrl('neon-cyberpunk', 'cups-01')).toBe(
      `${SUPABASE_BASE}/neon-cyberpunk/front/cups-01.png`
    );
  });

  it('SUPABASE_URL 미설정 시 에러', () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    expect(() => getCardImageUrl('gold-luxury', 'major-00')).toThrow(
      'NEXT_PUBLIC_SUPABASE_URL is not set'
    );
    process.env.NEXT_PUBLIC_SUPABASE_URL = SUPABASE_URL;
  });
});

describe('skin URL — R2/CDN 모드 (ASSET_BASE 설정)', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_ASSET_BASE_URL = ASSET_BASE;
  });

  it('카드 앞면 URL이 자산 베이스를 사용한다', () => {
    expect(getCardImageUrl('gold-luxury', 'major-00')).toBe(
      `${R2_BASE}/gold-luxury/front/major-00.png`
    );
  });

  it('카드 뒷면 URL이 자산 베이스를 사용한다', () => {
    expect(getCardBackUrl('emerald-enchant')).toBe(`${R2_BASE}/emerald-enchant/back.png`);
  });

  it('베이스 끝 슬래시를 정규화한다 (이중 슬래시 방지)', () => {
    process.env.NEXT_PUBLIC_ASSET_BASE_URL = `${ASSET_BASE}/`;
    expect(getCardBackUrl('pastel-dream')).toBe(`${R2_BASE}/pastel-dream/back.png`);
  });

  it('R2가 postgres 로컬보다 우선한다 (ASSET_BASE + postgres)', () => {
    process.env.DB_PROVIDER = 'postgres';
    expect(getCardImageUrl('gold-luxury', 'wands-07')).toBe(
      `${R2_BASE}/gold-luxury/front/wands-07.png`
    );
  });
});

describe('skin URL — postgres 로컬 폴백 (ASSET_BASE 미설정 + postgres)', () => {
  beforeEach(() => {
    process.env.DB_PROVIDER = 'postgres';
  });

  it('카드 앞면 URL이 로컬 public 경로를 사용한다', () => {
    expect(getCardImageUrl('gold-luxury', 'major-00')).toBe(
      '/images/skins/gold-luxury/front/major-00.png'
    );
  });

  it('카드 뒷면 URL이 로컬 public 경로를 사용한다', () => {
    expect(getCardBackUrl('dark-gothic')).toBe('/images/skins/dark-gothic/back.png');
  });
});
