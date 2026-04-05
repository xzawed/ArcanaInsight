-- sessions.topic 제약 확장: 신점 직장/이직 + 택일 토픽 추가
ALTER TABLE sessions DROP CONSTRAINT IF EXISTS sessions_topic_check;
ALTER TABLE sessions ADD CONSTRAINT sessions_topic_check
  CHECK (topic IN (
    'love', 'love-single', 'love-couple', 'finance', 'career', 'health', 'general',
    'fortune-3y', 'fortune-5y', 'fortune-full',
    'saju-general', 'saju-love-single', 'saju-love-couple',
    'saju-career', 'saju-health', 'saju-personality',
    'saju-compatibility', 'saju-auspicious-date',
    'shinjeom-general', 'shinjeom-love', 'shinjeom-wealth', 'shinjeom-health',
    'shinjeom-career', 'shinjeom-auspicious'
  ));
