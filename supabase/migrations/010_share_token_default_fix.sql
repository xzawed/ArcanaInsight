-- 기존 빈 문자열 share_token을 UUID로 교체 (unique 제약 충돌 방지)
UPDATE readings
SET share_token = gen_random_uuid()::text
WHERE share_token = '' OR share_token IS NULL;

-- DB 레벨 default도 UUID 생성 함수로 변경
ALTER TABLE readings
  ALTER COLUMN share_token SET DEFAULT gen_random_uuid()::text;
