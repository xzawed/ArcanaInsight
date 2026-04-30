import { describe, it, expect, vi, beforeEach } from "vitest";
import type { CharacterConfig } from "@/types/character";

// getCharacterById 모킹 — 실제 DB/파일 의존성 없이 테스트
vi.mock("@/data/characters", () => ({
  getCharacterById: vi.fn((id: string): CharacterConfig | undefined => {
    if (id === "arcana") {
      return {
        id: "arcana",
        name: "아르카나",
        nameJp: "アルカナ",
        gender: "female",
        greeting: "안녕하세요, 저는 아르카나예요.",
        speechStyle: "~네요/~해요체. 부드럽고 신비로운 톤.",
        personality: "신비롭고 따뜻한 마녀.",
        description: "달빛 아래에서 태어난 신비로운 마녀.",
        speciality: "감성 직관 리딩",
        voiceTone: "soft-mystical",
        unlocked: true,
        idleAnimation: "float",
        expressions: {
          default: "/img/default.png",
          smile: "/img/smile.png",
          serious: "/img/serious.png",
          surprised: "/img/surprised.png",
          wink: "/img/wink.png",
          mystical: "/img/mystical.png",
        },
        effectTheme: {
          primary: "#a78bfa",
          secondary: "#c084fc",
          accent: "#f59e0b",
          particleStyle: "sparkle",
        },
      };
    }
    return undefined;
  }),
}));

// 모킹 후에 TarotService를 import (모킹이 먼저 적용되어야 함)
import { TarotService } from "./tarot-service";
import { getCharacterById } from "@/data/characters";

describe("TarotService", () => {
  let service: TarotService;

  beforeEach(() => {
    service = new TarotService();
    vi.clearAllMocks();
  });

  describe("startSession(topic)", () => {
    it("반환된 Session 객체에 serviceType이 포함된다", () => {
      const session = service.startSession("love");
      expect(session.serviceType).toBe("tarot");
    });

    it("반환된 Session 객체에 topic이 포함된다", () => {
      const session = service.startSession("love");
      expect(session.topic).toBe("love");
    });

    it("반환된 Session 객체에 status가 포함된다", () => {
      const session = service.startSession("love");
      expect(session.status).toBe("in_progress");
    });

    it("반환된 Session 객체에 spreadType이 포함된다", () => {
      const session = service.startSession("love");
      expect(session.spreadType).toBeDefined();
      expect(session.spreadType).not.toBeNull();
    });

    it('topic "love"로 시작 시 spreadType이 유효한 스프레드 타입 문자열이다', () => {
      const session = service.startSession("love");
      const validSpreadTypes = [
        "one-card", "three-card", "five-card", "celtic-cross",
        "relationship", "horseshoe", "decision", "week-ahead",
        "zodiac", "tree-of-life",
      ];
      expect(validSpreadTypes).toContain(session.spreadType);
    });

    it('topic "love"로 시작 시 spreadType이 "three-card"이다 (topicToSpread 매핑)', () => {
      const session = service.startSession("love");
      expect(session.spreadType).toBe("three-card");
    });

    it("selectedCards가 빈 배열로 초기화된다", () => {
      const session = service.startSession("finance");
      expect(session.selectedCards).toEqual([]);
    });

    it("userId가 null로 초기화된다", () => {
      const session = service.startSession("career");
      expect(session.userId).toBeNull();
    });

    it("completedAt이 null로 초기화된다", () => {
      const session = service.startSession("health");
      expect(session.completedAt).toBeNull();
    });

    it('topic "health"로 시작 시 spreadType이 "one-card"이다', () => {
      const session = service.startSession("health");
      expect(session.spreadType).toBe("one-card");
    });

    it('topic "general"로 시작 시 spreadType이 "celtic-cross"이다', () => {
      const session = service.startSession("general");
      expect(session.spreadType).toBe("celtic-cross");
    });
  });

  describe("getCharacter()", () => {
    it("arcana 캐릭터를 찾을 수 없으면 Error를 던진다", () => {
      vi.mocked(getCharacterById).mockReturnValueOnce(undefined);
      expect(() => service.getCharacter()).toThrow("Arcana character not found");
    });
  });

  describe("getSystemPrompt(characterId)", () => {
    it('"arcana" characterId로 비어있지 않은 시스템 프롬프트를 반환한다', () => {
      const prompt = service.getSystemPrompt("arcana");
      expect(typeof prompt).toBe("string");
      expect(prompt.length).toBeGreaterThan(0);
    });

    it("시스템 프롬프트에 캐릭터 이름이 포함된다", () => {
      const prompt = service.getSystemPrompt("arcana");
      expect(prompt).toContain("아르카나");
    });

    it("characterId 미지정 시 기본 캐릭터(arcana)로 프롬프트를 생성한다", () => {
      // characterId 없을 때 getCharacter()가 "arcana"를 반환하므로 동일한 프롬프트
      const promptWithId = service.getSystemPrompt("arcana");
      const promptWithout = service.getSystemPrompt();
      expect(promptWithout.length).toBeGreaterThan(0);
      expect(promptWithout).toContain("아르카나");
      expect(promptWithout).toBe(promptWithId);
    });

    it("존재하지 않는 characterId 입력 시 기본 캐릭터(arcana)로 fallback된다", () => {
      // getCharacterById("invalid") → undefined → getCharacter() fallback
      const prompt = service.getSystemPrompt("invalid-character");
      expect(prompt).toBeDefined();
      expect(prompt.length).toBeGreaterThan(0);
      expect(prompt).toContain("아르카나");
    });
  });

  describe("getReadingPrompt(context)", () => {
    it("session.spreadType이 있으면 그 spreadType을 우선 사용한다", () => {
      // spreadType이 있을 때 → getSpreadByType() 호출 분기
      const context = {
        session: { spreadType: "three-card", selectedCards: [] },
        topic: "love",
        chatHistory: [],
        selectedCards: [],
      };
      const prompt = service.getReadingPrompt(context as unknown as Parameters<typeof service.getReadingPrompt>[0]);
      expect(typeof prompt).toBe("string");
      expect(prompt.length).toBeGreaterThan(0);
    });

    it("session.spreadType이 알 수 없는 값이면 topic으로 fallback한다 (?? 분기)", () => {
      const context = {
        session: { spreadType: "unknown-spread-type-xyz", selectedCards: [] },
        topic: "love",
        chatHistory: [],
        selectedCards: [],
      };
      const prompt = service.getReadingPrompt(context as unknown as Parameters<typeof service.getReadingPrompt>[0]);
      expect(typeof prompt).toBe("string");
      expect(prompt.length).toBeGreaterThan(0);
    });

    it("session.spreadType이 null이면 topic으로 spreadType을 결정한다", () => {
      // spreadType이 null → resolveForTopic() 분기
      const context = {
        session: { spreadType: null, selectedCards: [] },
        topic: "health",
        chatHistory: [],
        selectedCards: [],
      };
      const prompt = service.getReadingPrompt(context as unknown as Parameters<typeof service.getReadingPrompt>[0]);
      expect(typeof prompt).toBe("string");
      expect(prompt.length).toBeGreaterThan(0);
    });

    it("context.selectedCards가 null이면 ?? []로 빈 배열을 사용한다", () => {
      const context = {
        session: { spreadType: "three-card", selectedCards: [] },
        topic: "love",
        chatHistory: [],
        selectedCards: null,
      };
      const prompt = service.getReadingPrompt(context as unknown as Parameters<typeof service.getReadingPrompt>[0]);
      expect(typeof prompt).toBe("string");
      expect(prompt.length).toBeGreaterThan(0);
    });
  });

  describe("parseResult(aiResponse)", () => {
    it("유효한 JSON 응답을 파싱해 cardInterpretations 배열을 반환한다", () => {
      const validJson = JSON.stringify({
        cardInterpretations: [
          { cardId: "major-00", position: 0, interpretation: "새로운 시작" },
        ],
        overallReading: "전반적으로 긍정적입니다",
        advice: "용기를 내세요",
      });

      const result = service.parseResult(validJson);
      expect(Array.isArray(result.cardInterpretations)).toBe(true);
      expect(result.cardInterpretations).toHaveLength(1);
      expect(result.cardInterpretations![0].cardId).toBe("major-00");
    });

    it("유효한 JSON 응답을 파싱해 overallReading을 반환한다", () => {
      const validJson = JSON.stringify({
        cardInterpretations: [],
        overallReading: "전반적으로 긍정적입니다",
        advice: "용기를 내세요",
      });

      const result = service.parseResult(validJson);
      expect(result.overallReading).toBeTruthy();
    });

    it("유효한 JSON 응답을 파싱해 advice를 반환한다", () => {
      const validJson = JSON.stringify({
        cardInterpretations: [],
        overallReading: "전반적으로 긍정적입니다",
        advice: "용기를 내세요",
      });

      const result = service.parseResult(validJson);
      expect(result.advice).toBeTruthy();
    });

    it("여러 카드 해석을 포함한 JSON을 올바르게 파싱한다", () => {
      const validJson = JSON.stringify({
        cardInterpretations: [
          { cardId: "major-00", position: 0, interpretation: "새 시작" },
          { cardId: "major-01", position: 1, interpretation: "능력 발휘" },
          { cardId: "major-02", position: 2, interpretation: "내면의 지혜" },
        ],
        overallReading: "밝은 미래가 기다립니다",
        advice: "자신을 믿으세요",
      });

      const result = service.parseResult(validJson);
      expect(result.cardInterpretations).toHaveLength(3);
    });

    it("JSON 파싱 실패 시 Error를 던지지 않고 ReadingResult를 반환한다", () => {
      const invalidJson = "이것은 JSON이 아닙니다. 완전히 잘못된 텍스트.";
      expect(() => service.parseResult(invalidJson)).not.toThrow();
    });

    it("JSON 파싱 실패 시 overallReading에 원본 텍스트(정제된)가 포함된다", () => {
      const invalidJson = "이것은 JSON이 아닙니다. 완전히 잘못된 텍스트.";
      const result = service.parseResult(invalidJson);
      expect(result.overallReading).toBeTruthy();
      // 원본 텍스트 내용이 어느 정도 반영되어야 함
      expect(result.overallReading.length).toBeGreaterThan(0);
    });

    it("JSON 파싱 실패 시 cardInterpretations가 빈 배열이다", () => {
      const invalidJson = "완전히 잘못된 응답입니다";
      const result = service.parseResult(invalidJson);
      expect(result.cardInterpretations).toEqual([]);
    });

    it("빈 cardInterpretations를 포함한 JSON을 올바르게 처리한다", () => {
      const jsonWithEmpty = JSON.stringify({
        cardInterpretations: [],
        overallReading: "카드 해석 없음",
        advice: "나중에 다시 시도하세요",
      });

      const result = service.parseResult(jsonWithEmpty);
      expect(result.cardInterpretations).toEqual([]);
      expect(result.overallReading).toBeTruthy();
    });

    it("cardInterpretations가 배열이 아닌 값이면 빈 배열로 처리한다 (else 분기)", () => {
      const json = JSON.stringify({
        cardInterpretations: "not-an-array",
        overallReading: "전반 결과",
        advice: "조언",
      });
      const result = service.parseResult(json);
      expect(Array.isArray(result.cardInterpretations)).toBe(true);
      expect(result.cardInterpretations).toHaveLength(0);
    });

    it("cardInterpretations 없는 JSON도 처리한다 (undefined → 빈 배열)", () => {
      const jsonWithoutCards = JSON.stringify({
        overallReading: "종합 운세 결과입니다",
        advice: "조언 내용",
      });

      const result = service.parseResult(jsonWithoutCards);
      expect(Array.isArray(result.cardInterpretations)).toBe(true);
      expect(result.cardInterpretations).toHaveLength(0);
    });

    it("마크다운 코드블록으로 감싼 JSON도 파싱한다", () => {
      const wrappedJson = "```json\n" + JSON.stringify({
        cardInterpretations: [
          { cardId: "major-00", position: 0, interpretation: "새 시작" },
        ],
        overallReading: "긍정적 결과",
        advice: "앞으로 나아가세요",
      }) + "\n```";

      const result = service.parseResult(wrappedJson);
      expect(result.cardInterpretations).toHaveLength(1);
      expect(result.overallReading).toBeTruthy();
    });

    it("빈 문자열 입력 시 Error를 던지지 않는다", () => {
      expect(() => service.parseResult("")).not.toThrow();
    });

    it("JSON 파싱 실패 + extractFallbackText 결과 빈 문자열이면 기본 에러 메시지를 반환한다", () => {
      // 빈 문자열 → extractFallbackText("") = "" → cleanText || "해석 결과..." fallback
      const result = service.parseResult("");
      expect(result.overallReading).toContain("해석 결과를 처리하는 중 문제가 발생했습니다");
    });

    it("interpretation/overallReading/advice가 falsy이면 || '' 빈 문자열로 처리한다", () => {
      const json = JSON.stringify({
        cardInterpretations: [{ cardId: "major-00", position: 0, interpretation: "" }],
        overallReading: "",
        advice: null,
      });
      const result = service.parseResult(json);
      expect(result.cardInterpretations).toHaveLength(1);
      expect(result.overallReading).toBeDefined();
      expect(result.advice).toBeDefined();
    });

    describe("parseError 시그널 (truncated/invalid_json)", () => {
      it("expectedCardCount보다 cardInterpretations가 적으면 parseError='truncated'를 반환한다", () => {
        const json = JSON.stringify({
          cardInterpretations: [
            { cardId: "major-00", position: 0, interpretation: "해석1" },
            { cardId: "major-01", position: 1, interpretation: "해석2" },
          ],
          overallReading: "종합",
          advice: "조언",
        });
        const result = service.parseResult(json, 5);
        expect(result.parseError).toBe("truncated");
        expect(result.expectedCardCount).toBe(5);
        expect(result.cardInterpretations).toHaveLength(2);
      });

      it("cardInterpretations 길이가 expectedCardCount와 같으면 parseError가 없다", () => {
        const json = JSON.stringify({
          cardInterpretations: [
            { cardId: "major-00", position: 0, interpretation: "해석1" },
            { cardId: "major-01", position: 1, interpretation: "해석2" },
            { cardId: "major-02", position: 2, interpretation: "해석3" },
          ],
          overallReading: "종합",
          advice: "조언",
        });
        const result = service.parseResult(json, 3);
        expect(result.parseError).toBeUndefined();
        expect(result.expectedCardCount).toBe(3);
        expect(result.cardInterpretations).toHaveLength(3);
      });

      it("JSON 파싱 완전 실패 시 parseError='invalid_json'을 반환한다", () => {
        const result = service.parseResult("완전히 망가진 응답", 3);
        expect(result.parseError).toBe("invalid_json");
        expect(result.expectedCardCount).toBe(3);
        expect(result.cardInterpretations).toEqual([]);
      });

      it("expectedCardCount 미전달 시 parseError와 expectedCardCount 모두 미설정 (하위호환)", () => {
        const json = JSON.stringify({
          cardInterpretations: [
            { cardId: "major-00", position: 0, interpretation: "해석1" },
          ],
          overallReading: "종합",
          advice: "조언",
        });
        const result = service.parseResult(json);
        expect(result.parseError).toBeUndefined();
        expect(result.expectedCardCount).toBeUndefined();
      });

      it("expectedCardCount=0일 때 truncated 판정하지 않는다 (분기 가드)", () => {
        const json = JSON.stringify({
          cardInterpretations: [],
          overallReading: "종합",
          advice: "조언",
        });
        const result = service.parseResult(json, 0);
        expect(result.parseError).toBeUndefined();
        // expectedCardCount 자체는 그대로 보존
        expect(result.expectedCardCount).toBe(0);
      });
    });
  });
});
