/**
 * 검사 스크립트가 **결함이 있을 때 실제로 실패하는지**를 검증한다.
 *
 * ## 왜 필요한가
 *
 * 2026-07~08 조사에서 "존재하지만 무력한 가드"가 세 번 나왔다.
 *
 *   1. `check-doc-links`가 `docs/` 안만 봐서 CLAUDE.md(링크 25곳)·`.claude/**`·루트 README가
 *      **아무 검사도 받지 않았다.** 문서를 옮기면 조용히 깨지고 CI는 초록이었다.
 *   2. `check-env-docs`가 정본 문서를 못 찾으면 경고만 찍고 `exit(0)`이었다. 경로가 어긋나면
 *      **검사가 꺼진 채 CI가 초록**이 된다 — 하드 실패보다 나쁘다.
 *   3. E2E hydration 가드의 첫 버전은 결함이 살아 있는데도 통과했다(dev 모드가 오류를 삼킴).
 *
 * 공통 교훈: **통과하는 것만 확인한 가드는 가드가 아니다.** red를 먼저 봐야 한다.
 * 이 스크립트는 그 확인을 사람 기억이 아니라 CI에 맡긴다.
 *
 * ## 원칙 — 무효화될 수 있는 검사는 fail-closed여야 한다
 *
 *   - 검사 대상이 0건이면 → 실패
 *   - 정본 파일이 없으면 → 실패 (건너뛰기 금지)
 *
 * 사용: pnpm exec tsx scripts/check-guards-selftest.ts
 */

import { execFileSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";

const ROOT = path.resolve(__dirname, "..");

interface Case {
  readonly name: string;
  /** 결함을 심는다. 원복 함수를 돌려준다. */
  readonly inject: () => () => void;
  readonly script: string;
  /** 실패 메시지에 반드시 포함돼야 하는 문구 */
  readonly expect: string;
}

/** `__eslint__`는 스크립트가 아니라 lint 실행을 뜻한다 — 커스텀 룰도 결함에 반응해야 한다. */
function runScript(script: string): { code: number; output: string } {
  const argv = script === "__eslint__" ? ["eslint"] : ["tsx", script];

  try {
    const output = execFileSync("npx", argv, {
      cwd: ROOT,
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "pipe"],
      shell: process.platform === "win32",
    });
    return { code: 0, output };
  } catch (err) {
    const e = err as { status?: number; stdout?: string; stderr?: string };
    return { code: e.status ?? 1, output: `${e.stdout ?? ""}${e.stderr ?? ""}` };
  }
}

/**
 * 파일을 임시로 옮겼다가 되돌린다.
 *
 * 이동 대상은 **저장소 안**이어야 한다 — OS 임시 디렉터리가 다른 드라이브에 있으면
 * `rename`이 EXDEV로 실패한다(Windows에서 저장소가 F:, temp가 C:인 경우 실증).
 */
function temporarilyMove(relPath: string): () => void {
  const src = path.join(ROOT, relPath);
  const stashDir = path.join(ROOT, "node_modules", ".cache", "guard-selftest");
  fs.mkdirSync(stashDir, { recursive: true });
  const stash = path.join(stashDir, `${path.basename(relPath)}-${process.pid}`);
  fs.renameSync(src, stash);
  return () => fs.renameSync(stash, src);
}

/** 파일 내용을 임시로 바꿨다가 되돌린다. */
function temporarilyPatch(relPath: string, transform: (s: string) => string): () => void {
  const target = path.join(ROOT, relPath);
  const original = fs.readFileSync(target, "utf-8");
  fs.writeFileSync(target, transform(original));
  return () => fs.writeFileSync(target, original);
}

const CASES: readonly Case[] = [
  {
    name: "check-env-docs: 정본 문서가 없으면 실패해야 한다 (조용한 통과 금지)",
    inject: () => temporarilyMove("docs/operations/env-variables.md"),
    script: "scripts/check-env-docs.ts",
    expect: "정본 문서를 찾을 수 없습니다",
  },
  {
    name: "check-doc-links: 깨진 링크를 잡아야 한다",
    inject: () =>
      temporarilyPatch("docs/README.md", (s) =>
        `${s}\n\n[셀프테스트용 깨진 링크](./__guard-selftest-missing__.md)\n`,
      ),
    script: "scripts/check-doc-links.ts",
    expect: "__guard-selftest-missing__",
  },
  {
    name: "check-doc-links: CLAUDE.md도 검사 범위여야 한다 (docs/ 밖 회귀 방지)",
    inject: () =>
      temporarilyPatch("CLAUDE.md", (s) =>
        `${s}\n\n[셀프테스트용 깨진 링크](docs/__guard-selftest-claudemd__.md)\n`,
      ),
    script: "scripts/check-doc-links.ts",
    expect: "__guard-selftest-claudemd__",
  },
  {
    name: "check-doc-links: 코드가 가리키는 문서 경로가 깨져도 잡아야 한다 (문서 이동 사고 방지)",
    inject: () =>
      temporarilyPatch("scripts/sync-test-count.ts", (s) =>
        s.replace('"docs", "tests", "unit-testing.md"', '"docs", "__guard-selftest-moved__", "unit-testing.md"'),
      ),
    script: "scripts/check-doc-links.ts",
    expect: "__guard-selftest-moved__",
  },
  {
    name: "check-doc-links: 주석이 가리키는 문서 경로가 깨져도 잡아야 한다 (길잡이 주석 rot 방지)",
    inject: () =>
      temporarilyPatch("src/lib/storage/card-style.ts", (s) =>
        s.replace("plans/archive/2026-06-26-", "plans/__guard-selftest-comment__/2026-06-26-"),
      ),
    script: "scripts/check-doc-links.ts",
    expect: "__guard-selftest-comment__",
  },
  {
    name: "check-doc-links: 활성 설계(superpowers/specs)도 검사 범위여야 한다 (제외 비대칭 회귀 방지)",
    inject: () =>
      temporarilyPatch("docs/superpowers/specs/2026-06-23-anon-session-claim-design.md", (s) =>
        `${s}\n\n[셀프테스트용 깨진 링크](./__guard-selftest-activespec__.md)\n`,
      ),
    script: "scripts/check-doc-links.ts",
    expect: "__guard-selftest-activespec__",
  },
  {
    name: "check-doc-links: docs/README.md 인벤토리에서 빠진 문서를 잡아야 한다 (지도 드리프트 방지)",
    inject: () =>
      temporarilyPatch("docs/README.md", (s) => s.replace(/^.*e2e-incidents\.md.*\r?\n/m, "")),
    script: "scripts/check-doc-links.ts",
    expect: "e2e-incidents.md",
  },
  {
    name: "check-workflow-artifacts: Playwright 리포트가 if:failure()로 되돌아가면 실패해야 한다",
    inject: () =>
      temporarilyPatch(".github/workflows/deploy.yml", (s) =>
        s.replace(
          /(- uses: actions\/upload-artifact@v4\r?\n\s*)if: always\(\)(\r?\n\s*with:\r?\n\s*name: playwright-report)/,
          "$1if: failure()$2",
        ),
      ),
    script: "scripts/check-workflow-artifacts.ts",
    expect: "if: failure()",
  },
  {
    name: "check-workflow-env-parity: weekly-qa에서 빌드 변수가 빠지면 실패해야 한다",
    inject: () =>
      temporarilyPatch(".github/workflows/weekly-qa.yml", (s) =>
        s.replace(/^.*NEXT_PUBLIC_CHARACTER_VARIANTS.*\r?\n/m, ""),
      ),
    script: "scripts/check-workflow-env-parity.ts",
    expect: "NEXT_PUBLIC_CHARACTER_VARIANTS",
  },
  {
    // 2026-07-29 사고 유형: e2e 잡에는 있는데 build 잡에 빠져 번들에 반영되지 않았다.
    // 파일 단위로 비교하면 다른 잡에 남아 있다는 이유로 통과해 버린다 — 블록 단위여야 한다.
    name: "check-workflow-env-parity: 잡 하나에서만 빠져도 잡아야 한다 (파일 단위 비교 회귀 방지)",
    inject: () =>
      temporarilyPatch(".github/workflows/deploy.yml", (s) =>
        s.replace(/^.*NEXT_PUBLIC_CHARACTER_VARIANTS.*\r?\n/m, ""),
      ),
    script: "scripts/check-workflow-env-parity.ts",
    expect: "deploy.yml",
  },
  {
    // 5초를 의도한 대기가 93초를 태운 만성 flake의 원인. 옵션이 2번째 인자에 있으면
    // `arg`로 먹혀 타임아웃이 아예 걸리지 않는다 — 타입도 lint 기본 규칙도 못 잡는다.
    name: "eslint: waitForFunction 옵션이 2번째 인자면 잡아야 한다 (타임아웃 무시 회귀 방지)",
    inject: () =>
      temporarilyPatch("e2e/navigation.spec.ts", (s) =>
        s.replace(
          "window.scrollY > 0, undefined, { timeout: 3_000 }",
          "window.scrollY > 0, { timeout: 3_000 }",
        ),
      ),
    script: "__eslint__",
    expect: "no-waitforfunction-options-as-arg",
  },
  {
    // ⚠️ 이 가짜 PNG는 변형(webp)도 없어서 **변형 검사만으로도** exit≠0이 된다.
    // 파일명만 기대하면 치수 검사가 죽어도 통과하므로, 치수 위반 문구를 기대해 원인을 고정한다.
    name: "check-character-image-budget: 치수가 다른 마스터를 잡아야 한다",
    inject: () => createBogusPng("public/images/characters/arcana/nukki-enhanced/__selftest__.png"),
    script: "scripts/check-character-image-budget.ts",
    expect: "기대 2816×1536",
  },
  {
    name: "check-character-image-budget: 사전 생성 변형이 빠지면 잡아야 한다 (프로덕션 404 방지)",
    // 세션에서만 쓰는 mood를 고른다 — 홈 E2E에 걸리지 않는 사각이라 이 가드가 유일한 방어선이다.
    inject: () => temporarilyMove("public/images/characters/rei/nukki-enhanced/mystical-960.webp"),
    script: "scripts/check-character-image-budget.ts",
    expect: "mystical-960.webp",
  },
  {
    name: "check-character-image-budget: 필수 표정 마스터가 없으면 잡아야 한다",
    inject: () => temporarilyMove("public/images/characters/haru/nukki-enhanced/wink.png"),
    script: "scripts/check-character-image-budget.ts",
    expect: "wink.png",
  },
];

/** IHDR만 유효한 최소 PNG를 만든다 — 가드는 헤더만 읽으므로 이걸로 치수 위반을 재현할 수 있다. */
function createBogusPng(relPath: string): () => void {
  const target = path.join(ROOT, relPath);
  const buf = Buffer.alloc(24);
  buf.writeUInt32BE(0x89504e47, 0); // PNG 시그니처 앞 4바이트
  buf.writeUInt32BE(0x0d0a1a0a, 4);
  buf.writeUInt32BE(13, 8); // IHDR 길이
  buf.write("IHDR", 12, "ascii");
  buf.writeUInt32BE(1234, 16); // 기대 2816과 다른 폭
  buf.writeUInt32BE(567, 20); // 기대 1536과 다른 높이
  fs.writeFileSync(target, buf);
  return () => fs.unlinkSync(target);
}

function main(): void {
  const failures: string[] = [];

  for (const c of CASES) {
    const restore = c.inject();
    try {
      const { code, output } = runScript(c.script);
      if (code === 0) {
        failures.push(`${c.name}\n    → 결함을 심었는데 **통과했다**(exit 0). 이 가드는 무력하다.`);
      } else if (!output.includes(c.expect)) {
        failures.push(
          `${c.name}\n    → 실패는 했으나 기대 문구가 없다: "${c.expect}"\n    실제 출력: ${output.slice(0, 300)}`,
        );
      } else {
        console.log(`  ✓ ${c.name}`);
      }
    } finally {
      restore();
    }
  }

  // 원복이 정확한지 확인 — 셀프테스트가 저장소를 더럽히면 안 된다.
  const clean = runScript("scripts/check-doc-links.ts");
  if (clean.code !== 0) {
    failures.push(
      `원복 검증 실패 — 셀프테스트 후 check-doc-links가 실패한다. 저장소 상태를 확인하라.\n${clean.output.slice(0, 300)}`,
    );
  }

  if (failures.length > 0) {
    console.error(`\n[check-guards-selftest] ${failures.length}건 실패:\n`);
    for (const f of failures) console.error(`  ✗ ${f}\n`);
    console.error("  가드가 결함을 잡지 못하면 그것은 가드가 아니라 장식이다.");
    process.exit(1);
  }

  console.log(`\n[check-guards-selftest] 검사 통과. ${CASES.length}개 가드가 결함에 실제로 반응한다.`);
}

main();
