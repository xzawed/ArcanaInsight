-- sessions 테이블에 character_id 컬럼 추가
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS character_id text;

-- topic 제약 조건 확장: love-single, love-couple 추가 (멱등성 보장)
ALTER TABLE sessions DROP CONSTRAINT IF EXISTS sessions_topic_check;
ALTER TABLE sessions ADD CONSTRAINT sessions_topic_check
  CHECK (topic IN ('love', 'love-single', 'love-couple', 'finance', 'career', 'health', 'general'));

-- character_id 인덱스 추가 (마이페이지 조회 성능)
CREATE INDEX IF NOT EXISTS idx_sessions_character_id ON sessions(character_id);
