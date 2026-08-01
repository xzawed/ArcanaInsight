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

/**
 * 업로드 대상 수집.
 *
 * ⚠️ **백업 디렉터리는 제외한다.** 작업자가 이미지 교체 전에 남기는 로컬 백업
 * (`nukki-enhanced_backup/`, `backup-v2/`, `backup-v2-restored/` 등)은 배포 자산이 아니다.
 * 이전 구현은 모든 하위 디렉터리를 재귀해 이것들까지 프로덕션 CDN에 올렸다 —
 * 2026-08-01 변형 업로드 직전에 발견해 차단했다(백업 112장이 대상에 포함돼 있었다).
 */
function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir)) {
    const p = path.join(dir, entry);
    const stat = fs.statSync(p);
    if (stat.isDirectory()) {
      if (/backup/i.test(entry)) continue;
      out.push(...walk(p));
    } else if (p.endsWith('.png') || p.endsWith('.webp')) {
      out.push(p);
    }
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
        const res = await client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType }));
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
