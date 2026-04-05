import { Page } from "@playwright/test";

/** SSE 스트리밍 응답 바디 생성 */
export function createSSEBody(chunks: string[], finalData?: Record<string, unknown>): string {
  let body = "";
  for (const chunk of chunks) {
    body += `data: ${JSON.stringify({ chunk })}\n\n`;
  }
  if (finalData) {
    body += `data: ${JSON.stringify({ done: true, ...finalData })}\n\n`;
  }
  return body;
}

/** page.route로 SSE mock 설정 */
export async function mockSSERoute(page: Page, urlPattern: string, sseBody: string) {
  await page.route(urlPattern, (route) => {
    route.fulfill({
      status: 200,
      contentType: "text/event-stream",
      headers: { "Cache-Control": "no-cache", "Connection": "keep-alive" },
      body: sseBody,
    });
  });
}

/** 세션 생성 API mock (공통) */
export async function mockSessionCreate(page: Page, urlPattern: string) {
  await page.route(urlPattern, (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ session: { id: "mock-session-id" } }),
    });
  });
}

// ── 신점 Mock 데이터 ──

export const SHINJEOM_MID_RESPONSE = "그 고민이 정말 무겁게 느껴지셨겠어요.\n\n마음속에 오래 담아두셨을 것 같아 안타깝습니다.\n\n혹시 이 고민이 시작된 구체적인 계기가 있으신가요?";

export const SHINJEOM_FINAL_RESULT = {
  overallReading: "당신의 기운을 살펴보니, 현재 큰 변화의 흐름 속에 있습니다.\n\n지금까지의 고민은 새로운 시작을 위한 준비 과정이었어요.\n\n곧 좋은 기회가 찾아올 것이니 마음을 열어두세요.",
  topicReading: "신수를 보니, 올해 하반기에 큰 전환점이 옵니다.\n\n특히 대인관계에서 귀인이 나타날 조짐이 보여요.",
  advice: "매일 아침 맑은 물 한 잔을 마시며 마음을 정리하세요.\n\n부정적인 생각이 들 때는 깊게 심호흡을 3번 해보시길 권합니다.",
};

// ── 타로 Mock 데이터 ──

export const TAROT_READING_CHUNKS = [
  "The Fool 카드는 ",
  "새로운 시작과 모험을 ",
  "상징합니다.\n\n",
  "지금 당신 앞에는 ",
  "무한한 가능성이 펼쳐져 있어요.",
];

export const TAROT_READING_RESULT = {
  cardInterpretations: [
    {
      cardId: "major-0",
      interpretation: "The Fool 카드가 정방향으로 나왔습니다. 새로운 시작과 무한한 가능성을 의미해요. 두려움 없이 앞으로 나아가세요.",
    },
  ],
  overallReading: "전체적으로 긍정적인 에너지가 흐르고 있습니다. 새로운 도전을 두려워하지 마세요. 지금이 바로 시작할 때입니다.",
  advice: "용기를 가지고 한 걸음 내딛어 보세요. 결과에 집착하지 말고 과정을 즐기는 것이 중요합니다.",
};

// ── 사주 Mock 데이터 ──

export const SAJU_READING_CHUNKS = [
  "갑목일간으로 태어나신 분은 ",
  "성장과 발전의 기운이 ",
  "강한 분입니다.\n\n",
  "올해는 특히 ",
  "재물운이 상승하는 시기예요.",
];

export const SAJU_READING_RESULT = {
  overallReading: "갑목일간의 사주를 분석한 결과, 올해는 큰 성장의 해입니다. 직장에서의 인정과 함께 새로운 기회가 찾아올 것입니다.",
  advice: "겸손한 자세를 유지하면서 적극적으로 기회를 잡으세요. 특히 하반기에 중요한 결정을 내려야 할 때가 옵니다.",
};

export const SAJU_DATA = {
  pillars: {
    year: { heavenlyStem: "갑", earthlyBranch: "자" },
    month: { heavenlyStem: "병", earthlyBranch: "인" },
    day: { heavenlyStem: "갑", earthlyBranch: "오" },
    hour: { heavenlyStem: "경", earthlyBranch: "술" },
  },
  dayMaster: "갑",
  dayMasterElement: "목",
  isStrong: true,
  yongsin: { element: "화", description: "식상" },
  elements: { 목: 3, 화: 2, 토: 1, 금: 1, 수: 1 },
};

// ── JSON 잔여물 패턴 ──

export const JSON_ARTIFACTS = [
  /"overallReading"/,
  /"topicReading"/,
  /"advice"/,
  /"cardInterpretations"/,
  /"cardId"/,
  /"interpretation"/,
  /^\s*[\{\}\[\]]\s*$/m,
  /\\n\\n/,
  /\\"/,
];
