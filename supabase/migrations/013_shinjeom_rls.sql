-- 013_shinjeom_rls.sql
-- shinjeom_messages RLS (008_shinjeom.sql에서 누락됨)
ALTER TABLE shinjeom_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shinjeom_messages_select" ON shinjeom_messages FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM sessions s
    WHERE s.id = session_id AND (s.user_id = auth.uid() OR s.user_id IS NULL)
  ));

CREATE POLICY "shinjeom_messages_insert" ON shinjeom_messages FOR INSERT
  WITH CHECK (true);

-- shinjeom_readings RLS (008_shinjeom.sql에서 누락됨)
-- 주의: share_token USING(true)는 의도적으로 제외 — 014에서 service_role 어댑터로 대체
ALTER TABLE shinjeom_readings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shinjeom_readings_session_owner" ON shinjeom_readings FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM sessions s
    WHERE s.id = session_id AND (s.user_id = auth.uid() OR s.user_id IS NULL)
  ));

CREATE POLICY "shinjeom_readings_insert" ON shinjeom_readings FOR INSERT
  WITH CHECK (true);
