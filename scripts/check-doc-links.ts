/**
 * docs/**\/*.md 파일 내 상대 링크 및 코드 경로 참조의 존재성 검증.
 *
 * 사용법:
 *   pnpm exec tsx scripts/check-doc-links.ts          # 검사 (깨진 링크 시 exit 1)
 *
 * PR-1 단계에서는 docs/ 구조가 완성되지 않아 "파일 미존재" 경고가 많이 나옴.
 * PR-5에서 docs/ 구조 완성 후 enforce 전환.
 */

import * as fs from "node:fs";
import * as path from "node:path";

const ROOT = path.resolve(__dirname, "..");
const DOCS_DIR = path.join(ROOT, "docs");

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

const markdownFiles = getAllMarkdownFiles(DOCS_DIR);

if (markdownFiles.length === 0) {
  console.log("[check-doc-links] docs/ 아래 마크다운 파일 없음. 건너뜀.");
  process.exit(0);
}

const allBroken: BrokenLink[] = [];
for (const f of markdownFiles) {
  allBroken.push(...checkLinks(f));
}

if (allBroken.length === 0) {
  console.log(`[check-doc-links] 검사 통과. ${markdownFiles.length}개 파일, 깨진 링크 없음.`);
  process.exit(0);
}

// PR-1~4 기간에는 경고만 출력 (exit 0). PR-5에서 아래를 exit(1)로 변경.
console.warn(`[check-doc-links] 깨진 링크 ${allBroken.length}개 발견 (현재 경고만):`);
for (const b of allBroken) {
  console.warn(`  ${b.file}:${b.line} → [${b.text}](${b.target})`);
}
console.warn(
  "\n  [check-doc-links] PR-5에서 docs/ 구조 완성 후 이 경고를 오류로 전환 예정."
);
process.exit(0);
