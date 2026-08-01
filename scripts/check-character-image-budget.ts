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
 * ## 사전 생성 변형 검사 (2026-08-01 추가)
 *
 * #533이 런타임 이미지 최적화를 사전 생성 WebP 변형으로 대체했다. 이 가드의 초판은
 * "변형이 들어오면 존재·용량을 검사하는 가드를 따로 추가해야 한다"고 스스로 요구해 뒀는데
 * **그 후속이 이행되지 않았다.** 그 사이 다음 구멍이 열려 있었다.
 *
 *   - `characterImageLoader`(`src/lib/storage/character-image.ts`)는 `.png` → `-<w>.webp` 를
 *     **무조건** 치환하고 런타임 폴백이 없다. 변형이 하나라도 없으면 그 이미지는 404다.
 *   - 세션에서만 쓰는 mood(`surprised`·`serious`·`mystical`)의 변형이 빠져도 홈은 멀쩡하므로
 *     E2E 홈 검사에 걸리지 않는다. **리딩 도중에만 캐릭터가 사라진다.**
 *   - 캐릭터 추가 절차에 변형 생성·업로드 단계가 없었다(같은 커밋에서 보강).
 *
 * 그래서 마스터마다 **폭 사다리 전체**가 있는지 검사한다. 사다리는 문자열로 베끼지 않고
 * `CHARACTER_VARIANT_WIDTHS` 정본을 import한다 — 사다리가 바뀌면 이 가드가 자동으로 따라간다.
 *
 * 사용: pnpm exec tsx scripts/check-character-image-budget.ts
 */

import * as fs from "node:fs";
import * as path from "node:path";

// 폭 사다리는 앱이 쓰는 정본을 그대로 가져온다. 여기에 숫자를 다시 적으면 드리프트가 생긴다.
import { CHARACTER_VARIANT_WIDTHS } from "../src/lib/storage/character-image";

const ROOT = path.resolve(__dirname, "..");
const CHARACTERS_DIR = path.join(ROOT, "public", "images", "characters");

/**
 * 런타임이 요청하는 파일 stem — 이것들은 변형까지 반드시 있어야 한다.
 *
 * `Mood` 6종과 1:1이 아니다. `default` mood는 `MOOD_TO_FILE`이 `idle`로 매핑하므로
 * 파일 이름은 `idle`이다(`src/components/character/SpriteAnimator.tsx`).
 * `default.png`는 `idle.png`와 바이트 동일한 레거시 중복이라 **필수가 아니다** —
 * 있으면 검사하고 없어도 통과한다(정리 경위는 `docs/wbs/README.md` R-4).
 */
const REQUIRED_STEMS = ["idle", "smile", "serious", "surprised", "wink", "mystical"] as const;

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

  // ── 필수 stem 존재 검사 ────────────────────────────────────────────────
  // 캐릭터를 추가하면서 표정 하나를 빠뜨리면, 그 표정을 쓰는 화면에서만 깨진다.
  // 세션 전용 mood는 홈 E2E에 걸리지 않으므로 여기서 잡아야 한다.
  const characterIds = fs
    .readdirSync(CHARACTERS_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory() && fs.existsSync(path.join(CHARACTERS_DIR, e.name, "nukki-enhanced")))
    .map((e) => e.name);

  for (const id of characterIds) {
    for (const stem of REQUIRED_STEMS) {
      const master = path.join(CHARACTERS_DIR, id, "nukki-enhanced", `${stem}.png`);
      if (!fs.existsSync(master)) {
        violations.push({
          file: `public/images/characters/${id}/nukki-enhanced/${stem}.png`,
          detail: "필수 표정 마스터가 없습니다 — 런타임이 이 파일을 요청합니다",
        });
      }
    }
  }

  // ── 변형 존재 검사 ─────────────────────────────────────────────────────
  // characterImageLoader는 폴백 없이 `.png` → `-<w>.webp` 로 치환한다.
  // 변형이 없으면 그 이미지는 조용히 404가 되고, 홈 밖 화면이면 E2E도 놓친다.
  let variantCount = 0;
  for (const file of masters) {
    const stem = path.basename(file, ".png");
    const dir = path.dirname(file);
    const masterBytes = fs.statSync(file).size;

    for (const width of CHARACTER_VARIANT_WIDTHS) {
      const variant = path.join(dir, `${stem}-${width}.webp`);
      const rel = path.relative(ROOT, variant).replaceAll("\\", "/");
      if (!fs.existsSync(variant)) {
        violations.push({
          file: rel,
          detail:
            `변형이 없습니다 — characterImageLoader가 폴백 없이 이 URL을 요청하므로 404가 됩니다.\n` +
            `      생성: pnpm exec tsx scripts/generate-assets/generate-character-variants.ts`,
        });
        continue;
      }
      variantCount++;
      const variantBytes = fs.statSync(variant).size;
      if (variantBytes >= masterBytes) {
        violations.push({
          file: rel,
          detail: `${(variantBytes / 1024).toFixed(0)}KB ≥ 마스터 ${(masterBytes / 1024).toFixed(0)}KB — 변형이 원본보다 크면 최적화가 아닙니다`,
        });
      }
    }
  }

  if (violations.length > 0) {
    console.error(`[check-character-image-budget] ${violations.length}건 위반:`);
    for (const v of violations) console.error(`  ${v.file}: ${v.detail}`);
    console.error("\n  정본: docs/conventions/image-assets.md");
    process.exit(1);
  }

  console.log(
    `[check-character-image-budget] 검사 통과. ` +
    `캐릭터 ${characterIds.length}명, 마스터 ${masters.length}장, 변형 ${variantCount}장 — ` +
    `치수·용량·필수표정·변형 위반 없음.`,
  );
}

main();
