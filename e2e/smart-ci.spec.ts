// ⚠️ 실 Supabase 인증 세션 필요 — CI testIgnore 대상 (playwright.config.ts testIgnore로 CI 제외)
import { test, expect } from '@playwright/test';
import { getCiSubset } from '../scripts/e2e-full/matrix/ci-subset';
import { executeTarotFlow } from '../scripts/e2e-full/flows/tarot-flow';
import { executeSajuFlow } from '../scripts/e2e-full/flows/saju-flow';
import { executeShinjeomFlow } from '../scripts/e2e-full/flows/shinjeom-flow';
import { runStructureValidation } from '../scripts/e2e-full/validators/structure-validator';
import { runContentValidation } from '../scripts/e2e-full/validators/content-validator';

const CI_CASES = getCiSubset();

for (const tc of CI_CASES) {
  test(`[${tc.service}] ${tc.characterId} × ${tc.topic}`, async ({ page }) => {
    // 실제 AI 호출 포함 — 타임아웃 180초로 확장
    test.setTimeout(180_000);

    const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';
    let responseText = '';
    let selectedCards: string[] = [];

    if (tc.service === 'tarot') {
      const r = await executeTarotFlow(page, tc, BASE_URL);
      responseText = r.responseText;
      selectedCards = r.selectedCards;
    } else if (tc.service === 'saju') {
      const r = await executeSajuFlow(page, tc, BASE_URL);
      responseText = r.responseText;
    } else {
      const r = await executeShinjeomFlow(page, tc, BASE_URL);
      responseText = r.responseText;
    }

    const structure = await runStructureValidation(page);
    const content = await runContentValidation(responseText, tc, selectedCards);

    expect(structure.passed, `구조 검증 실패: ${structure.reason}`).toBe(true);
    expect(content.passed || content.warning, `콘텐츠 검증 실패 (score: ${content.score}): ${content.reason}`).toBe(true);
  });
}
