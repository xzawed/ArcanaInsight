/**
 * 캐릭터 마스터 PNG에서 **사전 생성 반응형 WebP 변형**을 만든다 (#521).
 *
 * ## 왜 필요한가 — 관측된 문제
 *
 * 마스터는 2816×1536·약 4.8MB PNG이고 홈에는 12장이 깔린다. 이걸 `next/image`가 런타임에
 * 최적화하면 요청마다 원본을 디코드(≈16.5MiB 비트맵)해야 한다. 2026-08-01 CI trace에서
 * 그 비용이 **이미지 최적화 큐를 포화시켜 32px 내비 아이콘까지 굶기는 것**이 관측됐다.
 * App Router는 새 트리가 커밋될 때까지 이전 URL을 유지하므로, 사용자에게는 홈 탭을 눌러도
 * **URL조차 30초 넘게 바뀌지 않는 무응답**으로 보였다.
 *
 * 해법은 마스터를 줄이는 것이 아니다 — 2816×1536은 고DPI 큰 표시를 위한 의도된 2x 보정본이다
 * (`docs/conventions/image-assets.md`). 대신 **표시 폭에 맞는 변형을 미리 만들어** 런타임
 * 디코드를 없앤다.
 *
 * ## 산출물
 *
 *   public/images/characters/<id>/nukki-enhanced/<mood>-<width>.webp
 *
 * 알파 채널을 보존한다(누끼 이미지). 마스터는 그대로 둔다 — 변형이 없거나 실패해도
 * 기존 경로가 살아 있어야 롤백이 env 하나로 끝난다.
 *
 * ## 사용
 *
 *   pnpm generate:character-variants          # 없는 것만 생성
 *   pnpm generate:character-variants --force  # 전량 재생성
 *
 * 생성 후 R2 업로드가 필요하다(프로덕션은 R2 서빙):
 *   pnpm upload:characters:r2
 */

import * as fs from "node:fs";
import * as path from "node:path";
import sharp from "sharp";
import { CHARACTER_VARIANT_WIDTHS } from "../../src/lib/storage/character-image";

const ROOT = path.resolve(__dirname, "..", "..");
const CHARACTERS_DIR = path.join(ROOT, "public", "images", "characters");

/**
 * 생성할 폭 — **앱 로더와 같은 정본을 쓴다.**
 *
 * 예전에는 이 파일과 `character-image.ts`에 배열이 각각 있고 주석으로 "반드시 일치"라고만
 * 적어 뒀는데, 어긋나면 로더가 존재하지 않는 폭을 가리켜 **이미지가 전량 404**가 되면서도
 * 아무것도 막지 못했다. 정본을 하나로 두어 드리프트 자체를 없앤다.
 */
const VARIANT_WIDTHS = CHARACTER_VARIANT_WIDTHS;

/** WebP 품질 — 누끼 캐릭터는 그라데이션이 넓어 82 아래에서 밴딩이 보인다. */
const WEBP_QUALITY = 82;

interface Job {
  readonly src: string;
  readonly dest: string;
  readonly width: number;
}

function collectJobs(force: boolean): Job[] {
  if (!fs.existsSync(CHARACTERS_DIR)) return [];
  const jobs: Job[] = [];

  for (const characterId of fs.readdirSync(CHARACTERS_DIR)) {
    const moodDir = path.join(CHARACTERS_DIR, characterId, "nukki-enhanced");
    if (!fs.existsSync(moodDir) || !fs.statSync(moodDir).isDirectory()) continue;

    for (const entry of fs.readdirSync(moodDir, { withFileTypes: true })) {
      if (entry.isDirectory() || !entry.name.endsWith(".png")) continue;
      const src = path.join(moodDir, entry.name);
      const stem = entry.name.replace(/\.png$/, "");

      for (const width of VARIANT_WIDTHS) {
        const dest = path.join(moodDir, `${stem}-${width}.webp`);
        if (!force && fs.existsSync(dest) && fs.statSync(dest).mtimeMs >= fs.statSync(src).mtimeMs) {
          continue; // 이미 최신
        }
        jobs.push({ src, dest, width });
      }
    }
  }
  return jobs;
}

async function runJob(job: Job): Promise<number> {
  await sharp(job.src)
    .resize({ width: job.width, withoutEnlargement: true })
    .webp({ quality: WEBP_QUALITY, alphaQuality: 100, effort: 5 })
    .toFile(job.dest);
  return fs.statSync(job.dest).size;
}

/** 동시 실행 수 — 로컬 CPU를 다 쓰되 메모리 스파이크를 피한다. */
const CONCURRENT = 4;

async function main(): Promise<void> {
  const force = process.argv.includes("--force");
  const jobs = collectJobs(force);

  if (jobs.length === 0) {
    console.log("[generate-character-variants] 생성할 변형이 없습니다 (--force로 전량 재생성).");
    return;
  }

  console.log(
    `[generate-character-variants] ${jobs.length}개 생성 시작 (폭: ${VARIANT_WIDTHS.join(", ")}, quality ${WEBP_QUALITY})`,
  );

  let done = 0;
  let totalBytes = 0;
  let succeeded = 0;
  let failed = 0;

  async function worker(): Promise<void> {
    for (;;) {
      const job = jobs.shift();
      if (!job) return;
      try {
        totalBytes += await runJob(job);
        succeeded += 1;
      } catch (err) {
        failed += 1;
        console.error(`  ✗ ${path.relative(ROOT, job.dest)}: ${(err as Error).message}`);
      }
      done += 1;
      if (done % 50 === 0) console.log(`  ... ${done} 완료`);
    }
  }

  // jobs는 worker가 shift로 비우므로 길이를 미리 잡아둔다.
  const total = jobs.length;
  await Promise.all(Array.from({ length: CONCURRENT }, worker));

  console.log(
    `[generate-character-variants] 완료. ${succeeded}/${total} 생성, ` +
    `총 ${(totalBytes / 1024 / 1024).toFixed(1)}MB, 평균 ${(totalBytes / Math.max(1, succeeded) / 1024).toFixed(0)}KB`,
  );

  if (failed > 0) {
    console.error(`[generate-character-variants] ${failed}건 실패`);
    process.exit(1);
  }
}

void main();
