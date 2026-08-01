/**
 * `deploy.yml`이 설정하는 `NEXT_PUBLIC_*` 변수를 `weekly-qa.yml`도 **같은 값으로** 설정하는지 검증한다.
 *
 * ## 왜 필요한가 — 이미 한 번 새어나갔다
 *
 * `NEXT_PUBLIC_*`는 **빌드 타임에 인라인**된다. 두 워크플로우가 각자 빌드하므로, 한쪽에만
 * 설정된 변수가 있으면 **서로 다른 앱을 테스트**하게 된다. 런타임 설정으로는 만회할 수 없다.
 *
 * 2026-08-01 실측: 사전 생성 변형을 도입한 #533 머지 커밋(`01eeadd`)에서 돌아간 주간 QA 런
 * (30675500705)은 `NEXT_PUBLIC_CHARACTER_VARIANTS`가 없어 **변형 OFF로 빌드·테스트**하고
 * success로 끝났다. 즉 프로덕션이 쓰는 이미지 파이프라인은 주간 QA에서 **한 번도 검증되지 않았다.**
 *
 * 하필 `weekly-qa.yml`은 **Mobile iOS(webkit)를 테스트하는 유일한 워크플로우**다
 * (`deploy.yml` 매트릭스는 Desktop Chrome·Mobile Android 2종뿐). 그래서 이 드리프트는
 * "주간 QA가 조금 다르다"가 아니라 **webkit이 프로덕션 경로를 전혀 안 탄다**는 뜻이었다.
 *
 * ## 규칙
 *
 * `weekly-qa.yml` ⊇ `deploy.yml` (NEXT_PUBLIC_ 키 집합, 값까지 일치).
 * 반대 방향은 검사하지 않는다 — 주간 QA에만 있는 변수는 정당할 수 있다.
 *
 * 두 워크플로우가 모든 면에서 같아야 한다는 뜻은 **아니다.** 주간 QA에는 샤딩·`E2E_WORKERS`·
 * 자원 계측이 없고 그건 의도된 차이다. 여기서 강제하는 것은 **빌드 산출물을 가르는 변수**뿐이다.
 *
 * ## fail-closed
 *
 * 파일이 없거나, 스캔 결과 `deploy.yml`에서 키를 하나도 못 찾으면 **실패**한다.
 * 조용히 통과하는 검사는 없느니만 못하다(`check-env-docs`가 정확히 그 방식으로 무력했다).
 *
 * 사용: pnpm check:workflow-env-parity
 */

import * as fs from "node:fs";
import * as path from "node:path";

const ROOT = path.resolve(__dirname, "..");
const SOURCE = path.join(ROOT, ".github", "workflows", "deploy.yml");
const TARGET = path.join(ROOT, ".github", "workflows", "weekly-qa.yml");

/** `          NEXT_PUBLIC_FOO: bar` 형태에서 키와 값을 뽑는다. 주석 줄은 건너뛴다. */
const ENV_LINE = /^\s+(NEXT_PUBLIC_[A-Z0-9_]+):\s*(.+?)\s*$/;

interface EnvBlock {
  readonly file: string;
  /** `env:` 가 있는 줄 번호(1-based) */
  readonly line: number;
  readonly vars: Map<string, string>;
}

/**
 * `env:` 블록 단위로 수집한다. **파일 단위로 모으면 안 된다** — 실제 사고는
 * "e2e 잡에는 설정했는데 build 잡에 빠뜨림"이었고(2026-07-29, 카드 이미지 3.5주 404),
 * 파일 단위 집합 비교는 그 경우 한쪽 잡에 남아 있다는 이유로 **통과해 버린다**.
 */
function collectBlocks(file: string): EnvBlock[] {
  const lines = fs.readFileSync(file, "utf-8").split(/\r?\n/);
  const blocks: EnvBlock[] = [];
  let current: { line: number; indent: number; vars: Map<string, string> } | null = null;

  lines.forEach((line, i) => {
    if (/^\s+env:\s*$/.test(line)) {
      current = { line: i + 1, indent: line.match(/^\s*/)![0].length, vars: new Map() };
      blocks.push({ file, line: current.line, vars: current.vars });
      return;
    }
    if (!current) return;
    if (/^\s*#/.test(line) || line.trim() === "") return;

    // 들여쓰기가 env: 이하로 돌아오면 블록이 끝난 것이다.
    const indent = line.match(/^\s*/)![0].length;
    if (indent <= current.indent) {
      current = null;
      return;
    }
    const m = ENV_LINE.exec(line);
    if (m) current.vars.set(m[1], m[2]);
  });

  return blocks.filter((b) => b.vars.size > 0);
}

function main(): void {
  for (const f of [SOURCE, TARGET]) {
    if (!fs.existsSync(f)) {
      console.error(
        `[check-workflow-env-parity] 워크플로우 파일을 찾을 수 없습니다: ${path.relative(ROOT, f)}\n` +
          "  파일을 옮겼다면 이 스크립트의 경로도 같은 커밋에서 갱신하세요.",
      );
      process.exit(1);
    }
  }

  const blocks = [...collectBlocks(SOURCE), ...collectBlocks(TARGET)];

  // 스캔이 깨졌는데 초록으로 통과하는 것이 가장 나쁜 실패다.
  if (collectBlocks(SOURCE).length === 0) {
    console.error(
      "[check-workflow-env-parity] deploy.yml에서 NEXT_PUBLIC_ 변수를 가진 env 블록을 찾지 못했습니다.\n" +
        "  형식이 바뀌었다면 이 스크립트의 파싱 규칙을 갱신하세요(검사가 꺼진 채 통과하면 안 됩니다).",
    );
    process.exit(1);
  }

  // 정본 집합 = 두 워크플로우가 쓰는 NEXT_PUBLIC_ 키의 합집합.
  // NEXT_PUBLIC_ 을 **하나라도** 쓰는 블록은 빌드 산출물을 결정하는 블록이므로 전부 가져야 한다.
  const canonical = new Map<string, string>();
  const conflicts: string[] = [];
  for (const b of blocks) {
    for (const [k, v] of b.vars) {
      const known = canonical.get(k);
      if (known === undefined) canonical.set(k, v);
      else if (known !== v) {
        conflicts.push(`${k}: "${known}" ↔ "${v}" (${path.basename(b.file)}:${b.line})`);
      }
    }
  }

  const incomplete: string[] = [];
  for (const b of blocks) {
    const missing = [...canonical.keys()].filter((k) => !b.vars.has(k));
    if (missing.length > 0) {
      incomplete.push(
        `${path.relative(ROOT, b.file).replaceAll("\\", "/")}:${b.line} — 누락 ${missing.join(", ")}`,
      );
    }
  }

  if (incomplete.length === 0 && conflicts.length === 0) {
    console.log(
      `[check-workflow-env-parity] 검사 통과. env 블록 ${blocks.length}개가 ` +
        `NEXT_PUBLIC_ 변수 ${canonical.size}종을 동일하게 설정합니다.`,
    );
    return;
  }

  console.error("[check-workflow-env-parity] 워크플로우 간 빌드 변수 불일치:");
  if (incomplete.length > 0) {
    console.error(`\n  변수가 빠진 env 블록 ${incomplete.length}건:`);
    for (const m of incomplete) console.error(`    - ${m}`);
  }
  if (conflicts.length > 0) {
    console.error(`\n  값이 갈리는 변수 ${conflicts.length}건:`);
    for (const m of conflicts) console.error(`    - ${m}`);
  }
  console.error(
    "\n  NEXT_PUBLIC_ 은 **빌드 타임에 인라인**됩니다 — 잡 하나에만 설정하면 그 잡이 만든\n" +
      "  번들에는 반영되지 않습니다(2026-07-29: e2e 잡에만 설정해 카드 이미지가 3.5주간 404).\n" +
      "  또한 weekly-qa.yml은 Mobile iOS를 검증하는 유일한 워크플로우라, 값이 갈리면\n" +
      "  webkit이 프로덕션 경로를 전혀 타지 않게 됩니다.",
  );
  process.exit(1);
}

main();
