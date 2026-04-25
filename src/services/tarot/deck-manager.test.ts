import { describe, it, expect, beforeEach } from "vitest";
import { DeckManager } from "./deck-manager";

describe("DeckManager", () => {
  let deckManager: DeckManager;

  beforeEach(() => {
    deckManager = new DeckManager();
  });

  describe("생성자", () => {
    it("getAllCards()가 78장(메이저 22장 + 마이너 56장)을 반환한다", () => {
      const cards = deckManager.getAllCards();
      expect(cards).toHaveLength(78);
    });

    it("메이저 아르카나 카드가 22장 포함된다", () => {
      const major = deckManager.getAllCards().filter((c) => c.type === "major");
      expect(major).toHaveLength(22);
    });

    it("마이너 아르카나 카드가 56장 포함된다", () => {
      const minor = deckManager.getAllCards().filter((c) => c.type === "minor");
      expect(minor).toHaveLength(56);
    });
  });

  describe("getCardById", () => {
    it("존재하는 ID로 TarotCard를 반환한다", () => {
      const card = deckManager.getCardById("major-00");
      expect(card).toBeDefined();
      expect(card?.id).toBe("major-00");
      expect(card?.name).toBe("The Fool");
    });

    it("없는 ID에 대해 undefined를 반환한다", () => {
      const card = deckManager.getCardById("non-existent-card-id");
      expect(card).toBeUndefined();
    });

    it("빈 문자열 ID에 대해 undefined를 반환한다", () => {
      const card = deckManager.getCardById("");
      expect(card).toBeUndefined();
    });
  });

  describe("shuffleAndDraw(count)", () => {
    it("정확히 count장을 반환한다", () => {
      const drawn = deckManager.shuffleAndDraw(5);
      expect(drawn).toHaveLength(5);
    });

    it("각 카드에 position이 포함된다", () => {
      const drawn = deckManager.shuffleAndDraw(3);
      drawn.forEach((selectedCard, index) => {
        expect(selectedCard.position).toBe(index);
      });
    });

    it("각 카드에 isReversed(boolean)가 포함된다", () => {
      const drawn = deckManager.shuffleAndDraw(3);
      drawn.forEach((selectedCard) => {
        expect(typeof selectedCard.isReversed).toBe("boolean");
      });
    });

    it("각 카드에 selectedAt(Date)가 포함된다", () => {
      const drawn = deckManager.shuffleAndDraw(3);
      drawn.forEach((selectedCard) => {
        expect(selectedCard.selectedAt).toBeInstanceOf(Date);
      });
    });

    it("반환된 카드 ID가 중복 없다", () => {
      const drawn = deckManager.shuffleAndDraw(10);
      const ids = drawn.map((sc) => sc.card.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(10);
    });

    it("전체 덱(78장) 드로우가 가능하다", () => {
      const drawn = deckManager.shuffleAndDraw(78);
      expect(drawn).toHaveLength(78);
      const ids = drawn.map((sc) => sc.card.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(78);
    });

    it("count=0이면 빈 배열을 반환한다", () => {
      const drawn = deckManager.shuffleAndDraw(0);
      expect(drawn).toHaveLength(0);
      expect(Array.isArray(drawn)).toBe(true);
    });

    it("1000회 드로우 시 isReversed 비율이 대략 40~60%이다 (통계적 검증)", () => {
      let reversedCount = 0;
      const totalDraws = 1000;

      for (let i = 0; i < totalDraws; i++) {
        const [card] = deckManager.shuffleAndDraw(1);
        if (card.isReversed) reversedCount++;
      }

      const ratio = reversedCount / totalDraws;
      expect(ratio).toBeGreaterThan(0.4);
      expect(ratio).toBeLessThan(0.6);
    });
  });

  describe("drawSpecificCards(cardIds, reversed)", () => {
    it("지정한 카드 ID 순서대로 SelectedCard를 반환한다", () => {
      const result = deckManager.drawSpecificCards(["major-00", "major-01"], [false, true]);
      expect(result).toHaveLength(2);
      expect(result[0].card.id).toBe("major-00");
      expect(result[0].isReversed).toBe(false);
      expect(result[1].card.id).toBe("major-01");
      expect(result[1].isReversed).toBe(true);
    });

    it("reversed 배열이 짧으면 나머지는 false로 처리", () => {
      const result = deckManager.drawSpecificCards(["major-00", "major-01"], []);
      expect(result[0].isReversed).toBe(false);
      expect(result[1].isReversed).toBe(false);
    });

    it("존재하지 않는 카드 ID → Error 던진다", () => {
      expect(() => deckManager.drawSpecificCards(["non-existent-id"], [false])).toThrow("Card not found: non-existent-id");
    });
  });

  describe("내부 구조 (O(1) 조회)", () => {
    it("cardMap 필드가 Map 인스턴스로 존재한다", () => {
      const internal = deckManager as unknown as Record<string, unknown>;
      expect(internal["cardMap"]).toBeInstanceOf(Map);
    });

    it("cardMap에 78개 항목이 있다", () => {
      const internal = deckManager as unknown as Record<string, unknown>;
      const cardMap = internal["cardMap"] as Map<string, unknown>;
      expect(cardMap.size).toBe(78);
    });
  });
});
