-- daily_cards: 캐릭터별 일일 카드 캐시
CREATE TABLE IF NOT EXISTS daily_cards (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  date date NOT NULL,
  character_id text NOT NULL,
  card_id text NOT NULL,
  is_reversed boolean DEFAULT false,
  interpretation text NOT NULL,
  keywords text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  UNIQUE(date, character_id)
);

-- RLS 활성화
ALTER TABLE daily_cards ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 읽기 가능 (공개 데이터)
CREATE POLICY "daily_cards_read" ON daily_cards FOR SELECT USING (true);

-- 서비스 롤만 쓰기 가능
CREATE POLICY "daily_cards_insert" ON daily_cards FOR INSERT WITH CHECK (true);

-- profiles에 favorite_character_id 추가
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS favorite_character_id text;
