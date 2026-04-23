import { describe, it, expect } from "vitest";
import { TAROT_TOPICS, SAJU_TOPICS, SHINJEOM_TOPICS, ALL_TOPICS } from "./topics";

describe("TAROT_TOPICS", () => {
  it("7개 항목이 있다", () => {
    expect(TAROT_TOPICS).toHaveLength(7);
  });

  it("모든 요소가 string 타입이다", () => {
    for (const topic of TAROT_TOPICS) {
      expect(typeof topic).toBe("string");
    }
  });

  it("love, love-single, love-couple, finance, career, health, general을 포함한다", () => {
    expect(TAROT_TOPICS).toContain("love");
    expect(TAROT_TOPICS).toContain("love-single");
    expect(TAROT_TOPICS).toContain("love-couple");
    expect(TAROT_TOPICS).toContain("finance");
    expect(TAROT_TOPICS).toContain("career");
    expect(TAROT_TOPICS).toContain("health");
    expect(TAROT_TOPICS).toContain("general");
  });

  it("사주/신점 prefix 값을 포함하지 않는다", () => {
    for (const topic of TAROT_TOPICS) {
      expect(topic.startsWith("saju-")).toBe(false);
      expect(topic.startsWith("shinjeom-")).toBe(false);
    }
  });
});

describe("SAJU_TOPICS", () => {
  it("8개 항목이 있다", () => {
    expect(SAJU_TOPICS).toHaveLength(8);
  });

  it("모든 요소가 string 타입이다", () => {
    for (const topic of SAJU_TOPICS) {
      expect(typeof topic).toBe("string");
    }
  });

  it("모든 항목이 saju- prefix로 시작한다", () => {
    for (const topic of SAJU_TOPICS) {
      expect(topic.startsWith("saju-")).toBe(true);
    }
  });

  it("8개 분석영역을 모두 포함한다", () => {
    expect(SAJU_TOPICS).toContain("saju-general");
    expect(SAJU_TOPICS).toContain("saju-love-single");
    expect(SAJU_TOPICS).toContain("saju-love-couple");
    expect(SAJU_TOPICS).toContain("saju-career");
    expect(SAJU_TOPICS).toContain("saju-health");
    expect(SAJU_TOPICS).toContain("saju-personality");
    expect(SAJU_TOPICS).toContain("saju-compatibility");
    expect(SAJU_TOPICS).toContain("saju-auspicious-date");
  });
});

describe("SHINJEOM_TOPICS", () => {
  it("6개 항목이 있다", () => {
    expect(SHINJEOM_TOPICS).toHaveLength(6);
  });

  it("모든 요소가 string 타입이다", () => {
    for (const topic of SHINJEOM_TOPICS) {
      expect(typeof topic).toBe("string");
    }
  });

  it("모든 항목이 shinjeom- prefix로 시작한다", () => {
    for (const topic of SHINJEOM_TOPICS) {
      expect(topic.startsWith("shinjeom-")).toBe(true);
    }
  });

  it("6개 주제를 모두 포함한다", () => {
    expect(SHINJEOM_TOPICS).toContain("shinjeom-general");
    expect(SHINJEOM_TOPICS).toContain("shinjeom-love");
    expect(SHINJEOM_TOPICS).toContain("shinjeom-wealth");
    expect(SHINJEOM_TOPICS).toContain("shinjeom-career");
    expect(SHINJEOM_TOPICS).toContain("shinjeom-health");
    expect(SHINJEOM_TOPICS).toContain("shinjeom-auspicious");
  });
});

describe("ALL_TOPICS", () => {
  it("TAROT + SAJU + SHINJEOM 합산인 21개다", () => {
    expect(ALL_TOPICS).toHaveLength(21);
    expect(ALL_TOPICS).toHaveLength(
      TAROT_TOPICS.length + SAJU_TOPICS.length + SHINJEOM_TOPICS.length
    );
  });

  it("TAROT_TOPICS의 모든 항목을 포함한다", () => {
    for (const topic of TAROT_TOPICS) {
      expect(ALL_TOPICS).toContain(topic);
    }
  });

  it("SAJU_TOPICS의 모든 항목을 포함한다", () => {
    for (const topic of SAJU_TOPICS) {
      expect(ALL_TOPICS).toContain(topic);
    }
  });

  it("SHINJEOM_TOPICS의 모든 항목을 포함한다", () => {
    for (const topic of SHINJEOM_TOPICS) {
      expect(ALL_TOPICS).toContain(topic);
    }
  });

  it("중복 값이 없다", () => {
    const unique = new Set(ALL_TOPICS);
    expect(unique.size).toBe(ALL_TOPICS.length);
  });

  it("유효한 토픽 값이 포함된다", () => {
    expect(ALL_TOPICS.includes("love")).toBe(true);
    expect(ALL_TOPICS.includes("saju-general")).toBe(true);
    expect(ALL_TOPICS.includes("shinjeom-general")).toBe(true);
  });

  it("존재하지 않는 값은 포함되지 않는다", () => {
    expect(ALL_TOPICS.includes("invalid")).toBe(false);
    expect(ALL_TOPICS.includes("")).toBe(false);
    expect(ALL_TOPICS.includes("saju")).toBe(false);
    expect(ALL_TOPICS.includes("shinjeom")).toBe(false);
  });

  it("모든 요소가 string 타입이다", () => {
    for (const topic of ALL_TOPICS) {
      expect(typeof topic).toBe("string");
    }
  });
});
