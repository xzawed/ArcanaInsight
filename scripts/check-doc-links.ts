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
 * ## 제외 대상 (EXCLUDED_DIRS)
 *
 * `docs/superpowers/plans/archive/`·`docs/superpowers/specs/`는 과거 설계·계획을 그대로 보존하는
 * 동결 스냅샷이라 링크 rot이 예상되며 손대지 않는다. 살아있는 정본만 검사해 신호를 유지한다.
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

// 동결 스냅샷 디렉터리 — 링크 검사에서 제외 (본문 편집 금지 대상)
const EXCLUDED_DIRS = [
  path.join(DOCS_DIR, "superpowers", "plans", "archive"),
  path.join(DOCS_DIR, "superpowers", "specs"),
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

const allBroken: BrokenLink[] = [];
for (const f of markdownFiles) {
  allBroken.push(...checkLinks(f));
}

if (allBroken.length === 0) {
  console.log(`[check-doc-links] 검사 통과. ${markdownFiles.length}개 파일, 깨진 링크 없음.`);
  process.exit(0);
}

console.error(`[check-doc-links] 깨진 링크 ${allBroken.length}개 발견:`);
for (const b of allBroken) {
  console.error(`  ${b.file}:${b.line} → [${b.text}](${b.target})`);
}
console.error(
  "\n  [check-doc-links] 정본 문서의 링크를 수정하거나, 대상이 이동했으면 경로를 갱신하세요."
);
process.exit(1);
