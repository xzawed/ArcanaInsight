-- 023_direct_answer.sql
-- 질문 직답(directAnswer) DB 영속 — 공유 링크·마이페이지 재방문 결과에도 직답 노출.
-- 이전엔 라이브 세션 SSE 결과에서만 노출되고 DB 미저장이라 재방문/공유 시 소실됐다(3서비스 공통).
-- 3개 리딩 테이블에 direct_answer 컬럼 추가. 기존 행은 기본값 ''(빈 문자열) backfill.
-- NULLABLE + DEFAULT '' — 애플리케이션은 best-effort UPDATE(persistDirectAnswer)로 기록하므로
-- 컬럼 미존재/미적용 환경에서도 본 리딩 저장(insert)은 영향받지 않는다.

ALTER TABLE public.readings
  ADD COLUMN IF NOT EXISTS direct_answer TEXT DEFAULT '';

ALTER TABLE public.saju_readings
  ADD COLUMN IF NOT EXISTS direct_answer TEXT DEFAULT '';

ALTER TABLE public.shinjeom_readings
  ADD COLUMN IF NOT EXISTS direct_answer TEXT DEFAULT '';
