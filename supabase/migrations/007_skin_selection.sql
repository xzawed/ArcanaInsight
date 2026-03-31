-- 스킨 선택 저장
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS selected_skin TEXT DEFAULT 'gold-luxury';
