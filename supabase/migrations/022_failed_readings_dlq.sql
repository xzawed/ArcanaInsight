-- 022_failed_readings_dlq.sql
-- 리딩 저장 dead-letter 큐 — 영구 저장 실패한 리딩을 영속화하여 재처리 가능하게 한다.
-- (A-1 잔여: 기술부채 C — 무음 데이터 유실 완전 차단)
--
-- 배경: 타로/사주/신점 리딩의 DB 저장이 withRetry(3회) 후에도 영구 실패하면 데이터가 유실된다.
--   A-1(#435)로 구조적 로깅 + saved SSE 시그널(관측성)은 확보했으나, 실패분 자체는 복구 불가였다.
--   본 테이블에 실패 저장의 재처리 인자(payload)를 영속화하고, 내부 재처리 엔드포인트가 재시도한다.
--
-- 보안: 모든 접근은 getAdminDb()(service_role)로만 수행된다. anon/authenticated 정책을 두지 않아
--   (021 INSERT 하드닝과 일관) 공개 anon 키로 직접 접근할 수 없다. PostgreSQL 모드는 RLS 무관.

CREATE TABLE IF NOT EXISTS public.failed_readings (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service       text NOT NULL,                 -- 'tarot' | 'saju' | 'shinjeom'
  session_id    text,                          -- 원본 세션 id (nullable — 익명/소실 가능)
  payload       jsonb NOT NULL,                -- 재저장에 필요한 서비스별 인자
  error_code    text,                          -- PostgreSQL 에러코드 등
  error_message text,
  attempts      int  NOT NULL DEFAULT 0,       -- 재처리 시도 횟수
  status        text NOT NULL DEFAULT 'pending', -- 'pending' | 'resolved' | 'abandoned'
  created_at    timestamptz NOT NULL DEFAULT now(),
  last_attempt_at timestamptz
);

-- pending 큐 조회용 인덱스 (재처리 엔드포인트가 status='pending'을 created_at 순으로 가져온다)
CREATE INDEX IF NOT EXISTS idx_failed_readings_status_created
  ON public.failed_readings (status, created_at);

-- RLS: 활성화하되 정책 없음 → service_role(RLS 우회)만 접근 가능. anon/authenticated 전면 차단.
ALTER TABLE public.failed_readings ENABLE ROW LEVEL SECURITY;
