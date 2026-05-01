import { TestCase } from '../types';
import { characters } from './characters';

const TOPICS = [
  { topic: 'saju-general',         timeRange: '올해' },
  { topic: 'saju-love-single',     timeRange: '올해' },
  { topic: 'saju-love-couple',     timeRange: '올해' },
  { topic: 'saju-career',          timeRange: '이번 달' },
  { topic: 'saju-health',          timeRange: '올해' },
  { topic: 'saju-personality',     timeRange: '올해' },
  { topic: 'saju-compatibility',   timeRange: '올해' },
  { topic: 'saju-auspicious-date', timeRange: '올해' },
] as const;

const FIXED_INPUT = {
  birthDate: '1990-03-20',
  gender: 'male' as const,
  birthHour: '자시(23:00~01:00)',
};

export function getSajuMatrix(): TestCase[] {
  return characters.flatMap(charId =>
    TOPICS.map(({ topic, timeRange }) => ({
      id: `saju-${charId}-${topic}`,
      service: 'saju' as const,
      characterId: charId,
      topic,
      inputValues: { ...FIXED_INPUT, timeRange },
    }))
  );
}
