/**
 * CardInterpretationList 컴포넌트 단위 테스트
 *
 * vitest env=node 환경에서 컴포넌트 계약을 검증한다.
 * React 렌더링은 E2E / Playwright로 검증한다.
 */
import { describe, it, expect } from "vitest";

describe("CardInterpretationList 컴포넌트 계약", () => {
  it("CardInterpretationList가 named export로 존재한다 (소스 코드 확인)", async () => {
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    const filePath = path.resolve(process.cwd(), "src/components/tarot/CardInterpretationList.tsx");
    const source = await fs.readFile(filePath, "utf-8");
    expect(source).toContain("export function CardInterpretationList");
  });

  it("CardInterpretationList는 interpretations, selectedCards, spread, locale props를 받는다 (소스 코드 확인)", async () => {
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    const filePath = path.resolve(process.cwd(), "src/components/tarot/CardInterpretationList.tsx");
    const source = await fs.readFile(filePath, "utf-8");
    expect(source).toContain("interpretations:");
    expect(source).toContain("selectedCards:");
    expect(source).toContain("spread:");
    expect(source).toContain("locale:");
  });

  it("fallbackPosLabel이 spreads 모듈에서 임포트된다 (소스 코드 확인)", async () => {
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    const filePath = path.resolve(process.cwd(), "src/components/tarot/CardInterpretationList.tsx");
    const source = await fs.readFile(filePath, "utf-8");
    expect(source).toContain('from "@/data/spreads"');
    expect(source).toContain("fallbackPosLabel");
  });

  it("fallbackPosLabel이 spreads 모듈에서 export된다 (소스 코드 확인)", async () => {
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    const filePath = path.resolve(process.cwd(), "src/data/spreads/index.ts");
    const source = await fs.readFile(filePath, "utf-8");
    expect(source).toContain("export function fallbackPosLabel");
  });
});
