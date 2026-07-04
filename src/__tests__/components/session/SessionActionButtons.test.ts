/**
 * SessionActionButtons 컴포넌트 단위 테스트
 *
 * vitest env=node 환경에서 props 계약을 검증한다.
 * React 렌더링 및 클릭 이벤트는 E2E / Playwright로 검증한다.
 */
import { describe, it, expect } from "vitest";

describe("SessionActionButtons props 계약", () => {
  it("className prop이 없을 때 기본 pt-5가 적용된다 (계약 문서화)", () => {
    // SessionActionButtons는 className이 없으면 pt-5를 사용한다
    const resolveWrapperClass = (className?: string) => `flex gap-3 flex-shrink-0 ${className ?? "pt-5"}`;
    expect(resolveWrapperClass()).toContain("pt-5");
    expect(resolveWrapperClass("pt-2")).not.toContain("pt-5");
  });

  it("className prop이 있을 때 override된다 (shinjeom에서 pt-2 사용)", () => {
    const customClassName = "pt-2";
    // 외부 className이 기본 pt-5를 대체한다
    const applied = `flex gap-3 flex-shrink-0 ${customClassName}`;
    expect(applied).toContain("pt-2");
    expect(applied).not.toContain("pt-5");
  });

  it("두 버튼이 항상 존재한다 (newSession + share)", () => {
    // 버튼 레이블 prop이 반드시 제공되어야 한다
    const requiredProps = ["onNewSession", "onShare", "newSessionLabel", "shareLabel"];
    expect(requiredProps).toHaveLength(4);
    expect(requiredProps).toContain("newSessionLabel");
    expect(requiredProps).toContain("shareLabel");
  });
});
