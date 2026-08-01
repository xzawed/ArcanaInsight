/**
 * 캐릭터 이미지(nukki-enhanced)를 Cloudflare R2에 업로드한다.
 *
 * `public/images/characters/<id>/nukki-enhanced/*.png`를 R2 버킷(`R2_BUCKET`)의
 * `characters/<id>/nukki-enhanced/*.png` 키로 업로드하며, 업로드 후 ETag(단일 PUT=md5)와
 * 로컬 md5를 대조해 무결성을 검증한다. (upload-to-r2.ts와 동일 패턴)
 *
 * 배경: 캐릭터 이미지 283MB가 Railway 배포 이미지에 번들되어 배포를 느리게 했다.
 *   R2로 서빙하고 배포 이미지(.dockerignore)에서 제외해 배포를 가속한다. 로컬/CI는
 *   public 폴더 폴백을 유지한다(getCharacterImageUrl).
 *
 * 자격증명: 루트 `.env.r2.local`(gitignore) — R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY / R2_BUCKET
 *
 * 사용:
 *   pnpm upload:characters:r2         # 전량 업로드(upsert)
 *   pnpm upload:characters:r2:skip    # R2에 이미 있는 키는 건너뜀
 *
 * ⚠️ 기존 키 덮어쓰기 시 Cloudflare CDN immutable 캐시 퍼지 필요.
 */
import { config } from 'dotenv';
config({ path: '.env.r2.local' });

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';

const DEST_PREFIX = 'characters';
const SRC_DIR = 'public/images/characters';
const CONCURRENT = 6;
const SKIP_EXISTING = process.argv.includes('--skip-existing');

function getR2() {
  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET } = process.env;
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET) {
    throw new Error('.env.r2.local에 R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY / R2_BUCKET가 필요합니다.');
  }
  const client = new S3Client({
    region: 'auto',
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
  });
  return { client, bucket: R2_BUCKET };
}

/** 배포 자산이 들어 있는 유일한 디렉터리. 이 이름이 아니면 업로드 대상이 아니다. */
const DEPLOY_DIR = 'nukki-enhanced';

/**
 * 업로드 대상 수집 — **허용 목록 방식**이다.
 *
 * `public/images/characters/<id>/nukki-enhanced/` 바로 아래 파일만 올린다.
 * 그 밖의 디렉터리는 이름과 무관하게 전부 제외된다.
 *
 * ## 왜 블랙리스트를 버렸는가
 *
 * 이전 구현은 `/backup/i`에 걸리는 디렉터리만 건너뛰었다. 두 가지로 뚫린다.
 *
 *   1. **오타** — 실제로 `nukki-enhanced_bakup/`(b‑a‑k‑u‑p)가 저장소에 있다.
 *      `backup`에 매칭되지 않으므로 다음 업로드에서 프로덕션 CDN에 올라갔을 것이다.
 *   2. **중간 산출물** — `nukki/`는 파이프라인 1~3단계의 작업 폴더다(864×1536, 배경 있음).
 *      이름에 backup이 없으니 통과한다.
 *
 * 금지 목록은 새 이름이 생길 때마다 뚫리지만, 허용 목록은 **배포 경로가 바뀔 때만**
 * 손대면 된다. 자산을 프로덕션에 올리는 경로에서는 후자가 맞다.
 * (2026-08-01 변형 업로드 직전에 백업 112장이 대상에 포함돼 있던 것을 발견한 것이 계기다.)
 */
function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir)) {
    const p = path.join(dir, entry);
    if (fs.statSync(p).isDirectory()) {
      // 캐릭터 디렉터리는 한 단계 더 들어가고, 그 안에서는 배포 폴더만 본다.
      if (dir === SRC_DIR || entry === DEPLOY_DIR) out.push(...walk(p));
      continue;
    }
    // 배포 폴더 **직속** 파일만 대상. 그 하위(backup-v2 등)는 위 분기에서 이미 걸러진다.
    if (path.basename(dir) !== DEPLOY_DIR) continue;
    if (p.endsWith('.png') || p.endsWith('.webp')) out.push(p);
  }
  return out;
}

/** `--variants-only`: 사전 생성 변형(`<mood>-<width>.webp`)만 올린다. 마스터 PNG는 건드리지 않는다. */
const VARIANTS_ONLY = process.argv.includes('--variants-only');

function filterTargets(files: string[]): string[] {
  if (!VARIANTS_ONLY) return files;
  return files.filter((p) => /[\\/]nukki-enhanced[\\/][a-z]+-\d+\.webp$/i.test(p));
}

function md5(buf: Buffer): string {
  return crypto.createHash('md5').update(buf).digest('hex');
}

async function keyExists(client: S3Client, bucket: string, key: string): Promise<boolean> {
  try {
    await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch {
    return false;
  }
}

async function main() {
  if (!fs.existsSync(SRC_DIR)) throw new Error(`${SRC_DIR} 없음`);
  const { client, bucket } = getR2();
  const files = filterTargets(walk(SRC_DIR));
  console.log(
    `캐릭터 이미지 ${files.length}개 → R2(${bucket}) '${DEST_PREFIX}/' 업로드 ` +
    `(skip-existing=${SKIP_EXISTING}, variants-only=${VARIANTS_ONLY})`,
  );

  let done = 0, skipped = 0, failed = 0;
  const queue = [...files];
  async function worker() {
    while (queue.length) {
      const local = queue.shift()!;
      const rel = path.relative(SRC_DIR, local).split(path.sep).join('/');
      const key = `${DEST_PREFIX}/${rel}`;
      try {
        if (SKIP_EXISTING && (await keyExists(client, bucket, key))) { skipped++; continue; }
        const body = fs.readFileSync(local);
        const contentType = local.endsWith('.webp') ? 'image/webp' : 'image/png';
        // 캐릭터는 카드·스킨과 달리 **`immutable`을 쓰지 않는다.**
        //
        // 파일명이 `idle.png`처럼 고정이고 아트 개선 시 **같은 키를 덮어쓰는 것이 정규 절차**다
        // (`character-add`의 `backup-v2/` 백업 절차가 그 전제이고, 저장소에 실제 백업 폴더가 있다).
        // `max-age=31536000, immutable`을 걸면 교체 후에도 기존 방문자가 **최대 1년간 옛 얼굴**을 본다.
        // Cloudflare 퍼지는 **엣지만** 비우고 이미 받아 둔 브라우저 캐시는 지우지 못한다.
        //
        // 값은 현재 엣지 기본 동작(`max-age=14400`)과 같게 두어 회귀를 만들지 않고, `stale-while-revalidate`로
        // 만료 후 재검증이 사용자 대기를 만들지 않게 한다.
        const res = await client.send(new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: body,
          ContentType: contentType,
          CacheControl: 'public, max-age=14400, stale-while-revalidate=86400',
        }));
        const etag = (res.ETag ?? '').replace(/"/g, '');
        const local5 = md5(body);
        if (etag && etag !== local5) {
          failed++;
          console.error(`✗ ETag 불일치 ${key}: r2=${etag} local=${local5}`);
        } else {
          done++;
          if (done % 10 === 0) console.log(`  ...${done}/${files.length}`);
        }
      } catch (e) {
        failed++;
        console.error(`✗ 업로드 실패 ${key}:`, e instanceof Error ? e.message : String(e));
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENT }, () => worker()));
  console.log(`\n완료: 업로드 ${done} / 스킵 ${skipped} / 실패 ${failed}`);
  if (failed > 0) process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(1); });
