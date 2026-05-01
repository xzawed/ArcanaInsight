# 가상 실사용자 멀티 에이전트 E2E 전수 검증 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 타로·사주·신점 전체 ~252 조합을 6개 병렬 워커가 실제 AI를 호출하며 플로우 완주·UI 구조·콘텐츠 품질을 검증하는 멀티 에이전트 E2E 시스템을 구축한다.

**Architecture:** Node.js 워커 스크립트 × 6이 각자 독립 Playwright Chromium을 구동하고 Claude Haiku API로 AI 응답 품질을 검증한다. orchestrator.ts가 테스트 큐를 관리하고 결과를 Markdown 리포트로 집계한다. CI는 기존 Playwright runner에 smart-ci.spec.ts 12개를 추가한다.

**Tech Stack:** TypeScript, Playwright (Node API), @anthropic-ai/sdk (Haiku), tsx, pnpm

---

## 파일 변경 목록

```
scripts/e2e-full/
├── types.ts                    # TestCase·ValidationResult·TestResult 타입
├── orchestrator.ts             # 큐 생성·청크 분할·워커 실행·결과 집계
├── worker.ts                   # 단일 워커: 브라우저 제어 + 검증
├── reporter.ts                 # JSON → Markdown 변환
├── matrix/
│   ├── characters.ts           # 12 캐릭터 ID 목록
│   ├── tarot.ts               # 84 타로 조합
│   ├── saju.ts                # 96 사주 조합
│   ├── shinjeom.ts            # 72 신점 조합
│   └── ci-subset.ts           # CI 12개 AI 플로우 케이스
├── flows/
│   ├── tarot-flow.ts          # 타로 Playwright 인터랙션
│   ├── saju-flow.ts           # 사주 Playwright 인터랙션
│   └── shinjeom-flow.ts       # 신점 Playwright 인터랙션
└── validators/
    ├── structure-validator.ts  # JSON 미노출·URL·텍스트 길이
    └── content-validator.ts    # Claude Haiku 콘텐츠 품질 판정

e2e/smart-ci.spec.ts            # CI 12개 Playwright spec (실제 AI 호출)
.gitignore                      # docs/e2e-reports/ 추가
package.json                    # test:e2e:full 스크립트 추가
```

---

## Task 1: 타입 정의 (scripts/e2e-full/types.ts)

**Files:** `scripts/e2e-full/types.ts` (신규)

- [ ] `scripts/e2e-full/` 디렉토리 생성
- [ ] `types.ts` 파일 작성:

```typescript
export type ServiceType = 'tarot' | 'saju' | 'shinjeom';

export interface InputValues {
  name?: string;
  birthDate: string;
  gender: 'male' | 'female';
  birthHour?: string;
  timeRange?: string;
  message?: string;
}

export interface TestCase {
  id: string;
  service: ServiceType;
  characterId: string;
  topic: string;
  spreadType?: string;
  inputValues: InputValues;
}

export interface ValidationResult {
  passed: boolean;
  score: number;
  checks: Record<string, boolean>;
  reason: string;
}

export interface TestResult {
  testCase: TestCase;
  flowPassed: boolean;
  responseText: string;
  structureValidation: ValidationResult;
  contentValidation: ValidationResult;
  passed: boolean;
  warning: boolean;
  durationMs: number;
  error?: string;
}

export interface WorkerReport {
  workerId: number;
  results: TestResult[];
  startedAt: string;
  completedAt: string;
}
```

- [ ] 검증:

```bash
cd "f:/DEVELOPMENT/SOURCE/CLAUDE/ArcanaInsight"
pnpm exec tsx --eval "import './scripts/e2e-full/types.ts'; console.log('OK')" 2>&1
```

Expected output: `OK`

---

## Task 2: 캐릭터 목록 + 타로 매트릭스

**Files:** `scripts/e2e-full/matrix/characters.ts` (신규), `scripts/e2e-full/matrix/tarot.ts` (신규)

- [ ] `scripts/e2e-full/matrix/` 디렉토리 생성
- [ ] `characters.ts` 작성:

```typescript
export const characters = [
  'arcana','miko','seonhwa','hoshi','luna','rei',
  'cairn','zero','haru','ren','lix','ethan',
] as const;
export type CharacterId = typeof characters[number];
```

- [ ] `tarot.ts` (84 조합) 작성:

```typescript
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
```

- [ ] 검증:

```bash
cd "f:/DEVELOPMENT/SOURCE/CLAUDE/ArcanaInsight"
pnpm exec tsx --eval "
import { getTarotMatrix } from './scripts/e2e-full/matrix/tarot';
const m = getTarotMatrix();
console.log('count:', m.length);
" 2>&1
```

Expected output: `count: 84`

---

## Task 3: 사주·신점 매트릭스 + CI 서브셋

**Files:** `scripts/e2e-full/matrix/saju.ts` (신규), `scripts/e2e-full/matrix/shinjeom.ts` (신규), `scripts/e2e-full/matrix/ci-subset.ts` (신규)

- [ ] `saju.ts` (96 조합) 작성:

```typescript
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
```

- [ ] `shinjeom.ts` (72 조합) 작성:

```typescript
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
```

- [ ] `ci-subset.ts` (CI 12개) 작성:

```typescript
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
```

- [ ] 검증:

```bash
cd "f:/DEVELOPMENT/SOURCE/CLAUDE/ArcanaInsight"
pnpm exec tsx --eval "
import { getTarotMatrix } from './scripts/e2e-full/matrix/tarot';
import { getSajuMatrix } from './scripts/e2e-full/matrix/saju';
import { getShinjeomMatrix } from './scripts/e2e-full/matrix/shinjeom';
import { getCiSubset } from './scripts/e2e-full/matrix/ci-subset';
console.log('tarot:', getTarotMatrix().length, 'saju:', getSajuMatrix().length, 'shinjeom:', getShinjeomMatrix().length, 'ci:', getCiSubset().length);
" 2>&1
```

Expected output: `tarot: 84 saju: 96 shinjeom: 72 ci: 12`

---

## Task 4: structure-validator.ts

**Files:** `scripts/e2e-full/validators/structure-validator.ts` (신규)

- [ ] `scripts/e2e-full/validators/` 디렉토리 생성
- [ ] `structure-validator.ts` 작성:

```typescript
import type { Page } from 'playwright';
import type { ValidationResult } from '../types';

const JSON_ARTIFACT_RE = /(?:\{"[^"]+"|"[a-zA-Z_]+"\s*:(?!\s*"[가-힣])|"\}\s*,)/;
const ERROR_KEYWORDS = ['오류가 발생', '에러가 발생', 'undefined', 'Cannot read', 'Error:'];

export async function runStructureValidation(
  page: Page,
  serviceType: string
): Promise<ValidationResult> {
  const checks: Record<string, boolean> = {};
  const url = page.url();
  const bodyText = await page.locator('body').innerText().catch(() => '');

  checks.result_page_reached = /\/(tarot|saju|shinjeom)\/result\//.test(url);
  checks.no_json_artifacts = !JSON_ARTIFACT_RE.test(bodyText);
  checks.minimum_length = bodyText.length >= 200;
  checks.no_error_text = !ERROR_KEYWORDS.some(k => bodyText.includes(k));

  const passCount = Object.values(checks).filter(Boolean).length;
  const total = Object.keys(checks).length;

  return {
    passed: passCount >= total - 1,
    score: Math.round((passCount / total) * 100),
    checks,
    reason: passCount === total
      ? '모든 구조 체크 통과'
      : Object.entries(checks).filter(([, v]) => !v).map(([k]) => k).join(', ') + ' 실패',
  };
}
```

- [ ] 타입 체크:

```bash
cd "f:/DEVELOPMENT/SOURCE/CLAUDE/ArcanaInsight"
pnpm type-check 2>&1 | head -20
```

Expected: 신규 파일 관련 오류 없음

---

## Task 5: content-validator.ts

**Files:** `scripts/e2e-full/validators/content-validator.ts` (신규)

- [ ] `content-validator.ts` 작성:

```typescript
import Anthropic from '@anthropic-ai/sdk';
import type { TestCase, ValidationResult } from '../types';

const client = new Anthropic();

const TOPIC_KEYWORDS: Record<string, string[]> = {
  love: ['연애', '사랑', '감정', '관계'],
  'love-single': ['연애', '인연', '만남', '사랑'],
  'love-couple': ['관계', '연인', '사랑', '커플'],
  finance: ['재물', '금전', '돈', '재정'],
  career: ['직장', '일', '커리어', '업무'],
  health: ['건강', '몸', '체력', '컨디션'],
  general: ['운세', '전반', '흐름', '기운'],
  'saju-general': ['사주', '운세', '오행'],
  'saju-love-single': ['연애', '인연', '사주'],
  'saju-love-couple': ['관계', '사주', '궁합'],
  'saju-career': ['직장', '사주', '커리어'],
  'saju-health': ['건강', '사주', '몸'],
  'saju-personality': ['성격', '기질', '사주'],
  'saju-compatibility': ['궁합', '사주', '관계'],
  'saju-auspicious-date': ['길일', '날', '택일'],
  'shinjeom-general': ['운세', '신수', '기운'],
  'shinjeom-love': ['연애', '사랑', '인연'],
  'shinjeom-wealth': ['재물', '돈', '재정'],
  'shinjeom-career': ['직장', '일', '커리어'],
  'shinjeom-health': ['건강', '몸', '기운'],
  'shinjeom-auspicious': ['길일', '날', '택일'],
};

function buildChecklist(tc: TestCase): string {
  const kw = TOPIC_KEYWORDS[tc.topic] ?? [];
  if (tc.service === 'tarot') return `
- card_name_mentioned: 카드 한국어 이름(달/태양/연인/별 등) 언급 여부
- position_label_present: 스프레드 위치(과거/현재/미래 또는 1번/2번 위치) 언급 여부
- topic_keyword_match: [${kw.join(', ')}] 중 1개 이상 포함
- no_cross_service: 천간/지지/오행/사주 미포함 (true=정상)`;
  if (tc.service === 'saju') return `
- saju_terminology: 사주/오행/천간/지지/운세 중 1개 이상 포함
- topic_alignment: [${kw.join(', ')}] 중 1개 이상 포함
- time_period_mentioned: 올해/이번달/이번주 중 1개 이상 언급
- no_cross_service: 카드/타로/스프레드 미포함 (true=정상)`;
  return `
- question_responded: [${kw.join(', ')}] 중 1개 이상 포함
- shinjeom_vocabulary: 신점/운/기운/점 중 1개 이상 포함
- multiturn_consistency: 방향성 또는 조언 문장 포함
- definitive_guidance: 구체적 결론 또는 조언 포함`;
}

export async function runContentValidation(
  responseText: string,
  testCase: TestCase,
  selectedCards: string[] = []
): Promise<ValidationResult> {
  const prompt = `당신은 운세 서비스 QA 검증 에이전트입니다.
서비스: ${testCase.service} | 캐릭터: ${testCase.characterId} | 주제: ${testCase.topic}
선택 카드(타로): ${selectedCards.join(', ') || '없음'}

평가 항목 (각 항목을 true/false로 판정):
${buildChecklist(testCase)}

응답 텍스트 (최대 2000자):
${responseText.slice(0, 2000)}

반드시 다음 JSON 형식으로만 응답하세요 (다른 텍스트 없이):
{"passed":true,"score":95,"checks":{"체크키":true},"reason":"한 줄 설명"}`;

  const msg = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 400,
    messages: [{ role: 'user', content: prompt }],
  });

  const raw = msg.content[0].type === 'text' ? msg.content[0].text.trim() : '{}';
  try {
    const result = JSON.parse(raw) as ValidationResult;
    const passCount = Object.values(result.checks).filter(Boolean).length;
    const total = Object.keys(result.checks).length;
    result.passed = total > 0 && passCount >= total - 1;
    result.score = total > 0 ? Math.round((passCount / total) * 100) : 0;
    return result;
  } catch {
    return { passed: false, score: 0, checks: {}, reason: `JSON 파싱 실패: ${raw.slice(0, 80)}` };
  }
}
```

- [ ] 타입 체크:

```bash
cd "f:/DEVELOPMENT/SOURCE/CLAUDE/ArcanaInsight"
pnpm type-check 2>&1 | head -20
```

Expected: 오류 없음

---

## Task 6: tarot-flow.ts

**Files:** `scripts/e2e-full/flows/tarot-flow.ts` (신규)

기존 `e2e/tarot-flow.spec.ts` 셀렉터 패턴 참고:
- 캐릭터 선택: `page.locator("button").filter({ hasText: /아르카나|미코|선화/ })`
- 스프레드 선택: `page.locator("button").filter({ hasText: "원카드" })`
- 세션 이동: `page.waitForURL("**/tarot/session**")`

- [ ] `scripts/e2e-full/flows/` 디렉토리 생성
- [ ] `tarot-flow.ts` 작성:

```typescript
import type { Page } from 'playwright';
import type { TestCase } from '../types';

const CARD_COUNTS: Record<string, number> = {
  'one-card': 1, 'three-card': 3, 'five-card': 5,
  'relationship': 7, 'horseshoe': 7, 'decision': 5,
  'week-ahead': 7, 'celtic-cross': 10, 'zodiac': 12, 'tree-of-life': 10,
};

// 캐릭터 ID → 한국어 이름 매핑 (기존 spec 셀렉터 패턴 기반)
const CHAR_KO: Record<string, string> = {
  arcana: '아르카나', miko: '미코', seonhwa: '선화', hoshi: '호시',
  luna: '루나', rei: '레이', cairn: '카이른', zero: '제로',
  haru: '하루', ren: '렌', lix: '릭스', ethan: '에단',
};

// 토픽 → 한국어 레이블 매핑 (기존 spec의 "종합", "연애" 등)
const TOPIC_KO: Record<string, string> = {
  love: '연애',
  'love-single': '솔로',
  'love-couple': '커플',
  finance: '재물',
  career: '직장',
  health: '건강',
  general: '종합',
};

// 스프레드 → 한국어 레이블 매핑 (기존 spec의 "원카드" 등)
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
  // 1. 캐릭터 선택 (기존 spec 패턴: text 필터 버튼)
  await page.goto(`${baseUrl}/tarot`);
  const charName = CHAR_KO[tc.characterId] ?? tc.characterId;
  const charBtn = page.locator('button').filter({ hasText: charName });
  await charBtn.first().waitFor({ timeout: 15000 });
  await charBtn.first().click();

  // 2. 주제 선택 (기존 spec 패턴: text=종합 등)
  const topicKo = TOPIC_KO[tc.topic] ?? tc.topic;
  await page.locator(`text=${topicKo}`).first().waitFor({ timeout: 10000 });
  await page.locator(`text=${topicKo}`).first().click();

  // 3. 스프레드 선택 (기존 spec 패턴: evaluate click으로 헤더 가로채기 우회)
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

  // 7. 결과 페이지 대기 (celtic-cross 등 대형 스프레드는 90~120초 허용)
  await page.waitForURL('**/tarot/result/**', { timeout: 120000 });

  // 8. 응답 텍스트 추출
  const textLocator = page.locator('[data-testid="reading-content"]').first();
  await textLocator.waitFor({ timeout: 30000 });
  const responseText = await textLocator.innerText();

  return { responseText, selectedCards };
}
```

- [ ] 타입 체크:

```bash
cd "f:/DEVELOPMENT/SOURCE/CLAUDE/ArcanaInsight"
pnpm type-check 2>&1 | head -20
```

Expected: 오류 없음

---

## Task 7: saju-flow.ts + shinjeom-flow.ts

**Files:** `scripts/e2e-full/flows/saju-flow.ts` (신규), `scripts/e2e-full/flows/shinjeom-flow.ts` (신규)

기존 spec 패턴 참고:
- 사주: `page.locator("input[type='date']")`, `page.getByRole("button", { name: "여성" })`, `page.locator("select")`
- 신점: `page.locator("text=신수").first().click()`, `page.locator("input[type='text']")`

- [ ] `saju-flow.ts` 작성:

```typescript
import type { Page } from 'playwright';
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
  // 1. 캐릭터 선택 (기존 spec: button.filter hasText)
  await page.goto(`${baseUrl}/saju`);
  const charName = CHAR_KO[tc.characterId] ?? tc.characterId;
  const charBtn = page.locator('button').filter({ hasText: charName });
  await charBtn.first().waitFor({ timeout: 15000 });
  await charBtn.first().click();

  // 2. 개인정보 폼 대기 (기존 spec: text=생년월일)
  await page.locator('text=생년월일').first().waitFor({ timeout: 10000 });

  // 3. 폼 입력 (기존 spec: input[type='date'], button 여성/남성, select)
  const { birthDate, gender, birthHour } = tc.inputValues;
  await page.locator("input[type='date']").fill(birthDate);
  const genderLabel = gender === 'female' ? '여성' : '남성';
  await page.getByRole('button', { name: genderLabel }).click();

  const hourSelect = page.locator('select');
  if (await hourSelect.isVisible({ timeout: 2000 }).catch(() => false)) {
    if (birthHour) {
      await hourSelect.selectOption({ label: birthHour }).catch(async () => {
        // label 매칭 실패 시 index 1로 fallback
        await hourSelect.selectOption({ index: 1 });
      });
    } else {
      await hourSelect.selectOption({ index: 1 });
    }
  }

  // 4. 제출 (기존 spec: button filter 시작|다음|확인)
  const submitBtn = page.locator('button').filter({ hasText: /시작|다음|확인/ }).last();
  await submitBtn.waitFor({ state: 'visible', timeout: 5000 });
  await submitBtn.click();

  // 5. 시간단위 선택 (기존 spec: text=올해 / text=이번 주)
  const timeRange = tc.inputValues.timeRange ?? '올해';
  await page.locator(`text=${timeRange}`).first().waitFor({ timeout: 10000 });
  await page.locator(`text=${timeRange}`).first().click();

  // 6. 분석영역(주제) 선택
  const topicKo = TOPIC_KO[tc.topic] ?? tc.topic;
  await page.locator(`text=${topicKo}`).first().waitFor({ timeout: 5000 });
  await page.locator(`text=${topicKo}`).first().click();

  // 7. 사주 분석 시작 버튼 (기존 spec: button filter 사주 분석|시작)
  const startBtn = page.locator('button').filter({ hasText: /사주 분석|시작/ }).last();
  await startBtn.waitFor({ state: 'visible', timeout: 5000 });
  await startBtn.click();

  // 8. 세션 페이지 → 결과 페이지 대기
  await page.waitForURL('**/saju/session**', { timeout: 15000 });
  await page.waitForURL('**/saju/result/**', { timeout: 120000 });

  // 9. 응답 텍스트 추출
  const textLocator = page.locator('[data-testid="reading-content"]').first();
  await textLocator.waitFor({ timeout: 30000 });
  const responseText = await textLocator.innerText();

  return { responseText };
}
```

- [ ] `shinjeom-flow.ts` 작성:

```typescript
import type { Page } from 'playwright';
import type { TestCase } from '../types';

const CHAR_KO: Record<string, string> = {
  arcana: '아르카나', miko: '미코', seonhwa: '선화', hoshi: '호시',
  luna: '루나', rei: '레이', cairn: '카이른', zero: '제로',
  haru: '하루', ren: '렌', lix: '릭스', ethan: '에단',
};

// 신점 주제 → 한국어 (기존 spec: text=신수, text=연애, text=재물 등)
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
  // 1. 캐릭터 선택 (기존 spec: button.filter hasText)
  await page.goto(`${baseUrl}/shinjeom`);
  await page.waitForLoadState('networkidle');
  const charName = CHAR_KO[tc.characterId] ?? tc.characterId;
  const charBtn = page.locator('button').filter({ hasText: charName });
  await charBtn.first().waitFor({ timeout: 15000 });
  await charBtn.first().click();

  // 2. 주제 선택 (기존 spec: text=신수 등)
  const topicKo = TOPIC_KO[tc.topic] ?? tc.topic;
  await page.locator(`text=${topicKo}`).first().waitFor({ timeout: 10000 });
  await page.locator(`text=${topicKo}`).first().click();

  // 3. 세션 페이지 대기
  await page.waitForURL('**/shinjeom/session**', { timeout: 15000 });

  // 4. 인사말 대기 후 첫 번째 메시지 전송 (기존 spec: input[type='text'], button 전송)
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

  // 6. 신점 결과 버튼 클릭 (기존 spec: text=신점 결과 받기)
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
```

- [ ] 타입 체크:

```bash
cd "f:/DEVELOPMENT/SOURCE/CLAUDE/ArcanaInsight"
pnpm type-check 2>&1 | head -20
```

Expected: 오류 없음

---

## Task 8: worker.ts

**Files:** `scripts/e2e-full/worker.ts` (신규)

- [ ] `worker.ts` 작성:

```typescript
#!/usr/bin/env tsx
import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import type { TestCase, TestResult, WorkerReport } from './types';
import { executeTarotFlow } from './flows/tarot-flow';
import { executeSajuFlow } from './flows/saju-flow';
import { executeShinjeomFlow } from './flows/shinjeom-flow';
import { runStructureValidation } from './validators/structure-validator';
import { runContentValidation } from './validators/content-validator';

const WORKER_ID = parseInt(process.env.WORKER_ID ?? '0', 10);
const CASES_FILE = process.env.CASES_FILE ?? '';
const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';
const RESULTS_DIR = path.resolve('scripts/e2e-full/results');

async function runTestCase(page: import('playwright').Page, tc: TestCase): Promise<TestResult> {
  const start = Date.now();
  try {
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

    const structureValidation = await runStructureValidation(page, tc.service);
    const contentValidation = await runContentValidation(responseText, tc, selectedCards);

    const structPass = structureValidation.passed;
    const contentPass = contentValidation.passed;
    const passed = structPass && contentPass;
    const warning = !passed && (structureValidation.score >= 75 && contentValidation.score >= 75);

    return {
      testCase: tc,
      flowPassed: true,
      responseText: responseText.slice(0, 500),
      structureValidation,
      contentValidation,
      passed,
      warning,
      durationMs: Date.now() - start,
    };
  } catch (err) {
    return {
      testCase: tc,
      flowPassed: false,
      responseText: '',
      structureValidation: { passed: false, score: 0, checks: {}, reason: '플로우 실패' },
      contentValidation: { passed: false, score: 0, checks: {}, reason: '플로우 실패' },
      passed: false,
      warning: false,
      durationMs: Date.now() - start,
      error: String(err),
    };
  }
}

async function main() {
  if (!CASES_FILE) throw new Error('CASES_FILE 환경변수 필요');
  const cases: TestCase[] = JSON.parse(fs.readFileSync(CASES_FILE, 'utf-8'));

  fs.mkdirSync(RESULTS_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const results: TestResult[] = [];
  const startedAt = new Date().toISOString();

  for (const tc of cases) {
    const context = await browser.newContext();
    const page = await context.newPage();
    console.log(`[Worker ${WORKER_ID}] 실행: ${tc.id}`);
    const result = await runTestCase(page, tc);
    results.push(result);
    console.log(`[Worker ${WORKER_ID}] ${result.passed ? '✅' : result.warning ? '⚠️' : '❌'} ${tc.id}`);
    await context.close();
  }

  await browser.close();

  const report: WorkerReport = {
    workerId: WORKER_ID,
    results,
    startedAt,
    completedAt: new Date().toISOString(),
  };

  fs.writeFileSync(
    path.join(RESULTS_DIR, `worker-${WORKER_ID}.json`),
    JSON.stringify(report, null, 2)
  );
  console.log(`[Worker ${WORKER_ID}] 완료: ${results.length}개 처리`);
}

main().catch(e => { console.error(e); process.exit(1); });
```

- [ ] 타입 체크:

```bash
cd "f:/DEVELOPMENT/SOURCE/CLAUDE/ArcanaInsight"
pnpm type-check 2>&1 | head -20
```

Expected: 오류 없음

---

## Task 9: reporter.ts

**Files:** `scripts/e2e-full/reporter.ts` (신규)

- [ ] `reporter.ts` 작성:

```typescript
import * as fs from 'fs';
import * as path from 'path';
import type { WorkerReport, TestResult } from './types';

function formatMs(ms: number): string {
  if (ms < 60000) return `${Math.round(ms / 1000)}초`;
  return `${Math.floor(ms / 60000)}분 ${Math.round((ms % 60000) / 1000)}초`;
}

export function generateReport(reports: WorkerReport[]): string {
  const all: TestResult[] = reports.flatMap(r => r.results);
  const passed = all.filter(r => r.passed).length;
  const warning = all.filter(r => r.warning).length;
  const failed = all.filter(r => !r.passed && !r.warning).length;
  const totalMs = all.reduce((sum, r) => sum + r.durationMs, 0);
  const date = new Date().toISOString().split('T')[0];

  const failRows = all
    .filter(r => !r.passed)
    .map(r => `| ${r.testCase.service} | ${r.testCase.characterId} | ${r.testCase.topic} | ${r.warning ? '⚠️' : '❌'} | ${r.contentValidation.reason} |`)
    .join('\n');

  const charStats = [...new Set(all.map(r => r.testCase.characterId))].map(charId => {
    const charResults = all.filter(r => r.testCase.characterId === charId);
    const services = ['tarot', 'saju', 'shinjeom'] as const;
    const cols = services.map(svc => {
      const svcResults = charResults.filter(r => r.testCase.service === svc);
      const svcPass = svcResults.filter(r => r.passed).length;
      return svcResults.length > 0 ? `${svcPass}/${svcResults.length}` : '-';
    });
    const total = charResults.filter(r => r.passed).length;
    return `| ${charId} | ${cols.join(' | ')} | ${total}/${charResults.length} |`;
  }).join('\n');

  return `# Full Run Report — ${date}

## 요약
- **전체**: ${all.length} / **통과**: ${passed} / **경고**: ${warning} / **실패**: ${failed}
- **통과율**: ${Math.round((passed / all.length) * 100)}%
- **총 소요 시간**: ${formatMs(totalMs)} (병렬 실행)

## 실패·경고 목록
| 서비스 | 캐릭터 | 주제 | 판정 | 이유 |
|--------|--------|------|------|------|
${failRows || '| — | — | — | — | 없음 |'}

## 캐릭터별 통과율
| 캐릭터 | 타로 | 사주 | 신점 | 합계 |
|--------|------|------|------|------|
${charStats}
`;
}

export function saveReport(content: string): string {
  const date = new Date().toISOString().split('T')[0];
  const dir = path.resolve('docs/e2e-reports');
  fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, `${date}-full-run.md`);
  fs.writeFileSync(filePath, content);
  return filePath;
}
```

- [ ] 타입 체크:

```bash
cd "f:/DEVELOPMENT/SOURCE/CLAUDE/ArcanaInsight"
pnpm type-check 2>&1 | head -20
```

Expected: 오류 없음

---

## Task 10: orchestrator.ts

**Files:** `scripts/e2e-full/orchestrator.ts` (신규)

- [ ] `orchestrator.ts` 작성:

```typescript
#!/usr/bin/env tsx
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { getFullMatrix, getCiSubset } from './matrix/ci-subset';
import { generateReport, saveReport } from './reporter';
import type { TestCase, WorkerReport } from './types';

const MODE = process.argv.includes('--mode=ci') ? 'ci' : 'full';
const WORKER_COUNT = parseInt(process.argv.find(a => a.startsWith('--workers='))?.split('=')[1] ?? '6', 10);
const SERVICE_FILTER = process.argv.find(a => a.startsWith('--service='))?.split('=')[1];
const CHAR_FILTER = process.argv.find(a => a.startsWith('--character='))?.split('=')[1];
const CASES_DIR = path.resolve('scripts/e2e-full/cases');
const RESULTS_DIR = path.resolve('scripts/e2e-full/results');

function chunkArray<T>(arr: T[], n: number): T[][] {
  return Array.from({ length: n }, (_, i) =>
    arr.filter((_, idx) => idx % n === i)
  ).filter(c => c.length > 0);
}

async function runWorker(workerId: number, casesFile: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const worker = spawn('pnpm', ['exec', 'tsx', 'scripts/e2e-full/worker.ts'], {
      env: { ...process.env, WORKER_ID: String(workerId), CASES_FILE: casesFile },
      stdio: 'inherit',
    });
    worker.on('close', code => code === 0 ? resolve() : reject(new Error(`Worker ${workerId} 종료 코드: ${code}`)));
  });
}

async function main() {
  fs.mkdirSync(CASES_DIR, { recursive: true });
  fs.rmSync(RESULTS_DIR, { recursive: true, force: true });
  fs.mkdirSync(RESULTS_DIR, { recursive: true });

  let cases: TestCase[] = MODE === 'ci' ? getCiSubset() : getFullMatrix();
  if (SERVICE_FILTER) cases = cases.filter(tc => tc.service === SERVICE_FILTER);
  if (CHAR_FILTER) cases = cases.filter(tc => tc.characterId === CHAR_FILTER);

  console.log(`모드: ${MODE} | 총 케이스: ${cases.length} | 워커: ${Math.min(WORKER_COUNT, cases.length)}`);

  const chunks = chunkArray(cases, Math.min(WORKER_COUNT, cases.length));
  const caseFiles = chunks.map((chunk, i) => {
    const file = path.join(CASES_DIR, `chunk-${i}.json`);
    fs.writeFileSync(file, JSON.stringify(chunk, null, 2));
    return file;
  });

  await Promise.all(caseFiles.map((file, i) => runWorker(i, file)));

  const reports: WorkerReport[] = fs
    .readdirSync(RESULTS_DIR)
    .filter(f => f.endsWith('.json'))
    .map(f => JSON.parse(fs.readFileSync(path.join(RESULTS_DIR, f), 'utf-8')) as WorkerReport);

  const reportContent = generateReport(reports);
  const reportPath = saveReport(reportContent);
  console.log(`\n리포트 저장: ${reportPath}`);
  console.log(reportContent.split('\n').slice(0, 8).join('\n'));
}

main().catch(e => { console.error(e); process.exit(1); });
```

- [ ] 시범 실행 (로컬 서버 필요):

```bash
cd "f:/DEVELOPMENT/SOURCE/CLAUDE/ArcanaInsight"
# 개발 서버 실행 후
pnpm exec tsx scripts/e2e-full/orchestrator.ts --mode=ci --workers=1 2>&1 | head -30
```

Expected: `모드: ci | 총 케이스: 12 | 워커: 1` 출력 후 Worker 0 실행 로그

---

## Task 11: e2e/smart-ci.spec.ts

**Files:** `e2e/smart-ci.spec.ts` (신규)

기존 Playwright runner 사용 (playwright.config.ts 그대로). SSE mock 없이 실제 AI 호출.

playwright.config.ts 현황:
- testDir: `./e2e`
- timeout: `30_000` (개별 케이스는 실제 AI 호출로 최대 120초 → `test.setTimeout` 재정의 필요)
- projects: Desktop Chrome, Mobile Android (Pixel 7), Mobile iOS (iPhone 14)

- [ ] `e2e/smart-ci.spec.ts` 작성:

```typescript
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

    const structure = await runStructureValidation(page, tc.service);
    const content = await runContentValidation(responseText, tc, selectedCards);

    expect(structure.passed, `구조 검증 실패: ${structure.reason}`).toBe(true);
    expect(content.passed || content.warning, `콘텐츠 검증 실패 (score: ${content.score}): ${content.reason}`).toBe(true);
  });
}
```

- [ ] 검증 (1개 케이스만):

```bash
cd "f:/DEVELOPMENT/SOURCE/CLAUDE/ArcanaInsight"
pnpm test:e2e -- --grep "arcana" e2e/smart-ci.spec.ts 2>&1 | tail -20
```

Expected: 1개 테스트 통과

---

## Task 12: package.json + .gitignore 업데이트

**Files:** `package.json` (수정), `.gitignore` (수정)

- [ ] `package.json`의 `scripts` 섹션에 추가:

```json
"test:e2e:full": "tsx scripts/e2e-full/orchestrator.ts --mode=full --workers=6",
"test:e2e:full:ci": "tsx scripts/e2e-full/orchestrator.ts --mode=ci",
```

- [ ] `.gitignore`에 추가 (파일 맨 아래):

```
# E2E Full Run 결과 (대용량, 로컬 전용)
docs/e2e-reports/
scripts/e2e-full/results/
scripts/e2e-full/cases/
```

- [ ] 기존 테스트 회귀 없음 확인:

```bash
cd "f:/DEVELOPMENT/SOURCE/CLAUDE/ArcanaInsight"
pnpm test:e2e -- --grep "타로 서비스 플로우" 2>&1 | tail -10
```

Expected: 기존 테스트 모두 통과

---

## 최종 검증 (전체 완료 조건)

- [ ] **타입 체크 0건**: `pnpm type-check` → 오류 없음
- [ ] **린트 0건**: `pnpm lint` → 오류 없음
- [ ] **매트릭스 수 확인**:

```bash
cd "f:/DEVELOPMENT/SOURCE/CLAUDE/ArcanaInsight"
pnpm exec tsx --eval "
import { getTarotMatrix } from './scripts/e2e-full/matrix/tarot';
import { getSajuMatrix } from './scripts/e2e-full/matrix/saju';
import { getShinjeomMatrix } from './scripts/e2e-full/matrix/shinjeom';
import { getCiSubset } from './scripts/e2e-full/matrix/ci-subset';
const t = getTarotMatrix().length, s = getSajuMatrix().length, sh = getShinjeomMatrix().length, ci = getCiSubset().length;
console.log(\`타로: \${t}, 사주: \${s}, 신점: \${sh}, 합계: \${t+s+sh}, CI: \${ci}\`);
" 2>&1
```

Expected: `타로: 84, 사주: 96, 신점: 72, 합계: 252, CI: 12`

- [ ] **CI 모드 2 워커 실행** (로컬 서버 필요):

```bash
cd "f:/DEVELOPMENT/SOURCE/CLAUDE/ArcanaInsight"
pnpm exec tsx scripts/e2e-full/orchestrator.ts --mode=ci --workers=2 2>&1
```

Expected: 12개 완주, `docs/e2e-reports/{날짜}-full-run.md` 생성

- [ ] **gitignore 확인**:

```bash
cd "f:/DEVELOPMENT/SOURCE/CLAUDE/ArcanaInsight"
git status docs/e2e-reports/ 2>&1
```

Expected: `docs/e2e-reports/` 미추적 (gitignore 적용됨)

- [ ] **커밋**:

```bash
cd "f:/DEVELOPMENT/SOURCE/CLAUDE/ArcanaInsight"
git add scripts/e2e-full/ e2e/smart-ci.spec.ts package.json .gitignore
git commit -m "feat: 멀티 에이전트 E2E 전수 검증 시스템 구축 (252 조합, 6 워커)"
```

---

## 주의사항

- **실제 AI 호출**: `GROK_API_KEY` + `ANTHROPIC_API_KEY` 환경변수 필요
- **로컬 서버 필수**: Full run 전 `pnpm dev` 또는 `pnpm build && pnpm start` 선행
- **SSE 타임아웃**: celtic-cross(10장) 등 대형 스프레드는 90~120초 허용 — worker.ts 타임아웃 설계에 반영됨
- **신점 다중 턴**: 3턴 대화 후 결과 버튼 — `waitForTimeout(8000)` 은 네트워크 상태에 따라 조정 필요
- **셀렉터 불일치 시**: 기존 `e2e/tarot-flow.spec.ts`, `saju-flow.spec.ts`, `shinjeom-flow.spec.ts` 패턴 우선 참고
- **비용 주의**: Full run 1회 = 252 서비스 호출 + 252 Haiku 검증 호출 — 사전 비용 추정 권장
- **결과 파일**: `docs/e2e-reports/` `.gitignore` 적용 — 대용량 커밋 방지
