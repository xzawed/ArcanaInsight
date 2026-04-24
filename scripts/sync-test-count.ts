/**
 * CLAUDE.md의 "N개 테스트" 수치를 실제 Vitest 결과와 동기화한다.
 *
 * 사용법:
 *   pnpm exec tsx scripts/sync-test-count.ts          # CLAUDE.md 자동 갱신
 *   pnpm exec tsx scripts/sync-test-count.ts --check  # CI 모드: 불일치 시 exit 1
 */

import { execSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";

const ROOT = path.resolve(__dirname, "..");
const CLAUDE_MD = path.join(ROOT, "CLAUDE.md");
const CHECK_MODE = process.argv.includes("--check");

function getActualTestCount(): number {
  try {
    const output = execSync(
      "pnpm exec vitest run --reporter=verbose 2>&1 || true",
      { cwd: ROOT, encoding: "utf-8", timeout: 120_000 }
    );
    // "Tests  539 passed" or "539 passed" 형태 파싱
    const match = output.match(/(\d+)\s+passed/);
    if (match) return parseInt(match[1], 10);

    // fallback: "Test Files  31 passed" 다음에 나오는 "Tests" 라인
    const testsLine = output.split("\n").find((l) => /^\s*Tests\s+\d+/.test(l));
    if (testsLine) {
      const m = testsLine.match(/(\d+)\s+passed/);
      if (m) return parseInt(m[1], 10);
    }
    throw new Error("테스트 수 파싱 실패:\n" + output.slice(-500));
  } catch (e) {
    console.error("[sync-test-count] 테스트 실행 오류:", e);
    process.exit(1);
  }
}

function getDocumentedCount(content: string): number | null {
  // "Vitest 2.0 (node env, v8 coverage, 539개 테스트" 패턴
  const match = content.match(/Vitest[^(]*\(node env[^,]*,\s*v8 coverage[^,]*,\s*(\d+)개\s*테스트/);
  if (match) return parseInt(match[1], 10);
  return null;
}

const claudeMd = fs.readFileSync(CLAUDE_MD, "utf-8");
const documented = getDocumentedCount(claudeMd);

if (documented === null) {
  console.warn("[sync-test-count] CLAUDE.md에서 테스트 수 패턴을 찾지 못했습니다. 수동 확인 필요.");
  process.exit(0);
}

console.log(`[sync-test-count] CLAUDE.md 기록: ${documented}개`);
console.log("[sync-test-count] Vitest 실행 중...");

const actual = getActualTestCount();
console.log(`[sync-test-count] 실제 테스트 수: ${actual}개`);

if (documented === actual) {
  console.log("[sync-test-count] 일치. 변경 불필요.");
  process.exit(0);
}

if (CHECK_MODE) {
  console.error(
    `[sync-test-count] 불일치! CLAUDE.md: ${documented}개 / 실제: ${actual}개\n` +
    `  다음 명령으로 자동 갱신하세요: pnpm exec tsx scripts/sync-test-count.ts`
  );
  process.exit(1);
}

const updated = claudeMd.replace(
  /(Vitest[^(]*\(node env[^,]*,\s*v8 coverage[^,]*,\s*)\d+(개\s*테스트)/,
  `$1${actual}$2`
);
fs.writeFileSync(CLAUDE_MD, updated, "utf-8");
console.log(`[sync-test-count] CLAUDE.md 갱신 완료: ${documented}개 → ${actual}개`);
