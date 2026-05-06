-- 016_locale_columns.sql
-- i18n PR-1: 5개 핵심 테이블에 locale 컬럼 추가 (CHECK 제약)
-- 기본값 'ko' (기존 데이터 backfill)
-- profiles: 사용자 선호 locale, 인증 사용자 전용 SSOT
-- sessions/readings/saju_readings/shinjeom_readings: 리딩 작성 시점 locale (캐릭터 메모리 cross-locale 오염 방지)
-- 위험: CHECK 제약은 추가 locale 도입 시 마이그레이션 필요 (CLAUDE.md DB CHECK 규칙)

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS locale TEXT DEFAULT 'ko'
    CHECK (locale IN ('ko', 'en', 'ja'));

ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS locale TEXT DEFAULT 'ko'
    CHECK (locale IN ('ko', 'en', 'ja'));

ALTER TABLE public.readings
  ADD COLUMN IF NOT EXISTS locale TEXT DEFAULT 'ko'
    CHECK (locale IN ('ko', 'en', 'ja'));

ALTER TABLE public.saju_readings
  ADD COLUMN IF NOT EXISTS locale TEXT DEFAULT 'ko'
    CHECK (locale IN ('ko', 'en', 'ja'));

ALTER TABLE public.shinjeom_readings
  ADD COLUMN IF NOT EXISTS locale TEXT DEFAULT 'ko'
    CHECK (locale IN ('ko', 'en', 'ja'));

-- character-context locale 필터 인덱스 (PR-4에서 사용)
CREATE INDEX IF NOT EXISTS idx_sessions_user_locale ON public.sessions (user_id, locale);
