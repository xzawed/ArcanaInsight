import { describe, it, expect } from "vitest";
import { normalizeCardInterpretations } from "./result-view";

describe("normalizeCardInterpretations", () => {
  it("배열이 아니면 빈 배열을 반환한다", () => {
    expect(normalizeCardInterpretations(null)).toEqual([]);
    expect(normalizeCardInterpretations(undefined)).toEqual([]);
    expect(normalizeCardInterpretations("not an array")).toEqual([]);
    expect(normalizeCardInterpretations({})).toEqual([]);
  });

  // 회귀 방지 (2026-05-26 ~ 08-01, 약 67일): #414로 3-섹션이 도입됐는데 공유·마이페이지
  // 결과 페이지가 계속 `interpretation`만 읽었다. 신포맷 행에는 그 키가 없어
  // `cleanReadingText(undefined)`로 서버 컴포넌트가 터졌다.
  it("신포맷(3-섹션)에 interpretation 키가 없어도 터지지 않고 섹션을 살린다", () => {
    const [item] = normalizeCardInterpretations([
      {
        cardId: "major-00",
        position: 0,
        symbolism: "상징 해석",
        situation: "상황 해석",
        action: "행동 제안",
        isReversed: false,
      },
    ]);
    expect(item.hasSections).toBe(true);
    expect(item.symbolism).toBe("상징 해석");
    expect(item.situation).toBe("상황 해석");
    expect(item.action).toBe("행동 제안");
    expect(item.interpretation).toBe("");
  });

  it("구포맷(interpretation만)은 hasSections=false로 판정해 평문 경로를 쓰게 한다", () => {
    const [item] = normalizeCardInterpretations([
      { cardId: "major-01", position: 1, interpretation: "예전 형식 해석", isReversed: true },
    ]);
    expect(item.hasSections).toBe(false);
    expect(item.interpretation).toBe("예전 형식 해석");
    expect(item.symbolism).toBe("");
    expect(item.isReversed).toBe(true);
  });

  it("action만 있는 행은 3-섹션으로 보지 않는다 (세션 화면과 같은 기준)", () => {
    const [item] = normalizeCardInterpretations([
      { cardId: "major-02", position: 2, action: "행동만", interpretation: "구형식" },
    ]);
    expect(item.hasSections).toBe(false);
    expect(item.interpretation).toBe("구형식");
  });

  it("두 포맷이 섞여 있어도 각각 올바르게 판정한다", () => {
    const items = normalizeCardInterpretations([
      { cardId: "a", position: 0, interpretation: "구형식" },
      { cardId: "b", position: 1, symbolism: "상징", situation: "상황" },
    ]);
    expect(items.map((i) => i.hasSections)).toEqual([false, true]);
  });

  it("객체가 아닌 원소는 걸러낸다", () => {
    const items = normalizeCardInterpretations([null, "문자열", 42, { cardId: "a", position: 0 }]);
    expect(items).toHaveLength(1);
    expect(items[0].cardId).toBe("a");
  });

  it("JSON 잔여물을 제거한다 (cleanReadingText 경유)", () => {
    const [item] = normalizeCardInterpretations([
      { cardId: "a", position: 0, symbolism: '"symbolism": 상징 텍스트' },
    ]);
    expect(item.symbolism).not.toContain('"symbolism":');
    expect(item.symbolism).toContain("상징 텍스트");
  });
});
