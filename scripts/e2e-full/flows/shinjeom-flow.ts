import type { Page } from '@playwright/test';
import type { TestCase } from '../types';
import { CHAR_KO } from './constants';

const TOPIC_KO: Record<string, string> = {
  'shinjeom-general': '신수',
  'shinjeom-love': '연애',
  'shinjeom-wealth': '재물',
  'shinjeom-career': '직장',
  'shinjeom-health': '건강',
  'shinjeom-auspicious': '택일',
};

export async function executeShinjeomFlow(
  page: Page,
  tc: TestCase,
  baseUrl: string
): Promise<{ responseText: string }> {
  // 1. 캐릭터 선택
  await page.goto(`${baseUrl}/shinjeom`);
  await page.waitForLoadState('networkidle');
  const charName = CHAR_KO[tc.characterId] ?? tc.characterId;
  const charBtn = page.locator('button').filter({ hasText: charName });
  await charBtn.first().waitFor({ timeout: 15000 });
  await charBtn.first().click();

  // 2. 주제 선택
  const topicKo = TOPIC_KO[tc.topic] ?? tc.topic;
  await page.locator(`text=${topicKo}`).first().waitFor({ timeout: 10000 });
  await page.locator(`text=${topicKo}`).first().click();

  // 3. 세션 페이지 대기
  await page.waitForURL('**/shinjeom/session**', { timeout: 15000 });

  // 4. 첫 번째 메시지 전송
  await page.locator('text=고민').first().waitFor({ timeout: 10000 });
  const message = tc.inputValues.message ?? '운세를 봐주세요';
  const inputBox = page.locator("input[type='text']");
  await inputBox.fill(message);
  const sendBtn = page.locator('button').filter({ hasText: '전송' });
  await sendBtn.click();

  // SSE 응답 대기 (첫 번째 턴)
  await page.waitForTimeout(8000);

  // 5. 두 번째·세 번째 메시지
  for (const followUp of ['감사합니다. 더 자세히 알 수 있을까요?', '알겠습니다.']) {
    const inputBox2 = page.locator("input[type='text']");
    if (await inputBox2.isVisible({ timeout: 3000 }).catch(() => false)) {
      await inputBox2.fill(followUp);
      await page.locator('button').filter({ hasText: '전송' }).click();
      await page.waitForTimeout(8000);
    }
  }

  // 6. 신점 결과 버튼
  const resultBtn = page.locator('text=신점 결과 받기');
  await resultBtn.waitFor({ timeout: 30000 });
  await resultBtn.click();

  // 7. 결과 페이지 대기
  await page.waitForURL('**/shinjeom/result/**', { timeout: 120000 });

  // 8. 응답 텍스트 추출
  const textLocator = page.locator('[data-testid="reading-content"]').first();
  await textLocator.waitFor({ timeout: 30000 });
  const responseText = await textLocator.innerText();

  return { responseText };
}
