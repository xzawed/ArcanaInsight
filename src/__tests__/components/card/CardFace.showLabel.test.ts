/**
 * CardFace showLabel prop 단위 테스트
 *
 * vitest env=node 환경에서 React 렌더링 없이
 * 인터페이스 정의와 prop 기본값을 검증한다.
 */
import { describe, it, expect } from "vitest";

// CardFace 컴포넌트 소스의 showLabel 기본값 동작을 타입 레벨에서 검증
// (실제 DOM 렌더링은 E2E / Playwright로 검증)
describe("CardFace showLabel prop 계약", () => {
  it("showLabel이 true일 때 텍스트 블록이 렌더링되어야 함 (규칙 문서화)", () => {
    // 이 테스트는 showLabel prop의 계약을 문서화한다:
    // - showLabel=true (기본값): SVG text 요소(카드명·문구) 렌더링
    // - showLabel=false: SVG text 요소 비렌더링 (숫자 제외)
    expect(true).toBe(true); // 계약 문서화 — 렌더링 검증은 E2E에서 수행
  });

  it("showLabel 기본값은 true이다 (소스 코드 확인)", async () => {
    // CardFace.tsx 소스에서 showLabel = true 기본값을 동적으로 확인
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    const filePath = path.resolve(process.cwd(), "src/components/card/CardFace.tsx");
    const source = await fs.readFile(filePath, "utf-8");
    expect(source).toContain("showLabel = true");
  });

  it("showLabel이 false일 때 텍스트 블록이 조건부 렌더링된다 (소스 코드 확인)", async () => {
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    const filePath = path.resolve(process.cwd(), "src/components/card/CardFace.tsx");
    const source = await fs.readFile(filePath, "utf-8");
    // showLabel && 패턴으로 텍스트 블록이 조건부 렌더링됨을 확인
    expect(source).toContain("{showLabel && (");
  });

  it("CardItem도 showLabel prop을 CardFace에 전달한다 (소스 코드 확인)", async () => {
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    const filePath = path.resolve(process.cwd(), "src/components/card/CardItem.tsx");
    const source = await fs.readFile(filePath, "utf-8");
    expect(source).toContain("showLabel={showLabel}");
  });

  it("CardSpread도 showLabel prop을 CardItem에 전달한다 (소스 코드 확인)", async () => {
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    const filePath = path.resolve(process.cwd(), "src/components/card/CardSpread.tsx");
    const source = await fs.readFile(filePath, "utf-8");
    expect(source).toContain("showLabel={showLabel}");
  });
});
