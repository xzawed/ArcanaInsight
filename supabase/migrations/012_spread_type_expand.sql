-- sessions.spread_type 제약 확장: celtic-cross, relationship, horseshoe, decision, week-ahead, zodiac, tree-of-life 추가
-- 원인: topicToSpread 매핑에서 general→celtic-cross, love-couple→relationship, finance/career→horseshoe 반환 시
--       DB CHECK 제약('one-card','three-card','five-card')에 없어 INSERT 500 발생 (2026-05-02 장애)
ALTER TABLE sessions DROP CONSTRAINT IF EXISTS sessions_spread_type_check;
ALTER TABLE sessions ADD CONSTRAINT sessions_spread_type_check
  CHECK (spread_type IN (
    'one-card', 'three-card', 'five-card',
    'celtic-cross', 'relationship', 'horseshoe',
    'decision', 'week-ahead', 'zodiac', 'tree-of-life'
  ));
