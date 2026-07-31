/**
 * 캐릭터 마스터 이미지의 **치수 고정**과 **용량 상한**을 강제한다.
 *
 * ## 이 가드가 하는 일과 하지 않는 일
 *
 * `nukki-enhanced/*.png`가 2816×1536·수 MB인 것은 **의도된 2x 고DPI 마스터**다
 * (`docs/conventions/image-assets.md`). 이 가드는 그걸 부정하지 않는다.
 *
 * 대신 두 가지 회귀만 막는다.
 *   1. **치수 드리프트** — 재출력 과정에서 크기가 바뀌면 `sizes` 계산과 변형 파이프라인 전제가 깨진다.
 *   2. **용량 폭주** — 현재 최댓값 약 5.2MB. 무압축 재출력으로 8~15MB가 들어오면 런타임
 *      이미지 최적화 비용이 배가된다(#521에서 이미 네비게이션 지연으로 관측됨).
 *
 * ⚠️ **이 가드는 #521을 해결하지 않는다.** #521의 해법은 사전 생성 변형이며, 그것이 들어오면
 * 변형 존재·용량을 검사하는 가드를 따로 추가해야 한다.
 *
 * 사용: pnpm exec tsx scripts/check-character-image-budget.ts
 */

import * as fs from "node:fs";
import * as path from "node:path";

const ROOT = path.resolve(__dirname, "..");
const CHARACTERS_DIR = path.join(ROOT, "public", "images", "characters");

/** 의도된 2x 마스터 치수 — `docs/conventions/image-assets.md` */
const EXPECTED_WIDTH = 2816;
const EXPECTED_HEIGHT = 1536;

/** 현재 최댓값 약 5.2MB에 여유를 둔 상한. 압축 실수·무압축 재출력을 잡는다. */
const MAX_BYTES = 6.5 * 1024 * 1024;

interface Violation {
  readonly file: string;
  readonly detail: string;
}

/** PNG IHDR에서 폭·높이를 읽는다(파일 전체를 메모리에 올리지 않는다). */
function readPngSize(file: string): { width: number; height: number } | null {
  const fd = fs.openSync(file, "r");
  try {
    const header = Buffer.alloc(24);
    if (fs.readSync(fd, header, 0, 24, 0) < 24) return null;
    // 89 50 4E 47 0D 0A 1A 0A = PNG 시그니처
    if (header.readUInt32BE(0) !== 0x89504e47) return null;
    return { width: header.readUInt32BE(16), height: header.readUInt32BE(20) };
  } finally {
    fs.closeSync(fd);
  }
}

function collectMasters(): string[] {
  if (!fs.existsSync(CHARACTERS_DIR)) return [];
  const out: string[] = [];
  for (const characterId of fs.readdirSync(CHARACTERS_DIR)) {
    const moodDir = path.join(CHARACTERS_DIR, characterId, "nukki-enhanced");
    if (!fs.existsSync(moodDir) || !fs.statSync(moodDir).isDirectory()) continue;
    for (const entry of fs.readdirSync(moodDir, { withFileTypes: true })) {
      // 백업 디렉터리(backup-v2 등)는 배포·런타임 대상이 아니므로 제외한다.
      if (entry.isDirectory()) continue;
      if (!entry.name.endsWith(".png")) continue;
      out.push(path.join(moodDir, entry.name));
    }
  }
  return out;
}

function main(): void {
  const masters = collectMasters();

  // 로컬 public 폴더가 없는 환경(배포 이미지는 .dockerignore로 제외)에서는 건너뛴다.
  // 단, 디렉터리 자체가 있는데 파일이 0건이면 경로 규칙이 바뀐 것이므로 실패시킨다.
  if (!fs.existsSync(CHARACTERS_DIR)) {
    console.log("[check-character-image-budget] public/images/characters 없음 — 건너뜁니다.");
    return;
  }
  if (masters.length === 0) {
    console.error(
      "[check-character-image-budget] 마스터 이미지를 하나도 찾지 못했습니다.\n" +
      "  경로 규칙(public/images/characters/<id>/nukki-enhanced/*.png)이 바뀌었다면 이 스크립트도 갱신하세요.",
    );
    process.exit(1);
  }

  const violations: Violation[] = [];

  for (const file of masters) {
    const rel = path.relative(ROOT, file).replaceAll("\\", "/");
    const bytes = fs.statSync(file).size;
    if (bytes > MAX_BYTES) {
      violations.push({
        file: rel,
        detail: `${(bytes / 1024 / 1024).toFixed(1)}MB > 상한 ${(MAX_BYTES / 1024 / 1024).toFixed(1)}MB — 압축해서 재출력하세요(해상도는 유지)`,
      });
    }

    const size = readPngSize(file);
    if (!size) {
      violations.push({ file: rel, detail: "PNG 헤더를 읽을 수 없습니다" });
    } else if (size.width !== EXPECTED_WIDTH || size.height !== EXPECTED_HEIGHT) {
      violations.push({
        file: rel,
        detail: `${size.width}×${size.height} ≠ 기대 ${EXPECTED_WIDTH}×${EXPECTED_HEIGHT} — 2x 마스터 치수는 고정입니다`,
      });
    }
  }

  if (violations.length > 0) {
    console.error(`[check-character-image-budget] ${violations.length}건 위반:`);
    for (const v of violations) console.error(`  ${v.file}: ${v.detail}`);
    console.error("\n  정본: docs/conventions/image-assets.md");
    process.exit(1);
  }

  console.log(
    `[check-character-image-budget] 검사 통과. 마스터 ${masters.length}장, 치수·용량 위반 없음.`,
  );
}

main();
