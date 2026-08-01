/**
 * 마크다운 링크의 대상 존재성 검증. 깨진 링크가 있으면 exit 1.
 *
 * 사용법:
 *   pnpm exec tsx scripts/check-doc-links.ts
 *
 * 링크는 마크다운 표준대로 "파일 위치 기준 상대경로"로 해석한다.
 *
 * ## 검사 범위 (SCAN_TARGETS)
 *
 * `docs/` 뿐 아니라 **에이전트·사람이 실제로 진입하는 문서**까지 검사한다.
 * 이전에는 `docs/` 안만 봤는데, 정작 링크가 가장 많고 세션마다 읽히는 `CLAUDE.md`(25곳)와
 * `.claude/rules|agents|skills`, 루트 `README*.md`는 아무도 검사하지 않았다. 문서를 옮기면
 * 이 경로들이 조용히 깨지고, 링크 검사는 초록으로 통과한다.
 *
 * ## 제외 대상 (EXCLUDED_DIRS) — `archive` 디렉터리만 제외한다
 *
 * 제외 기준은 "superpowers 아래냐"가 아니라 **"동결된 아카이브냐"** 다.
 * `plans/archive/`·`specs/archive/`는 과거 설계를 그대로 보존하는 동결 스냅샷이라
 * 링크 rot이 예상되며 손대지 않는다.
 *
 * ⚠️ 예전에는 `specs/` **트리 전체**를 제외했는데 이는 비대칭이자 구멍이었다.
 * `plans/`는 `archive/`만 제외하면서 `specs/`는 활성까지 제외해, CLAUDE.md·known-issues가
 * "설계 정본"이라 부르며 링크하는 **활성 설계 7건이 아무 검사도 받지 않았다.**
 * 살아있는 문서가 가리키는 대상은 살아있는 문서로 취급해 검사한다.
 */

import * as fs from "node:fs";
import * as path from "node:path";

const ROOT = path.resolve(__dirname, "..");
const DOCS_DIR = path.join(ROOT, "docs");

/** 검사 대상 — 디렉터리(재귀) 또는 단일 파일 */
const SCAN_TARGETS = [
  DOCS_DIR,
  path.join(ROOT, ".claude"),
  path.join(ROOT, "e2e"),
  path.join(ROOT, "CLAUDE.md"),
  path.join(ROOT, "README.md"),
  path.join(ROOT, "README.en.md"),
];

// 동결 스냅샷 디렉터리 — 링크 검사에서 제외 (본문 편집 금지 대상).
// `archive/` 만 제외한다 — 활성 설계·계획은 살아있는 문서가 링크하므로 검사 대상이다.
const EXCLUDED_DIRS = [
  path.join(DOCS_DIR, "superpowers", "plans", "archive"),
  path.join(DOCS_DIR, "superpowers", "specs", "archive"),
];

function isExcluded(dir: string): boolean {
  return EXCLUDED_DIRS.some((ex) => dir === ex || dir.startsWith(ex + path.sep));
}

interface BrokenLink {
  file: string;
  line: number;
  text: string;
  target: string;
}

function getAllMarkdownFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (isExcluded(full)) continue;
      results.push(...getAllMarkdownFiles(full));
    } else if (entry.name.endsWith(".md")) {
      results.push(full);
    }
  }
  return results;
}

function checkLinks(filePath: string): BrokenLink[] {
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n");
  const broken: BrokenLink[] = [];
  const fileDir = path.dirname(filePath);

  for (let i = 0; i < lines.length; i++) {
    // 마크다운 링크: [text](path) — 상대경로만 검사 (http/https/# 제외)
    const linkMatches = [...lines[i].matchAll(/\[([^\]]*)\]\(([^)]+)\)/g)];
    for (const m of linkMatches) {
      const target = m[2].split("#")[0]; // 앵커 제거
      if (!target || target.startsWith("http") || target.startsWith("https")) continue;

      const resolved = path.resolve(fileDir, target);
      if (!fs.existsSync(resolved)) {
        broken.push({
          file: path.relative(ROOT, filePath),
          line: i + 1,
          text: m[1],
          target: m[2],
        });
      }
    }
  }
  return broken;
}

const markdownFiles = SCAN_TARGETS.flatMap((target) => {
  if (!fs.existsSync(target)) return [];
  return fs.statSync(target).isDirectory()
    ? getAllMarkdownFiles(target)
    : [target];
});

if (markdownFiles.length === 0) {
  console.error("[check-doc-links] 검사 대상 마크다운이 하나도 없습니다. 경로 설정을 확인하세요.");
  process.exit(1);
}

// 범위 축소 방어 — 이 검사는 원래 docs/ 안만 봤고, 그래서 링크가 가장 많은 CLAUDE.md와
// .claude/**·루트 README가 무검사 상태였다. SCAN_TARGETS가 다시 줄어들면 조용히 통과하는
// 상태로 되돌아가므로, **반드시 검사돼야 하는 파일**을 명시해 회귀를 실패로 만든다.
const REQUIRED_SCANNED = ["CLAUDE.md", "README.md"];
const missingRequired = REQUIRED_SCANNED.filter(
  (rel) => !markdownFiles.includes(path.join(ROOT, rel)),
);
if (missingRequired.length > 0) {
  console.error(
    `[check-doc-links] 필수 검사 대상이 범위에서 빠졌습니다: ${missingRequired.join(", ")}\n` +
    "  SCAN_TARGETS를 줄이면 이 파일들의 링크가 무검사 상태가 됩니다(과거 회귀 사례).",
  );
  process.exit(1);
}

const allBroken: BrokenLink[] = [];
for (const f of markdownFiles) {
  allBroken.push(...checkLinks(f));
}

// ── 코드 안의 문서 경로도 검사한다 ───────────────────────────────────────────
// 마크다운 링크만 보면 **스크립트가 하드코딩한 문서 경로**를 놓친다. 2026-08-01,
// docs/workflow/ → docs/tests/ 이동 후 sync-test-count.ts가 존재하지 않는 파일을
// 가리키고 있었는데 링크 검사는 초록이었다. 같은 사고를 막는다.
//
// 주석도 검사한다. 예전에는 "설명용 참조가 많다"는 이유로 주석을 건너뛰었는데, 정작
// `// 설계: docs/...` 같은 주석은 **사람과 에이전트가 따라가는 길잡이**다. 2026-08-01,
// 문서가 archive/로 이동한 뒤에도 4개 파일이 이동 전 경로를 가리키고 있었고 검사는 초록이었다.
const CODE_DIRS = [path.join(ROOT, "scripts"), path.join(ROOT, "src")];
const DOC_PATH_RE = /["'`](docs\/[A-Za-z0-9._/-]+\.md)["'`]/g;
/**
 * 주석 안의 따옴표 없는 경로 — `설계: docs/…/foo.md`·`[텍스트](docs/…/foo.md)` 형태.
 * 따옴표로 감싼 경로는 DOC_PATH_RE가 담당하므로 여기서는 제외한다(중복 보고 방지).
 */
const DOC_BARE_RE = /(?<!["'`])\b(docs\/[A-Za-z0-9._/-]+\.md)\b/g;
/** `path.join(ROOT, "docs", "tests", "unit-testing.md")` 형태 */
const DOC_JOIN_RE = /path\.join\([^)]*?"docs"\s*,\s*((?:"[^"]+"\s*,\s*)*"[^"]+\.md")\s*\)/g;

function collectCodeFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...collectCodeFiles(full));
    else if (/\.(ts|mjs|js)$/.test(entry.name)) out.push(full);
  }
  return out;
}

for (const file of CODE_DIRS.flatMap(collectCodeFiles)) {
  const lines = fs.readFileSync(file, "utf-8").split("\n");
  for (let i = 0; i < lines.length; i++) {
    const isComment = /^\s*(\*|\/\/)/.test(lines[i]);

    // 주석 안의 따옴표 없는 문서 경로 — 길잡이로 쓰이므로 실재해야 한다.
    if (isComment) {
      for (const m of lines[i].matchAll(DOC_BARE_RE)) {
        if (!fs.existsSync(path.join(ROOT, m[1]))) {
          allBroken.push({ file: path.relative(ROOT, file), line: i + 1, text: "주석이 가리키는 문서", target: m[1] });
        }
      }
    }

    for (const m of lines[i].matchAll(DOC_PATH_RE)) {
      if (!fs.existsSync(path.join(ROOT, m[1]))) {
        allBroken.push({ file: path.relative(ROOT, file), line: i + 1, text: "코드 내 문서 경로", target: m[1] });
      }
    }
    for (const m of lines[i].matchAll(DOC_JOIN_RE)) {
      const rel = path.join("docs", ...m[1].split(",").map((s) => s.trim().replace(/^"|"$/g, "")));
      if (!fs.existsSync(path.join(ROOT, rel))) {
        allBroken.push({ file: path.relative(ROOT, file), line: i + 1, text: "코드 내 문서 경로", target: rel.replaceAll("\\", "/") });
      }
    }
  }
}

// ── docs/README.md 인벤토리 트리가 실제 파일과 맞는지 검사한다 ─────────────────
// 이 트리는 에이전트가 "어떤 문서가 있는지" 판단하는 지도다. 어긋나면 존재하는 정본을
// 못 찾거나 없는 문서를 찾는다. 2026-08-01 실측: 트리가 활성 설계 수를 20으로 적어뒀는데
// 실제는 7이었다(3배 차이). 수치는 문서에서 제거했고, 파일 목록은 여기서 강제한다.
const INVENTORY_DOC = path.join(DOCS_DIR, "README.md");
const inventoryMissing: string[] = [];

/**
 * docs/README.md의 ASCII 트리를 실제로 파싱해 나열된 경로 집합을 만든다.
 *
 * 파일명 substring 검색으로는 부족하다 — `README.md`처럼 여러 폴더에 같은 이름이 있으면
 * 한 곳만 지워도 다른 줄 덕분에 통과하고, 트리 밖 산문에 이름이 있어도 통과한다.
 * 들여쓰기로 깊이를 계산해 **폴더 경로까지 포함한 집합**을 만들어야 가드가 실제로 문다.
 */
function parseInventoryTree(markdown: string): Set<string> {
  const fence = /```text\r?\n([\s\S]*?)```/.exec(markdown);
  const listed = new Set<string>();
  if (!fence) return listed;

  const stack: string[] = [];
  for (const line of fence[1].split(/\r?\n/)) {
    const m = /^((?:[│|]\s{3}|\s{4})*)(?:├──|└──)\s+(\S+)/.exec(line);
    if (!m) continue;
    const depth = m[1].length / 4;
    const name = m[2];
    if (name.endsWith("/")) {
      stack.length = depth;
      stack[depth] = name.slice(0, -1);
    } else {
      listed.add([...stack.slice(0, depth), name].join("/"));
    }
  }
  return listed;
}

if (fs.existsSync(INVENTORY_DOC)) {
  const listed = parseInventoryTree(fs.readFileSync(INVENTORY_DOC, "utf-8"));
  // superpowers는 개별 파일을 나열하지 않는다(동결 보관소) — 트리도 디렉터리까지만 적는다.
  const tracked = getAllMarkdownFiles(DOCS_DIR).filter((f) => {
    const rel = path.relative(DOCS_DIR, f).replaceAll("\\", "/");
    return !rel.startsWith("superpowers/");
  });
  for (const f of tracked) {
    const rel = path.relative(DOCS_DIR, f).replaceAll("\\", "/");
    if (!listed.has(rel)) inventoryMissing.push(`docs/${rel}`);
  }
}

if (allBroken.length === 0 && inventoryMissing.length === 0) {
  console.log(`[check-doc-links] 검사 통과. ${markdownFiles.length}개 파일, 깨진 링크 없음.`);
  process.exit(0);
}

if (inventoryMissing.length > 0) {
  console.error(
    `[check-doc-links] docs/README.md 인벤토리에 없는 문서 ${inventoryMissing.length}개:\n` +
    inventoryMissing.map((f) => `  - ${f}`).join("\n") +
    "\n  문서를 추가·이동했다면 docs/README.md의 구조 트리도 같은 커밋에서 갱신하세요.",
  );
  if (allBroken.length === 0) process.exit(1);
}

console.error(`[check-doc-links] 깨진 링크 ${allBroken.length}개 발견:`);
for (const b of allBroken) {
  console.error(`  ${b.file}:${b.line} → [${b.text}](${b.target})`);
}
console.error(
  "\n  [check-doc-links] 정본 문서의 링크를 수정하거나, 대상이 이동했으면 경로를 갱신하세요."
);
process.exit(1);
