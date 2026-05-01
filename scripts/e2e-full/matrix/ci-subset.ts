import { TestCase } from '../types';
import { getTarotMatrix } from './tarot';
import { getSajuMatrix } from './saju';
import { getShinjeomMatrix } from './shinjeom';

const CI_IDS = [
  'tarot-arcana-love', 'tarot-cairn-general', 'tarot-hoshi-finance', 'tarot-ren-health',
  'saju-miko-saju-general', 'saju-zero-saju-love-single', 'saju-luna-saju-career', 'saju-haru-saju-personality',
  'shinjeom-seonhwa-shinjeom-general', 'shinjeom-lix-shinjeom-love', 'shinjeom-rei-shinjeom-wealth', 'shinjeom-ethan-shinjeom-career',
];

export function getFullMatrix(): TestCase[] {
  return [...getTarotMatrix(), ...getSajuMatrix(), ...getShinjeomMatrix()];
}

export function getCiSubset(): TestCase[] {
  const all = getFullMatrix();
  return all.filter(tc => CI_IDS.includes(tc.id));
}
