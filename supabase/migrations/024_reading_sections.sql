-- 024_reading_sections.sql
-- 사주·신점 섹션(sajuSections/shinjeomSections) DB 영속 — 공유·재방문 결과에도 4-섹션 프리미엄 리딩 노출.
-- 이전엔 overall_reading/topic_reading/advice(+023 direct_answer)만 저장돼 재방문 시 섹션이 소실됐다.
-- JSONB 단일 컬럼(구조 객체 그대로 round-trip). saju_readings.elements(jsonb 오행 데이터)와 이름 충돌 없음.
-- 앱은 persistReadingSections(best-effort UPDATE)로 기록하므로 컬럼 미적용 환경에서도 본 리딩 insert 무영향.

ALTER TABLE public.saju_readings
  ADD COLUMN IF NOT EXISTS saju_sections JSONB DEFAULT '{}'::jsonb;

ALTER TABLE public.shinjeom_readings
  ADD COLUMN IF NOT EXISTS shinjeom_sections JSONB DEFAULT '{}'::jsonb;
