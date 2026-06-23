-- 021_harden_anon_insert_rls.sql
-- 익명 INSERT over-grant 하드닝 — "FOR INSERT WITH CHECK (true)" 정책 7종 제거
-- (020의 SELECT/UPDATE 하드닝(#4/#6) 범위 밖이던 INSERT 후속분, Supabase 보안 어드바이저 WARN 해소)
--
-- 문제: 아래 7개 테이블의 INSERT 정책이 모두 "WITH CHECK (true)" 라서
--   공개 anon 키로 PostgREST 직접 호출 시 누구나 임의 행을 삽입할 수 있다.
--   - daily_cards 는 003 주석이 "서비스 롤만 쓰기 가능"이라 명시했으나 정책은 WITH CHECK(true)로
--     의도(service_role 전용)와 구현(anon 허용)이 불일치했다.
--
-- 안전성(전수조사 검증 완료):
--   서버의 모든 INSERT/insertMany/upsert 는 getAdminDb()(SupabaseAdminAdapter →
--   createAdminClient(), service_role)로 수행되며, service_role 은 RLS 를 우회한다.
--   세 리딩 라우트는 `const db = sessionId ? getAdminDb() : null` 패턴으로 getDb()(anon/쿠키)는
--   이 테이블 INSERT 에 절대 사용되지 않는다. src/ 전역에 raw `.from("<table>").insert/upsert`
--   경로·브라우저 클라이언트 쓰기·Edge Function·server action 은 부재(7테이블 병렬 심층 검증).
--   따라서 INSERT 정책을 제거해도 서버 쓰기는 무영향이며 anon 직접 삽입만 차단된다.
--   PostgreSQL 모드(DB_PROVIDER=postgres)는 RLS 자체가 없어 무관.
--
-- 멱등/드리프트 안전: 운영 RLS 가 마이그레이션 파일과 드리프트될 수 있어 DROP POLICY IF EXISTS 사용.

-- ── 001_initial_schema.sql 정의분 ──
DROP POLICY IF EXISTS "Anyone can create sessions" ON public.sessions;
DROP POLICY IF EXISTS "Anyone can insert cards" ON public.session_cards;
DROP POLICY IF EXISTS "Anyone can insert readings" ON public.readings;

-- ── 006_saju_readings.sql 정의분 ──
DROP POLICY IF EXISTS "Anyone can insert saju readings" ON public.saju_readings;

-- ── 003_daily_cards.sql 정의분 (주석상 의도는 service_role 전용이었음) ──
DROP POLICY IF EXISTS "daily_cards_insert" ON public.daily_cards;

-- ── 013_shinjeom_rls.sql 정의분 ──
DROP POLICY IF EXISTS "shinjeom_messages_insert" ON public.shinjeom_messages;
DROP POLICY IF EXISTS "shinjeom_readings_insert" ON public.shinjeom_readings;

-- 적용 후 검증(운영 psql/Supabase SQL editor에서 실행):
--   1) 잔존 INSERT 정책이 없어야 함(0행 기대):
--      SELECT schemaname, tablename, policyname, cmd, with_check
--        FROM pg_policies
--       WHERE schemaname = 'public'
--         AND cmd = 'INSERT'
--         AND tablename IN ('sessions','session_cards','readings','saju_readings',
--                           'daily_cards','shinjeom_messages','shinjeom_readings');
--   2) service_role 쓰기 무영향 확인(rollback 트랜잭션 시뮬):
--      BEGIN;
--        SET LOCAL ROLE service_role;   -- service_role 은 RLS 우회 → INSERT 성공해야 함
--        INSERT INTO public.sessions (service_type, topic, spread_type, status)
--          VALUES ('tarot','general','one-card','in_progress');
--        SET LOCAL ROLE anon;           -- anon 은 INSERT 정책 부재 → 실패(42501)해야 함
--        -- INSERT INTO public.sessions (...) VALUES (...);  -- 기대: ERROR 42501 RLS violation
--      ROLLBACK;
