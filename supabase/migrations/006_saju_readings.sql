-- sessions.spread_type NULL 허용 (사주는 스프레드 불필요)
ALTER TABLE sessions ALTER COLUMN spread_type DROP NOT NULL;

-- Topic 제약 확장: 사주 종합운세 3종 추가
ALTER TABLE sessions DROP CONSTRAINT IF EXISTS sessions_topic_check;
ALTER TABLE sessions ADD CONSTRAINT sessions_topic_check
  CHECK (topic IN (
    'love', 'love-single', 'love-couple', 'finance', 'career', 'health', 'general',
    'fortune-3y', 'fortune-5y', 'fortune-full'
  ));

-- 사주 리딩 테이블
CREATE TABLE IF NOT EXISTS saju_readings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id uuid REFERENCES sessions(id) ON DELETE CASCADE NOT NULL UNIQUE,
  birth_date date NOT NULL,
  birth_hour text NOT NULL,
  gender text NOT NULL,
  birth_name text,
  pillars jsonb NOT NULL,
  day_master text NOT NULL,
  day_master_element text NOT NULL,
  is_strong boolean NOT NULL,
  elements jsonb NOT NULL,
  ten_stars jsonb NOT NULL,
  twelve_stages jsonb NOT NULL,
  interactions jsonb NOT NULL,
  yongsin jsonb NOT NULL,
  major_fortunes jsonb NOT NULL,
  yearly_fortune jsonb NOT NULL,
  overall_reading text NOT NULL DEFAULT '',
  topic_reading text NOT NULL DEFAULT '',
  advice text NOT NULL DEFAULT '',
  share_token text UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_saju_readings_session_id ON saju_readings(session_id);
CREATE INDEX IF NOT EXISTS idx_saju_readings_share_token ON saju_readings(share_token);
CREATE INDEX IF NOT EXISTS idx_saju_readings_birth_date ON saju_readings(birth_date);

ALTER TABLE saju_readings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Saju readings viewable by session owner" ON saju_readings FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM sessions s
    WHERE s.id = session_id AND (s.user_id = auth.uid() OR s.user_id IS NULL)
  ));
CREATE POLICY "Saju readings viewable by share token" ON saju_readings FOR SELECT
  USING (true);
CREATE POLICY "Anyone can insert saju readings" ON saju_readings FOR INSERT
  WITH CHECK (true);

-- 사주 서비스 활성화
UPDATE public.services SET is_active = true WHERE id = 'saju';
