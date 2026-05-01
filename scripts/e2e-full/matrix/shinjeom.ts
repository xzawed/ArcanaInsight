import { TestCase } from '../types';
import { characters } from './characters';

const TOPICS = [
  { topic: 'shinjeom-general',    message: '올해 전반적인 운세가 궁금합니다' },
  { topic: 'shinjeom-love',       message: '연애운이 어떤지 봐주세요' },
  { topic: 'shinjeom-wealth',     message: '재물운을 알고 싶어요' },
  { topic: 'shinjeom-career',     message: '직장운을 봐주세요' },
  { topic: 'shinjeom-health',     message: '건강운이 궁금합니다' },
  { topic: 'shinjeom-auspicious', message: '좋은 날을 잡아주세요' },
] as const;

const FIXED_INPUT = { birthDate: '1990-03-20', gender: 'female' as const };

export function getShinjeomMatrix(): TestCase[] {
  return characters.flatMap(charId =>
    TOPICS.map(({ topic, message }) => ({
      id: `shinjeom-${charId}-${topic}`,
      service: 'shinjeom' as const,
      characterId: charId,
      topic,
      inputValues: { ...FIXED_INPUT, message },
    }))
  );
}
