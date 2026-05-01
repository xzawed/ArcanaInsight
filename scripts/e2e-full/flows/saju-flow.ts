import type { Page } from '@playwright/test';
import type { TestCase } from '../types';

const CHAR_KO: Record<string, string> = {
  arcana: '아르카나', miko: '미코', seonhwa: '선화', hoshi: '호시',
  luna: '루나', rei: '레이', cairn: '카이른', zero: '제로',
  haru: '하루', ren: '렌', lix: '릭스', ethan: '에단',
};

const TOPIC_KO: Record<string, string> = {
  'saju-general': '종합운',
  'saju-love-single': '솔로연애',
  'saju-love-couple': '커플연애',
  'saju-career': '직장',
  'saju-health': '건강',
  'saju-personality': '성격',
  'saju-compatibility': '궁합',
  'saju-auspicious-date': '택일',
};

export async function executeSajuFlow(
  page: Page,
  tc: TestCase,
  baseUrl: string
): Promise<{ responseText: string }> {
  // 1. 캐릭터 선택
  await page.goto(`${baseUrl}/saju`);
  const charName = CHAR_KO[tc.characterId] ?? tc.characterId;
  const charBtn = page.locator('button').filter({ hasText: charName });
  await charBtn.first().waitFor({ timeout: 15000 });
  await charBtn.first().click();

  // 2. 개인정보 폼 대기
  await page.locator('text=생년월일').first().waitFor({ timeout: 10000 });

  // 3. 폼 입력
  const { birthDate, gender, birthHour } = tc.inputValues;
  await page.locator("input[type='date']").fill(birthDate);
  const genderLabel = gender === 'female' ? '여성' : '남성';
  await page.getByRole('button', { name: genderLabel }).click();

  const hourSelect = page.locator('select');
  if (await hourSelect.isVisible({ timeout: 2000 }).catch(() => false)) {
    if (birthHour) {
      await hourSelect.selectOption({ label: birthHour }).catch(async () => {
        await hourSelect.selectOption({ index: 1 });
      });
    } else {
      await hourSelect.selectOption({ index: 1 });
    }
  }

  // 4. 제출
  const submitBtn = page.locator('button').filter({ hasText: /시작|다음|확인/ }).last();
  await submitBtn.waitFor({ state: 'visible', timeout: 5000 });
  await submitBtn.click();

  // 5. 시간단위 선택
  const timeRange = tc.inputValues.timeRange ?? '올해';
  await page.locator(`text=${timeRange}`).first().waitFor({ timeout: 10000 });
  await page.locator(`text=${timeRange}`).first().click();

  // 6. 분석영역(주제) 선택
  const topicKo = TOPIC_KO[tc.topic] ?? tc.topic;
  await page.locator(`text=${topicKo}`).first().waitFor({ timeout: 5000 });
  await page.locator(`text=${topicKo}`).first().click();

  // 7. 사주 분석 시작
  const startBtn = page.locator('button').filter({ hasText: /사주 분석|시작/ }).last();
  await startBtn.waitFor({ state: 'visible', timeout: 5000 });
  await startBtn.click();

  // 8. 세션 → 결과 페이지 대기
  await page.waitForURL('**/saju/session**', { timeout: 15000 });
  await page.waitForURL('**/saju/result/**', { timeout: 120000 });

  // 9. 응답 텍스트 추출
  const textLocator = page.locator('[data-testid="reading-content"]').first();
  await textLocator.waitFor({ timeout: 30000 });
  const responseText = await textLocator.innerText();

  return { responseText };
}
