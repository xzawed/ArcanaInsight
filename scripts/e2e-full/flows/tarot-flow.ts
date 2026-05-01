import type { Page } from '@playwright/test';
import type { TestCase } from '../types';

const CARD_COUNTS: Record<string, number> = {
  'one-card': 1, 'three-card': 3, 'five-card': 5,
  'relationship': 7, 'horseshoe': 7, 'decision': 5,
  'week-ahead': 7, 'celtic-cross': 10, 'zodiac': 12, 'tree-of-life': 10,
};

const CHAR_KO: Record<string, string> = {
  arcana: '아르카나', miko: '미코', seonhwa: '선화', hoshi: '호시',
  luna: '루나', rei: '레이', cairn: '카이른', zero: '제로',
  haru: '하루', ren: '렌', lix: '릭스', ethan: '에단',
};

const TOPIC_KO: Record<string, string> = {
  love: '연애',
  'love-single': '솔로',
  'love-couple': '커플',
  finance: '재물',
  career: '직장',
  health: '건강',
  general: '종합',
};

const SPREAD_KO: Record<string, string> = {
  'one-card': '원카드',
  'three-card': '쓰리카드',
  'relationship': '관계',
  'horseshoe': '말굽',
  'decision': '결정',
  'week-ahead': '주간',
  'celtic-cross': '켈틱크로스',
  'zodiac': '조디악',
  'tree-of-life': '생명의 나무',
};

export async function executeTarotFlow(
  page: Page,
  tc: TestCase,
  baseUrl: string
): Promise<{ responseText: string; selectedCards: string[] }> {
  // 1. 캐릭터 선택
  await page.goto(`${baseUrl}/tarot`);
  const charName = CHAR_KO[tc.characterId] ?? tc.characterId;
  const charBtn = page.locator('button').filter({ hasText: charName });
  await charBtn.first().waitFor({ timeout: 15000 });
  await charBtn.first().click();

  // 2. 주제 선택
  const topicKo = TOPIC_KO[tc.topic] ?? tc.topic;
  await page.locator(`text=${topicKo}`).first().waitFor({ timeout: 10000 });
  await page.locator(`text=${topicKo}`).first().click();

  // 3. 스프레드 선택
  const spreadKo = SPREAD_KO[tc.spreadType ?? 'three-card'] ?? tc.spreadType;
  const spreadBtn = page.locator('button').filter({ hasText: spreadKo }).first();
  await spreadBtn.waitFor({ timeout: 5000 });
  await spreadBtn.evaluate((el) => (el as HTMLElement).click());

  // 4. 세션 페이지 대기
  await page.waitForURL('**/tarot/session**', { timeout: 15000 });

  // 5. 사용자 정보 입력
  const { name, birthDate, gender } = tc.inputValues;
  const dateInput = page.locator("input[type='date']");
  if (await dateInput.isVisible({ timeout: 3000 }).catch(() => false)) {
    if (name) {
      const nameInput = page.getByLabel('이름');
      if (await nameInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await nameInput.fill(name);
      }
    }
    await dateInput.fill(birthDate);
    const genderLabel = gender === 'female' ? '여성' : '남성';
    await page.getByRole('button', { name: genderLabel }).click();
  }

  // 개인정보 동의 모달
  const consentBtn = page.getByRole('button', { name: '동의하고 시작하기' });
  if (await consentBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await consentBtn.click();
  }

  // 리딩 시작 버튼
  const startBtn = page.locator('button').filter({ hasText: /시작|다음|확인/ }).last();
  if (await startBtn.isEnabled({ timeout: 3000 }).catch(() => false)) {
    await startBtn.click();
  }

  // 6. 카드 선택
  const count = CARD_COUNTS[tc.spreadType ?? 'three-card'] ?? 3;
  const selectedCards: string[] = [];

  for (let i = 0; i < count; i++) {
    const card = page.locator('[data-testid^="card-back"]').first();
    await card.waitFor({ timeout: 15000 });
    const cardName = await card.getAttribute('data-card-name') ?? `card-${i}`;
    selectedCards.push(cardName);
    await card.click();

    const confirmBtn = page.getByRole('button', { name: /이 카드로|선택/ });
    if (await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await confirmBtn.click();
    }
    await page.waitForTimeout(300);
  }

  // 7. 결과 페이지 대기
  await page.waitForURL('**/tarot/result/**', { timeout: 120000 });

  // 8. 응답 텍스트 추출
  const textLocator = page.locator('[data-testid="reading-content"]').first();
  await textLocator.waitFor({ timeout: 30000 });
  const responseText = await textLocator.innerText();

  return { responseText, selectedCards };
}
