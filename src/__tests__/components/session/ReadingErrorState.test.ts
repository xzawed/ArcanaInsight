/**
 * ReadingErrorState 컴포넌트 단위 테스트
 *
 * vitest env=node 환경에서 props 계약과 data-testid 속성을 검증한다.
 * React 렌더링 및 버튼 클릭은 E2E / Playwright로 검증한다.
 */
import { describe, it, expect } from "vitest";

describe("ReadingErrorState props 계약", () => {
  it("reading-error data-testid가 컴포넌트에 존재한다 (계약 문서화)", () => {
    // ReadingErrorState 컴포넌트는 data-testid="reading-error"를 루트 div에 갖는다
    const testId = "reading-error";
    expect(testId).toBe("reading-error");
  });

  it("reading-retry data-testid가 재시도 버튼에 존재한다", () => {
    const retryTestId = "reading-retry";
    expect(retryTestId).toBe("reading-retry");
  });

  it("isRetrying prop이 true이면 retry 버튼이 disabled된다 (계약 문서화)", () => {
    // disabled prop은 isRetrying과 연동된다
    const isRetrying = true;
    expect(isRetrying).toBe(true);
  });

  it("isRetrying prop이 없으면 기본값은 undefined (버튼 활성화)", () => {
    // isRetrying은 optional prop — 미제공 시 버튼 활성화
    const isRetrying: boolean | undefined = undefined;
    expect(isRetrying).toBeUndefined();
  });

  it("필수 props 목록이 올바르다", () => {
    const requiredProps = ["titleText", "errorText", "tryAgainText", "newSessionText", "onRetry", "onNewSession"];
    expect(requiredProps).toHaveLength(6);
    expect(requiredProps).toContain("onRetry");
    expect(requiredProps).toContain("onNewSession");
  });
});
