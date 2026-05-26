import { vi } from "vitest";

const MOCK_JSON_RESPONSE = JSON.stringify({
  cardInterpretations: [
    {
      cardId: "major-00",
      position: 0,
      symbolism: "테스트 상징 해석",
      situation: "테스트 현재 상황 해석",
      isReversed: false,
    },
  ],
  overallReading: "테스트 전체 리딩 결과입니다.",
  advice: "테스트 조언입니다.",
  topicReading: "테스트 주제 리딩입니다.",
  sajuSections: {
    structure: "테스트 사주 구조",
    elements: "테스트 오행 분석",
    fortune: "테스트 운세",
    guidance: "테스트 가이드",
  },
  shinjeomSections: {
    spiritual: "테스트 영적 신호",
    current: "테스트 현재 상황",
    obstacles: "테스트 장애물",
    future: "테스트 미래 방향",
  },
});

export function makeMockAiProvider() {
  return {
    streamReading: vi.fn().mockImplementation(async function* () {
      yield MOCK_JSON_RESPONSE;
    }),
    generateReading: vi.fn().mockResolvedValue("테스트 AI 응답입니다."),
  };
}

export function makeMockAiModule(provider = makeMockAiProvider()) {
  return { FallbackProvider: vi.fn().mockImplementation(() => provider) };
}

/** SSE 스트림 바디를 전부 읽어 문자열로 반환 */
export async function readSSEStream(res: Response): Promise<string> {
  if (!res.body) return "";
  const reader = res.body.getReader();
  const chunks: string[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(new TextDecoder().decode(value));
  }
  return chunks.join("");
}
