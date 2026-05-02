import type { Page } from '@playwright/test';
import type { TestCase } from '../types';
import { CHAR_KO } from './constants';

const CARD_COUNTS: Record<string, number> = {
  'one-card': 1, 'three-card': 3, 'five-card': 5,
  'relationship': 7, 'horseshoe': 7, 'decision': 5,
  'week-ahead': 7, 'celtic-cross': 10, 'zodiac': 12, 'tree-of-life': 10,
};

const TOPIC_KO: Record<string, string> = {
  love: '연애',
  'love-single': '솔로',
  'love-couple': '커플',
  finance: '재물',
  career: '직장',
  health: '건강',
  general: '일반 상담',
};

const SPREAD_KO: Record<string, string> = {
  'one-card': '원카드',
  'three-card': '쓰리카드',
  'five-card': '켈틱 크로스 (5장)',
  'relationship': '관계 스프레드',
  'horseshoe': '말굽 스프레드',
  'decision': '의사결정',
  'week-ahead': '한 주 전망',
  'celtic-cross': '켈틱 크로스 (10장)',
  'zodiac': '조디악 휠',
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

  // 6. 카드 선택 (data-testid^="card-back-" — CardDeck motion.div 마다 부여)
  const count = CARD_COUNTS[tc.spreadType ?? 'three-card'] ?? 3;
  const selectedCards: string[] = [];

  for (let i = 0; i < count; i++) {
    const card = page.locator('[data-testid^="card-back-"]').first();
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

  // 7. 결과 대기 — 타로 세션은 URL 변경 없이 인라인으로 결과 표시
  const resultLocator = page.locator('[data-testid="reading-content"]');
  await resultLocator.waitFor({ timeout: 120000 });

  // 8. 응답 텍스트 추출
  const responseText = await resultLocator.innerText();

  return { responseText, selectedCards };
}
