-- 025_parse_failures.sql
-- 리딩 parseError(지배적 실패 모드) 계량용 경량 테이블.
--
-- 배경: parseError 리딩은 저장 게이트(`!result.parseError`)로 미저장되고, failed_readings(DB 저장 실패
--   전용 dead-letter)에도 들어가지 않아 발생 분포·추이가 관측 불가였다. #499에서 `[reading-parse-error]`
--   로그 마커(①)만 추가했으나 로그는 로테이션 후 소실되고 집계가 어렵다. 본 테이블로 영속 계량한다.
--
-- ⚠️ 재처리 큐(failed_readings)와 분리한 이유: failed_readings.status='pending' 큐는 재처리
--   엔드포인트(dispatchFailedReadingSave)가 payload로 원본 save를 재호출한다. parseError 결과(빈/부분)를
--   그 큐에 넣으면 재처리가 미저장 게이트를 우회해 빈 result/[id]를 저장해버린다. 따라서 parse_failures는
--   순수 관측 전용(재처리 대상 아님)으로 별도 테이블에 둔다.
--
-- 보안: 기록은 getAdminDb()(service_role)로만 수행. RLS 활성 + 정책 없음 → anon/authenticated 전면 차단
--   (021/022와 일관). PostgreSQL 모드는 RLS 무관.

CREATE TABLE IF NOT EXISTS public.parse_failures (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service      text NOT NULL,        -- 'tarot' | 'saju' | 'shinjeom'
  parse_error  text NOT NULL,        -- 'truncated' | 'invalid_json' | 'fallback_text' | 'missing_fields'
  session_id   text,                 -- 원본 세션 id (nullable — 익명/소실 가능)
  locale       text NOT NULL DEFAULT 'ko',
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- 추이(시간순) + 분포(타입·서비스별) 집계용 인덱스
CREATE INDEX IF NOT EXISTS idx_parse_failures_created ON public.parse_failures (created_at);
CREATE INDEX IF NOT EXISTS idx_parse_failures_type    ON public.parse_failures (parse_error, service);

-- RLS: 활성화하되 정책 없음 → service_role(RLS 우회)만 접근. anon/authenticated 전면 차단.
ALTER TABLE public.parse_failures ENABLE ROW LEVEL SECURITY;
