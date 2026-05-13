-- saju_readings.birth_hour: NOT NULL 제약 해제 (시간을 모릅니다 케이스 허용)
ALTER TABLE saju_readings ALTER COLUMN birth_hour DROP NOT NULL;

-- saju_readings.mbti: 컬럼 추가 (018에서 profiles에만 추가, saju_readings 누락)
ALTER TABLE saju_readings ADD COLUMN IF NOT EXISTS mbti text;
