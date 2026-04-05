-- sessions.topic 제약 확장: 신점 토픽 추가
ALTER TABLE sessions DROP CONSTRAINT IF EXISTS sessions_topic_check;
ALTER TABLE sessions ADD CONSTRAINT sessions_topic_check
  CHECK (topic IN (
    'love', 'love-single', 'love-couple', 'finance', 'career', 'health', 'general',
    'fortune-3y', 'fortune-5y', 'fortune-full',
    'saju-general', 'saju-love-single', 'saju-love-couple',
    'saju-career', 'saju-health', 'saju-personality',
    'saju-compatibility', 'saju-auspicious-date',
    'shinjeom-general', 'shinjeom-love', 'shinjeom-wealth', 'shinjeom-health'
  ));

-- 신점 메시지 히스토리 테이블
CREATE TABLE IF NOT EXISTS shinjeom_messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id uuid REFERENCES sessions(id) ON DELETE CASCADE NOT NULL,
  role text NOT NULL CHECK (role IN ('user', 'character')),
  content text NOT NULL,
  message_index integer NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_shinjeom_messages_session
  ON shinjeom_messages(session_id, message_index);

-- 신점 최종 결과 테이블
CREATE TABLE IF NOT EXISTS shinjeom_readings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id uuid REFERENCES sessions(id) ON DELETE CASCADE NOT NULL UNIQUE,
  overall_reading text NOT NULL DEFAULT '',
  topic_reading text NOT NULL DEFAULT '',
  advice text NOT NULL DEFAULT '',
  share_token text DEFAULT encode(gen_random_bytes(12), 'hex') UNIQUE,
  created_at timestamptz DEFAULT now() NOT NULL
);
