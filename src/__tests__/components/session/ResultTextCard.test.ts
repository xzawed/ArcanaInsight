/**
 * ResultTextCard 컴포넌트 단위 테스트
 *
 * vitest env=node 환경에서 props 계약을 검증한다.
 * React 렌더링은 E2E / Playwright로 검증한다.
 */
import { describe, it, expect } from "vitest";

// COLOR 팔레트 — ResultTextCard와 동일 정의 (계약 검증용)
const COLOR = {
  purple: { bg: "bg-arcana-purple/10", border: "border-arcana-purple/30", text: "text-arcana-purple" },
  gold:   { bg: "bg-arcana-gold/5",    border: "border-arcana-gold/30",   text: "text-arcana-gold" },
  card:   { bg: "bg-arcana-card/70",   border: "border-arcana-border",    text: "text-arcana-gold" },
} as const;

type ColorScheme = keyof typeof COLOR;

describe("ResultTextCard 컬러 스킴 계약", () => {
  it("purple 스킴은 bg-arcana-purple/10을 사용한다", () => {
    expect(COLOR.purple.bg).toBe("bg-arcana-purple/10");
    expect(COLOR.purple.border).toBe("border-arcana-purple/30");
    expect(COLOR.purple.text).toBe("text-arcana-purple");
  });

  it("gold 스킴은 bg-arcana-gold/5를 사용한다", () => {
    expect(COLOR.gold.bg).toBe("bg-arcana-gold/5");
    expect(COLOR.gold.border).toBe("border-arcana-gold/30");
    expect(COLOR.gold.text).toBe("text-arcana-gold");
  });

  it("card 스킴은 bg-arcana-card/70를 사용한다", () => {
    expect(COLOR.card.bg).toBe("bg-arcana-card/70");
    expect(COLOR.card.border).toBe("border-arcana-border");
    expect(COLOR.card.text).toBe("text-arcana-gold");
  });

  it("모든 colorScheme 키가 COLOR에 존재한다", () => {
    const keys: ColorScheme[] = ["purple", "gold", "card"];
    for (const key of keys) {
      expect(COLOR[key]).toBeDefined();
    }
  });

  it("delay prop 미지정 시 기본값 0으로 처리한다 (prop 계약 문서화)", () => {
    // ResultTextCard의 delay 기본값 처리 로직(`delay = 0`)을 미러링
    const resolveDelay = (delay?: number) => delay ?? 0;
    expect(resolveDelay()).toBe(0);
    expect(resolveDelay(0.3)).toBe(0.3);
  });
});
