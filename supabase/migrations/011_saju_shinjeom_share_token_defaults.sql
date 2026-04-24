-- saju_readings, shinjeom_readings share_token NULL 백필 + DB 기본값 설정
-- readings 테이블은 migration 010에서 이미 처리됨

UPDATE saju_readings
SET share_token = gen_random_uuid()::text
WHERE share_token = '' OR share_token IS NULL;

ALTER TABLE saju_readings
  ALTER COLUMN share_token SET DEFAULT gen_random_uuid()::text;

UPDATE shinjeom_readings
SET share_token = gen_random_uuid()::text
WHERE share_token = '' OR share_token IS NULL;

ALTER TABLE shinjeom_readings
  ALTER COLUMN share_token SET DEFAULT gen_random_uuid()::text;
