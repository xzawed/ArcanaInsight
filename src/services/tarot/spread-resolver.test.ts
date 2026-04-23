import { describe, it, expect, beforeEach } from "vitest";
import { SpreadResolver } from "./spread-resolver";
import type { Topic } from "@/types/session";

describe("SpreadResolver", () => {
  let resolver: SpreadResolver;

  beforeEach(() => {
    resolver = new SpreadResolver();
  });

  describe("resolveForTopic(topic)", () => {
    const tarotTopics: Topic[] = ["love", "love-single", "love-couple", "finance", "career", "health", "general"];

    tarotTopics.forEach((topic) => {
      it(`topic "${topic}"에 대해 유효한 SpreadDefinition을 반환한다`, () => {
        const spread = resolver.resolveForTopic(topic);
        expect(spread).toBeDefined();
        expect(spread.type).toBeTruthy();
        expect(spread.name).toBeTruthy();
        expect(spread.nameKo).toBeTruthy();
        expect(Array.isArray(spread.positions)).toBe(true);
        expect(spread.positions.length).toBeGreaterThan(0);
      });
    });

    it('topic "love"에 대해 positions 배열이 비어있지 않다', () => {
      const spread = resolver.resolveForTopic("love");
      expect(spread.positions).not.toHaveLength(0);
    });

    it('topic "finance"에 대해 positions 배열이 비어있지 않다', () => {
      const spread = resolver.resolveForTopic("finance");
      expect(spread.positions).not.toHaveLength(0);
    });

    it('topic "career"에 대해 positions 배열이 비어있지 않다', () => {
      const spread = resolver.resolveForTopic("career");
      expect(spread.positions).not.toHaveLength(0);
    });

    it('topic "health"에 대해 positions 배열이 비어있지 않다', () => {
      const spread = resolver.resolveForTopic("health");
      expect(spread.positions).not.toHaveLength(0);
    });

    it('topic "general"에 대해 positions 배열이 비어있지 않다', () => {
      const spread = resolver.resolveForTopic("general");
      expect(spread.positions).not.toHaveLength(0);
    });

    it("각 position에 index, label, labelKo, x, y 필드가 있다", () => {
      const spread = resolver.resolveForTopic("love");
      spread.positions.forEach((pos) => {
        expect(typeof pos.index).toBe("number");
        expect(typeof pos.label).toBe("string");
        expect(typeof pos.labelKo).toBe("string");
        expect(typeof pos.x).toBe("number");
        expect(typeof pos.y).toBe("number");
      });
    });

    it("알 수 없는 topic(사주/신점 topic)을 입력해도 기본 스프레드를 반환한다 (three-card fallback)", () => {
      // getSpreadForTopic은 topicToSpread에 없는 topic이면 "three-card" 기본값 사용
      const spread = resolver.resolveForTopic("saju-general");
      expect(spread).toBeDefined();
      expect(spread.positions.length).toBeGreaterThan(0);
      expect(spread.type).toBe("three-card");
    });
  });

  describe("getSpreadByType(type)", () => {
    it("존재하는 type으로 SpreadDefinition을 반환한다", () => {
      const spread = resolver.getSpreadByType("one-card");
      expect(spread).toBeDefined();
      expect(spread?.type).toBe("one-card");
    });

    it('"three-card"로 쓰리카드 스프레드를 반환한다', () => {
      const spread = resolver.getSpreadByType("three-card");
      expect(spread).toBeDefined();
      expect(spread?.positions).toHaveLength(3);
    });

    it('"celtic-cross"로 10장 켈틱 크로스 스프레드를 반환한다', () => {
      const spread = resolver.getSpreadByType("celtic-cross");
      expect(spread).toBeDefined();
      expect(spread?.positions).toHaveLength(10);
    });

    it("존재하지 않는 type에 대해 undefined를 반환한다", () => {
      const spread = resolver.getSpreadByType("non-existent-spread-type");
      expect(spread).toBeUndefined();
    });

    it("빈 문자열 type에 대해 undefined를 반환한다", () => {
      const spread = resolver.getSpreadByType("");
      expect(spread).toBeUndefined();
    });

    const allSpreadTypes = [
      "one-card", "three-card", "five-card", "celtic-cross",
      "relationship", "horseshoe", "decision", "week-ahead",
      "zodiac", "tree-of-life",
    ];

    allSpreadTypes.forEach((type) => {
      it(`모든 스프레드 타입 "${type}"을 조회할 수 있다`, () => {
        const spread = resolver.getSpreadByType(type);
        expect(spread).toBeDefined();
        expect(spread?.positions.length).toBeGreaterThan(0);
      });
    });
  });

  describe("getRequiredCardCount(topic)", () => {
    const tarotTopics: Topic[] = ["love", "love-single", "love-couple", "finance", "career", "health", "general"];

    tarotTopics.forEach((topic) => {
      it(`topic "${topic}"의 필요 카드 수가 양수 정수이다`, () => {
        const count = resolver.getRequiredCardCount(topic);
        expect(count).toBeGreaterThan(0);
        expect(Number.isInteger(count)).toBe(true);
      });
    });

    it('topic "health"의 필요 카드 수가 1이다 (one-card 스프레드)', () => {
      const count = resolver.getRequiredCardCount("health");
      expect(count).toBe(1);
    });

    it('topic "love"의 필요 카드 수가 3이다 (three-card 스프레드)', () => {
      const count = resolver.getRequiredCardCount("love");
      expect(count).toBe(3);
    });

    it('topic "general"의 필요 카드 수가 10이다 (celtic-cross 스프레드)', () => {
      const count = resolver.getRequiredCardCount("general");
      expect(count).toBe(10);
    });
  });
});
