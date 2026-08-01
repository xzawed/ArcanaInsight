/**
 * src/lib/env.ts의 환경변수 getter와 docs/operations/env-variables.md 정합성 검증.
 *
 * 사용법:
 *   pnpm exec tsx scripts/check-env-docs.ts          # 검사 (불일치 시 exit 1)
 *
 * docs/operations/env-variables.md가 존재하지 않으면 **실패(exit 1)** 한다. 예전에는 exit 0으로
 * 건너뛰었는데, 문서를 옮기면 검사가 꺼진 채 CI가 초록이 되는 구멍이었다(#529).
 */

import * as fs from "node:fs";
import * as path from "node:path";

const ROOT = path.resolve(__dirname, "..");
const ENV_TS = path.join(ROOT, "src/lib/env.ts");
const ENV_DOCS = path.join(ROOT, "docs/operations/env-variables.md");

function extractEnvVarsFromTs(content: string): string[] {
  // process.env.VAR_NAME 패턴 추출
  const matches = [...content.matchAll(/process\.env\.([A-Z_][A-Z0-9_]*)/g)];
  return [...new Set(matches.map((m) => m[1]))].sort();
}

function extractEnvVarsFromDocs(content: string): string[] {
  // 마크다운 코드블록 내 VAR_NAME= 또는 `VAR_NAME` 패턴 추출
  const matches = [...content.matchAll(/\b([A-Z_][A-Z0-9_]{3,})\b(?:\s*=|\s*`)/g)];
  return [...new Set(matches.map((m) => m[1]))].sort();
}

if (!fs.existsSync(ENV_DOCS)) {
  // 예전에는 여기서 exit(0)이었다 — 문서 작성 전이라 건너뛰려던 임시 조치였는데,
  // 문서가 생긴 뒤에도 남아 **경로가 어긋나면 검사가 조용히 꺼지고 CI는 초록**이 되는
  // 구멍이 됐다. 파일이 없다는 것은 이제 정상 상태가 아니므로 실패로 취급한다.
  console.error(
    `[check-env-docs] 정본 문서를 찾을 수 없습니다: ${path.relative(ROOT, ENV_DOCS)}\n` +
    "  문서를 옮겼다면 이 스크립트의 ENV_DOCS 경로를 같은 커밋에서 함께 갱신하세요."
  );
  process.exit(1);
}

const envTsContent = fs.readFileSync(ENV_TS, "utf-8");
const envDocsContent = fs.readFileSync(ENV_DOCS, "utf-8");

const fromCode = extractEnvVarsFromTs(envTsContent);
const fromDocs = extractEnvVarsFromDocs(envDocsContent);

const missingInDocs = fromCode.filter((v) => !fromDocs.includes(v));
const unknownInCode = fromDocs.filter((v) => !fromCode.includes(v));

let hasError = false;

if (missingInDocs.length > 0) {
  console.error(
    `[check-env-docs] 코드에 있으나 문서에 없는 변수 (${missingInDocs.length}개):\n` +
    missingInDocs.map((v) => `  - ${v}`).join("\n")
  );
  hasError = true;
}

if (unknownInCode.length > 0) {
  // 경고만 — 문서에 예시/선택 변수가 있을 수 있음
  console.warn(
    `[check-env-docs] 문서에 있으나 코드에서 못 찾은 변수 (${unknownInCode.length}개, 경고만):\n` +
    unknownInCode.map((v) => `  ~ ${v}`).join("\n")
  );
}

if (!hasError) {
  console.log(`[check-env-docs] 검사 통과. 코드 변수 ${fromCode.length}개 모두 문서에 존재.`);
}

process.exit(hasError ? 1 : 0);
