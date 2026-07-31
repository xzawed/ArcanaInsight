/**
 * Playwright 리포트 아티팩트가 **실패 시에만** 업로드되도록 되돌아가는 것을 막는다.
 *
 * ## 왜 필요한가
 *
 * `if: failure()`였을 때, `retries: 2`가 흡수한 **flaky 실행은 잡이 초록**이라 조건에 걸리지
 * 않았다. 그래서 재시도로 통과한 실패의 trace·스크린샷이 매번 폐기됐고, 원인 조사는 로그
 * 문자열 추정에서 멈췄다. `navigation` 스크롤 테스트가 근본 원인 없이 두 번 "수정"된 경위다.
 *
 * trace는 `trace: "on-first-retry"`라 재시도가 있을 때만 생성되므로, 항상 업로드해도
 * 정상 런의 추가 비용은 HTML 리포트뿐이다.
 *
 * 사용: pnpm exec tsx scripts/check-workflow-artifacts.ts
 */

import * as fs from "node:fs";
import * as path from "node:path";

const ROOT = path.resolve(__dirname, "..");
const WORKFLOW_DIR = path.join(ROOT, ".github", "workflows");

/** 이 조건들만 허용 — 실패 시에만 올리면 flaky 증거가 사라진다. */
const ALLOWED = [/if:\s*always\(\)/, /if:\s*\$\{\{\s*!cancelled\(\)\s*\}\}/];

interface Violation {
  readonly file: string;
  readonly line: number;
  readonly detail: string;
}

function checkWorkflow(file: string): Violation[] {
  const lines = fs.readFileSync(path.join(WORKFLOW_DIR, file), "utf-8").split("\n");
  const violations: Violation[] = [];

  const reported = new Set<number>();

  for (let i = 0; i < lines.length; i++) {
    // name·path 두 줄 모두 매칭되므로 스텝 단위로 중복을 제거한다.
    if (!/name:\s*playwright-report/.test(lines[i]) && !/path:\s*playwright-report/.test(lines[i])) {
      continue;
    }
    // upload-artifact 스텝의 시작점을 위로 훑어 찾는다(최대 12줄).
    let stepStart = -1;
    for (let j = i; j >= Math.max(0, i - 12); j--) {
      if (/uses:\s*actions\/upload-artifact/.test(lines[j])) {
        stepStart = j;
        break;
      }
    }
    if (stepStart === -1 || reported.has(stepStart)) continue;
    reported.add(stepStart);

    // 스텝 블록에서 if: 조건을 찾는다.
    const block = lines.slice(stepStart, Math.min(lines.length, stepStart + 12)).join("\n");
    const ifMatch = /^\s*if:\s*.+$/m.exec(block);
    if (!ifMatch) continue; // 조건 없음 = 항상 업로드 = 허용

    const condition = ifMatch[0].trim();
    if (ALLOWED.some((re) => re.test(condition))) continue;

    violations.push({
      file,
      line: stepStart + 1,
      detail: condition,
    });
  }
  return violations;
}

function main(): void {
  if (!fs.existsSync(WORKFLOW_DIR)) {
    console.error(`[check-workflow-artifacts] 워크플로우 디렉터리가 없습니다: ${WORKFLOW_DIR}`);
    process.exit(1);
  }

  const files = fs.readdirSync(WORKFLOW_DIR).filter((f) => f.endsWith(".yml") || f.endsWith(".yaml"));
  if (files.length === 0) {
    console.error("[check-workflow-artifacts] 검사할 워크플로우가 없습니다. 경로 설정을 확인하세요.");
    process.exit(1);
  }

  const violations = files.flatMap(checkWorkflow);

  if (violations.length > 0) {
    console.error(`[check-workflow-artifacts] ${violations.length}건 위반:`);
    for (const v of violations) {
      console.error(`  .github/workflows/${v.file}:${v.line} → ${v.detail}`);
    }
    console.error(
      "\n  Playwright 리포트는 `if: always()` 또는 `if: \${{ !cancelled() }}`로 업로드해야 합니다.\n" +
      "  `if: failure()`면 retries가 흡수한 **flaky 실행의 trace가 폐기**되어 원인 조사가 불가능해집니다.",
    );
    process.exit(1);
  }

  console.log(`[check-workflow-artifacts] 검사 통과. 워크플로우 ${files.length}개, 위반 없음.`);
}

main();
