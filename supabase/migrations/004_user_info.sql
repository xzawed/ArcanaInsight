-- profiles 테이블에 개인정보 컬럼 추가
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS birth_name text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS birth_date date;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gender text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS birth_hour text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS privacy_agreed_at timestamptz;
