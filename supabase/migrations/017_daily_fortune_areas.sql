-- 017_daily_fortune_areas.sql
-- daily_cards 테이블에 area 컬럼 추가 (운세 영역 구분)
ALTER TABLE daily_cards ADD COLUMN IF NOT EXISTS area text NOT NULL DEFAULT 'general';

-- 기존 UNIQUE (date, character_id) → (date, character_id, area) 변경
-- Supabase는 constraint 이름으로 DROP INDEX가 되지 않으므로 두 방식 모두 시도
ALTER TABLE daily_cards DROP CONSTRAINT IF EXISTS daily_cards_date_character_id_key;
DROP INDEX IF EXISTS daily_cards_date_character_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS daily_cards_date_character_area_key
  ON daily_cards (date, character_id, area);
