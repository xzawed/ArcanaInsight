import { describe, it, expect, vi, beforeEach } from "vitest";
import { CharacterConfig } from "@/types/character";
import { ChatMessage } from "@/types/session";

// 캐릭터 데이터 모킹
vi.mock("@/data/characters", () => ({
  getCharacterById: vi.fn((id: string): CharacterConfig | undefined => {
    if (id === "luna") {
      return {
        id: "luna",
        name: "루나",
        nameJp: "ルナ",
        gender: "female",
        greeting: "안녕하세요",
        speechStyle: "~요/~네요, 다정·신비로운 톤",
        personality: "포근하고 공감 능력이 뛰어난",
        description: "달의 수호자",
        speciality: "힐링",
        voiceTone: "부드러운",
        unlocked: true,
        idleAnimation: "",
        effectTheme: {
          primary: "#60a5fa",
          secondary: "#93c5fd",
          accent: "#bfdbfe",
          particleStyle: "star",
        },
        expressions: {
          default: "",
          smile: "",
          serious: "",
          surprised: "",
          wink: "",
          mystical: "",
        },
      };
    }
    return undefined;
  }),
}));

import { ShinjeomService } from "./shinjeom-service";

/** 테스트용 ChatMessage 생성 헬퍼 */
function makeChatMessage(
  role: ChatMessage["role"],
  content: string
): ChatMessage {
  return {
    id: crypto.randomUUID(),
    role,
    content,
    timestamp: new Date(),
  };
}

describe("ShinjeomService", () => {
  let service: ShinjeomService;

  beforeEach(() => {
    service = new ShinjeomService();
  });

  // ─── startSession ──────────────────────────────────────────────────────────

  describe("startSession", () => {
    it("신점 토픽으로 세션을 생성하고 serviceType이 'shinjeom'이다", () => {
      const session = service.startSession("shinjeom-general");

      expect(session.serviceType).toBe("shinjeom");
      expect(session.topic).toBe("shinjeom-general");
      expect(session.status).toBe("in_progress");
      expect(session.userId).toBeNull();
      expect(session.spreadType).toBeNull();
      expect(session.selectedCards).toEqual([]);
      expect(session.completedAt).toBeNull();
    });

    it("다른 신점 토픽('shinjeom-love')도 정상적으로 세션을 생성한다", () => {
      const session = service.startSession("shinjeom-love");
      expect(session.topic).toBe("shinjeom-love");
      expect(session.serviceType).toBe("shinjeom");
    });
  });

  // ─── getSystemPrompt ───────────────────────────────────────────────────────

  describe("getSystemPrompt", () => {
    it("'luna' 캐릭터 ID로 프롬프트를 생성하면 비어있지 않다", () => {
      const prompt = service.getSystemPrompt("luna");
      expect(prompt.trim().length).toBeGreaterThan(0);
    });

    it("프롬프트에 대화형 상담 관련 내용이 포함된다", () => {
      const prompt = service.getSystemPrompt("luna");
      // 무속 상담, 공감, 대화 구조 중 하나 이상 포함
      const hasConversational =
        prompt.includes("공감") ||
        prompt.includes("상담") ||
        prompt.includes("대화");
      expect(hasConversational).toBe(true);
    });

    it("프롬프트에 최종 결과 JSON 형식 지시가 포함된다", () => {
      const prompt = service.getSystemPrompt("luna");
      expect(prompt).toContain("JSON");
    });

    it("프롬프트에 캐릭터 이름 '루나'가 포함된다", () => {
      const prompt = service.getSystemPrompt("luna");
      expect(prompt).toContain("루나");
    });

    it("캐릭터 ID 없이 호출해도 기본 캐릭터 프롬프트를 반환한다", () => {
      const prompt = service.getSystemPrompt();
      expect(prompt.trim().length).toBeGreaterThan(0);
    });

    it("존재하지 않는 캐릭터 ID이면 기본 캐릭터(루나)로 fallback한다", () => {
      const prompt = service.getSystemPrompt("unknown-char");
      expect(prompt).toContain("루나");
    });
  });

  // ─── buildConversationPrompt (isFinalTurn=false) ───────────────────────────

  describe("buildConversationPrompt — 중간 대화 (isFinalTurn=false)", () => {
    it("공감·질문 관련 지시가 포함된다", () => {
      const history: ChatMessage[] = [
        makeChatMessage("user", "요즘 직장에서 힘들어요"),
      ];

      const prompt = service.buildConversationPrompt(
        "shinjeom-career",
        "더 자세히 말해줄 수 있나요?",
        history,
        false
      );

      expect(prompt).toContain("공감");
      expect(prompt).toContain("질문");
    });

    it("일반 텍스트 응답(JSON 아님) 지시가 포함된다", () => {
      const prompt = service.buildConversationPrompt(
        "shinjeom-general",
        "고민이 있어요",
        [],
        false
      );

      expect(prompt).toMatch(/일반 텍스트|JSON 아님/);
    });

    it("상담 주제 레이블이 프롬프트에 포함된다", () => {
      const prompt = service.buildConversationPrompt(
        "shinjeom-love",
        "연애 고민",
        [],
        false
      );

      expect(prompt).toContain("연애/궁합");
    });
  });

  // ─── buildConversationPrompt (isFinalTurn=true) ────────────────────────────

  describe("buildConversationPrompt — 최종 결과 (isFinalTurn=true)", () => {
    it("최종 신점 결과 JSON 형식 지시가 포함된다", () => {
      const history: ChatMessage[] = [
        makeChatMessage("user", "요즘 힘들어요"),
        makeChatMessage("character", "어떤 부분이 힘드신가요?"),
        makeChatMessage("user", "직장이요"),
      ];

      const prompt = service.buildConversationPrompt(
        "shinjeom-career",
        undefined,
        history,
        true
      );

      expect(prompt).toContain("overallReading");
      expect(prompt).toContain("topicReading");
      expect(prompt).toContain("advice");
    });

    it("최종 결과 프롬프트에 '전체 대화' 또는 이전 대화 내용이 포함된다", () => {
      const history: ChatMessage[] = [
        makeChatMessage("user", "직장이 힘들어요"),
        makeChatMessage("character", "어떤 점이 힘드신가요?"),
      ];

      const prompt = service.buildConversationPrompt(
        "shinjeom-career",
        undefined,
        history,
        true
      );

      // 이전 대화 내용이 포함되어 있어야 함
      expect(prompt).toContain("직장이 힘들어요");
    });
  });

  // ─── chatHistory 포함 ─────────────────────────────────────────────────────

  describe("buildConversationPrompt — chatHistory 반영", () => {
    it("이전 대화가 프롬프트에 반영된다", () => {
      const history: ChatMessage[] = [
        makeChatMessage("user", "첫 번째 고민"),
        makeChatMessage("character", "공감합니다"),
        makeChatMessage("user", "두 번째 고민"),
      ];

      const prompt = service.buildConversationPrompt(
        "shinjeom-general",
        "세 번째 메시지",
        history,
        false
      );

      expect(prompt).toContain("첫 번째 고민");
      expect(prompt).toContain("두 번째 고민");
    });

    it("system role 메시지는 대화 내역에서 필터링된다", () => {
      const history: ChatMessage[] = [
        makeChatMessage("system", "시스템 메시지"),
        makeChatMessage("user", "유저 메시지"),
      ];

      const prompt = service.buildConversationPrompt(
        "shinjeom-general",
        "현재 메시지",
        history,
        false
      );

      expect(prompt).not.toContain("시스템 메시지");
      expect(prompt).toContain("유저 메시지");
    });
  });

  // ─── getReadingPrompt ─────────────────────────────────────────────────────

  describe("getReadingPrompt", () => {
    it("chatHistory가 비어있으면 currentMessage가 빈 문자열로 처리된다", () => {
      const context = {
        topic: "shinjeom-general",
        chatHistory: [],
        session: { spreadType: null, selectedCards: [] },
        selectedCards: [],
      };
      const prompt = service.getReadingPrompt(context as unknown as Parameters<typeof service.getReadingPrompt>[0]);
      expect(typeof prompt).toBe("string");
      expect(prompt.length).toBeGreaterThan(0);
    });
  });

  // ─── topicLabels 매핑 ─────────────────────────────────────────────────────

  describe("topicLabels 매핑 — buildConversationPrompt 프롬프트 반영", () => {
    const cases: [string, string][] = [
      ["shinjeom-general",    "신수 (종합운)"],
      ["shinjeom-love",       "연애/궁합"],
      ["shinjeom-wealth",     "재물/사업운"],
      ["shinjeom-health",     "건강/액막이"],
      ["shinjeom-career",     "직장/이직"],
      ["shinjeom-auspicious", "택일 (날짜 선택)"],
    ];

    it.each(cases)("토픽 '%s' → 프롬프트에 '%s' 포함", (topic, label) => {
      const prompt = service.buildConversationPrompt(
        topic as Parameters<typeof service.buildConversationPrompt>[0],
        "메시지",
        [],
        false
      );
      expect(prompt).toContain(label);
    });

    it("등록되지 않은 topic이면 topic 문자열 자체가 프롬프트에 포함된다", () => {
      const prompt = service.buildConversationPrompt(
        "unknown-topic" as Parameters<typeof service.buildConversationPrompt>[0],
        "메시지",
        [],
        false
      );
      expect(prompt).toContain("unknown-topic");
    });
  });

  // ─── parseResult ──────────────────────────────────────────────────────────

  describe("parseResult", () => {
    it("유효한 JSON 응답을 파싱하여 ReadingResult를 반환한다", () => {
      const validJson = JSON.stringify({
        overallReading: "전반적으로 좋은 흐름입니다",
        topicReading: "연애운이 상승하고 있어요",
        advice: "용기 있게 표현해보세요",
      });

      const result = service.parseResult(validJson);

      expect(result.overallReading).toContain("전반적으로 좋은 흐름입니다");
      expect(result.topicReading).toContain("연애운이 상승하고 있어요");
      expect(result.advice).toContain("용기 있게 표현해보세요");
    });

    it("JSON 파싱 실패 시 원본 텍스트를 overallReading으로 반환한다", () => {
      const plainText = "신점 결과입니다. 앞으로 좋은 일이 있을 것입니다.";

      const result = service.parseResult(plainText);

      expect(result.overallReading).toContain("신점 결과입니다");
      expect(result.advice).toBe("");
    });

    it("JSON 파싱 실패 시 에러를 던지지 않는다", () => {
      expect(() => service.parseResult("유효하지 않은 텍스트")).not.toThrow();
    });

    it("JSON 안에 중괄호가 있는 텍스트도 파싱을 시도한다", () => {
      const jsonWithBraces = `{"overallReading":"운세가 좋습니다","topicReading":"재물운","advice":"조언"}`;
      const result = service.parseResult(jsonWithBraces);
      expect(result.overallReading).toContain("운세가 좋습니다");
    });

    it("부분적 JSON 필드가 없어도 빈 문자열로 처리한다", () => {
      const partialJson = JSON.stringify({
        overallReading: "종합 운세",
      });

      const result = service.parseResult(partialJson);
      expect(result.overallReading).toContain("종합 운세");
    });

    it("overallReading 필드가 없는 빈 JSON이면 빈 문자열로 처리한다", () => {
      // parsed.overallReading || "" 에서 || "" 분기 (L128)
      const result = service.parseResult("{}");
      expect(typeof result.overallReading).toBe("string");
    });

    it("유효하지 않은 JSON이면 텍스트 fallback으로 반환한다 (경고 없음)", () => {
      const brokenJson = "결과는 다음과 같습니다: {invalid json here}";
      const result = service.parseResult(brokenJson);
      expect(result.overallReading).toBeTruthy();
      expect(result.advice).toBe("");
    });

    it("문자열 값 안에 한국어 중괄호 표현이 있어도 JSON을 올바르게 파싱한다", () => {
      // 버그 재현: "현재는 {도전의 시기}입니다" 처럼 {} 를 포함한 값이 있으면
      // 이전 탐욕적 정규식은 마지막 } 를 JSON 끝으로 인식해 잘못된 JSON을 추출했음
      const jsonWithBracesInValue = JSON.stringify({
        overallReading: "현재는 {도전의 시기}이지만 곧 나아집니다",
        topicReading: "재물운은 {상승세}를 탈 것입니다",
        advice: "인내심을 가지고 기다리세요",
      });
      const result = service.parseResult(jsonWithBracesInValue);
      expect(result.overallReading).toContain("도전의 시기");
      expect(result.topicReading).toContain("상승세");
      expect(result.advice).toContain("인내심을 가지고 기다리세요");
    });

    it("두 JSON 구조가 연달아 있을 때 첫 번째 JSON만 파싱한다 (탐욕적 정규식 버그 재현)", () => {
      // 이전 /\{[\s\S]*\}/ 는 첫 { 부터 마지막 } 까지 잡아 두 JSON을 합쳐 파싱 실패
      const twoJsonBlocks =
        `{"overallReading":"첫 번째 결과","advice":"조언"} ` +
        `{"overallReading":"두 번째 블록","advice":"다른 조언"}`;
      const result = service.parseResult(twoJsonBlocks);
      expect(result.overallReading).toContain("첫 번째 결과");
    });
  });
});
