import { TestCase } from '../types';
import { characters } from './characters';

const TOPICS = [
  { topic: 'love',        spreadType: 'three-card' },
  { topic: 'love-single', spreadType: 'three-card' },
  { topic: 'love-couple', spreadType: 'relationship' },
  { topic: 'finance',     spreadType: 'horseshoe' },
  { topic: 'career',      spreadType: 'horseshoe' },
  { topic: 'health',      spreadType: 'one-card' },
  { topic: 'general',     spreadType: 'celtic-cross' },
] as const;

const FIXED_INPUT = { name: '테스터', birthDate: '1995-06-15', gender: 'female' as const };

export function getTarotMatrix(): TestCase[] {
  return characters.flatMap(charId =>
    TOPICS.map(({ topic, spreadType }) => ({
      id: `tarot-${charId}-${topic}`,
      service: 'tarot' as const,
      characterId: charId,
      topic,
      spreadType,
      inputValues: FIXED_INPUT,
    }))
  );
}
