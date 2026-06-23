-- 020_harden_anon_rls.sql
-- 익명 RLS over-grant 하드닝 (#4 SELECT 열거 / #6 UPDATE 과잉)
--
-- 문제: 익명(user_id IS NULL) 세션/리딩에 대해 공개 anon 키로 직접 PostgREST 호출 시
--   - readings/saju_readings/shinjeom_readings의 "viewable by share token" 정책(using true)이
--     모든 리딩을 대량 열람 가능하게 함 (사주 birth_date/birth_name/gender 평문 PII 포함)
--   - 소유자 SELECT 정책의 "OR s.user_id IS NULL" 분기가 익명 리딩 열거 허용
--   - sessions/saju_readings UPDATE 정책의 "user_id IS NULL"/"true" 가 익명 행 임의 변경 허용
--
-- 안전성: 서버는 모든 쓰기/소유권/공유결과 조회를 getAdminDb()(service_role, RLS 우회)로 수행한다.
--   - result 페이지(share_token)는 getAdminDb로 조회 → "using(true)" SELECT 정책 불필요
--   - mypage(쿠키 클라이언트)는 본인 소유 세션의 리딩만 조회 → 소유자 정책으로 충분
--   검증: 하드닝 정책 적용 후에도 authenticated 사용자가 본인 리딩 전수 가시(rollback 시뮬 확인).

-- ── sessions UPDATE: 익명 분기 제거 (서버는 getAdminDb로 갱신) ──
DROP POLICY IF EXISTS "Users can update own sessions" ON public.sessions;
CREATE POLICY "Users can update own sessions" ON public.sessions FOR UPDATE
  USING (auth.uid() = user_id);

-- ── readings: 공개 SELECT(true) 제거 + 소유자 전용 ──
DROP POLICY IF EXISTS "Readings viewable by share token" ON public.readings;
DROP POLICY IF EXISTS "Readings viewable by session owner" ON public.readings;
CREATE POLICY "Readings viewable by session owner" ON public.readings FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.sessions s
    WHERE s.id = readings.session_id AND s.user_id = auth.uid()
  ));

-- ── saju_readings: 공개 SELECT(true) 제거 + 소유자 전용 + 익명 UPDATE(true) 제거 ──
DROP POLICY IF EXISTS "Saju readings viewable by share token" ON public.saju_readings;
DROP POLICY IF EXISTS "Saju readings viewable by session owner" ON public.saju_readings;
CREATE POLICY "Saju readings viewable by session owner" ON public.saju_readings FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.sessions s
    WHERE s.id = saju_readings.session_id AND s.user_id = auth.uid()
  ));
DROP POLICY IF EXISTS "Anyone can update saju readings" ON public.saju_readings;

-- ── shinjeom_readings: 공개 SELECT(true) 제거 + 소유자 전용 ──
DROP POLICY IF EXISTS "Shinjeom readings viewable by share token" ON public.shinjeom_readings;
DROP POLICY IF EXISTS "Shinjeom readings viewable by session owner" ON public.shinjeom_readings;
CREATE POLICY "Shinjeom readings viewable by session owner" ON public.shinjeom_readings FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.sessions s
    WHERE s.id = shinjeom_readings.session_id AND s.user_id = auth.uid()
  ));
