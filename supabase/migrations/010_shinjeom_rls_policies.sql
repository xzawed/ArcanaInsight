-- 신점 테이블 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_shinjeom_readings_session_id ON shinjeom_readings(session_id);
CREATE INDEX IF NOT EXISTS idx_shinjeom_readings_share_token ON shinjeom_readings(share_token);

-- 신점 리딩 RLS 정책
ALTER TABLE shinjeom_readings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Shinjeom readings viewable by session owner" ON shinjeom_readings FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM sessions s
    WHERE s.id = session_id AND (s.user_id = auth.uid() OR s.user_id IS NULL)
  ));
CREATE POLICY "Shinjeom readings viewable by share token" ON shinjeom_readings FOR SELECT
  USING (true);
CREATE POLICY "Anyone can insert shinjeom readings" ON shinjeom_readings FOR INSERT
  WITH CHECK (true);

-- 신점 메시지 RLS 정책
ALTER TABLE shinjeom_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Shinjeom messages viewable by session owner" ON shinjeom_messages FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM sessions s
    WHERE s.id = session_id AND (s.user_id = auth.uid() OR s.user_id IS NULL)
  ));
CREATE POLICY "Anyone can insert shinjeom messages" ON shinjeom_messages FOR INSERT
  WITH CHECK (true);
