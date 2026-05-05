-- 014_fix_share_token_rls.sql
-- readings/saju_readings의 전체 행 공개 정책 제거
-- share_token 조회는 서버 레이어의 service_role 클라이언트로 처리한다
DROP POLICY IF EXISTS "Readings viewable by share token" ON public.readings;
DROP POLICY IF EXISTS "Saju readings viewable by share token" ON saju_readings;
-- shinjeom_readings는 013에서 USING(true) 없이 추가되었으므로 불필요
