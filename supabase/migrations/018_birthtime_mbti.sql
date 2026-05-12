-- 기존 birth_hour 값(시진 코드 문자열)은 HH:MM 역변환 불가 → null 처리
UPDATE profiles SET birth_hour = NULL
WHERE birth_hour IS NOT NULL
  AND birth_hour NOT SIMILAR TO '\d{2}:\d{2}';

-- MBTI 컬럼 추가
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS mbti text;
