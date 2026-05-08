import { describe, it, expect, beforeEach } from "vitest";
import { useSessionStore } from "../useSession";
import { SelectedCard, TarotCard } from "@/types/card";

function makeCard(id: string): TarotCard {
  return {
    id,
    name: `카드-${id}`,
    arcana: "minor",
    suit: "cups",
    number: 1,
    keywords: [],
    keywordsReversed: [],
    upright: "",
    reversed: "",
  } as unknown as TarotCard;
}

function makeSelected(id: string, position: number): SelectedCard {
  return {
    card: makeCard(id),
    position,
    isReversed: false,
    selectedAt: new Date(),
  };
}

describe("useSessionStore — selectCard atomic dedup", () => {
  beforeEach(() => {
    useSessionStore.getState().reset();
    useSessionStore.setState({ requiredCards: 3 });
  });

  it("정상 카드 선택 시 selectedCards에 push", () => {
    useSessionStore.getState().selectCard(makeSelected("a", 0));
    expect(useSessionStore.getState().selectedCards).toHaveLength(1);
    expect(useSessionStore.getState().selectedCards[0].card.id).toBe("a");
  });

  it("같은 card.id 두 번 호출 시 두 번째는 무시 (빠른 더블탭 race 방어)", () => {
    const card = makeSelected("dup", 0);
    useSessionStore.getState().selectCard(card);
    useSessionStore.getState().selectCard(card);
    expect(useSessionStore.getState().selectedCards).toHaveLength(1);
  });

  it("requiredCards 도달 후 추가 selectCard 호출은 무시 (length cap)", () => {
    useSessionStore.setState({ requiredCards: 2 });
    useSessionStore.getState().selectCard(makeSelected("a", 0));
    useSessionStore.getState().selectCard(makeSelected("b", 1));
    useSessionStore.getState().selectCard(makeSelected("c", 2)); // 초과
    expect(useSessionStore.getState().selectedCards).toHaveLength(2);
    expect(useSessionStore.getState().selectedCards.map((c) => c.card.id)).toEqual(["a", "b"]);
  });

  it("cancel 후 같은 card.id 재선택은 허용 (cancel-then-reselect 호환)", () => {
    const cardA = makeSelected("a", 0);
    useSessionStore.getState().selectCard(cardA);
    // cancel: 직접 setState로 selectedCards 비우기 (handleCancelLastCard와 동일 패턴)
    useSessionStore.setState({ selectedCards: [] });
    // 같은 card.id로 다시 선택 — store에 없으니 통과
    useSessionStore.getState().selectCard(cardA);
    expect(useSessionStore.getState().selectedCards).toHaveLength(1);
    expect(useSessionStore.getState().selectedCards[0].card.id).toBe("a");
  });

  it("서로 다른 card.id는 정상 누적", () => {
    useSessionStore.getState().selectCard(makeSelected("a", 0));
    useSessionStore.getState().selectCard(makeSelected("b", 1));
    useSessionStore.getState().selectCard(makeSelected("c", 2));
    expect(useSessionStore.getState().selectedCards).toHaveLength(3);
  });
});
