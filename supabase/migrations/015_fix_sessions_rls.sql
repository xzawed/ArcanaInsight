-- 015_fix_sessions_rls.sql
-- sessions SELECT: 익명 세션(user_id IS NULL)도 읽기 허용
-- 이유: assertSessionOwnership이 익명 세션을 조회해 소유권을 검증해야 하므로
-- 위험도: 익명 세션은 user_id가 없어 PII 노출 없음. session_id는 UUID v4로 추측 불가.

DROP POLICY IF EXISTS "Users can view own sessions" ON public.sessions;

CREATE POLICY "Users can view own sessions" ON public.sessions FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);
