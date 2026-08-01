/**
 * 카드 아트 스타일·서비스 배경 이미지를 Cloudflare R2에 업로드한다.
 *
 * `public/images/cards` + `public/images/backgrounds`의 로컬 생성물을
 * R2 버킷(`R2_BUCKET`)의 `card-styles/...` 키로 업로드하며, 각 파일마다
 * 업로드 후 ETag(단일 PUT=md5)와 로컬 md5를 대조해 무결성을 검증한다.
 *
 * 자격증명은 루트 `.env.r2.local`(gitignore)에서 로드:
 *   R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY / R2_BUCKET
 *
 * 사용:
 *   pnpm upload:assets:r2            # 전량 업로드(upsert)
 *   pnpm upload:assets:r2:skip       # R2에 이미 있는 키는 건너뜀
 *
 * ⚠️ 기존 키를 덮어쓴 경우(수정), Cloudflare CDN이 immutable 캐시로
 *    구버전을 계속 서빙한다 → cdn 커스텀 도메인에서 해당 URL 캐시 퍼지 필요.
 *
 * 정본: docs/conventions/image-assets.md §5,
 *       docs/superpowers/plans/archive/2026-06-26-supabase-storage-r2-migration.md
 */
import { config } from 'dotenv';
config({ path: '.env.r2.local' });

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { ProgressTracker, runConcurrent } from './progress';

const DEST_PREFIX = 'card-styles'; // R2 키 = card-styles/<storagePath>
const CONCURRENT_UPLOADS = 6;
const SKIP_EXISTING = process.argv.includes('--skip-existing');

const CARDS_DIR = 'public/images/cards';
const BACKGROUNDS_DIR = 'public/images/backgrounds';

function getR2() {
  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET } = process.env;
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET) {
    throw new Error(
      '.env.r2.local에 R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY / R2_BUCKET가 필요합니다.',
    );
  }
  const client = new S3Client({
    region: 'auto',
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
  });
  return { client, bucket: R2_BUCKET };
}

interface UploadTarget {
  localPath: string;
  storagePath: string; // card-styles/ prefix 제외한 상대 키
}

function collectCardTargets(): UploadTarget[] {
  const targets: UploadTarget[] = [];
  if (!fs.existsSync(CARDS_DIR)) return targets;

  for (const styleId of fs.readdirSync(CARDS_DIR)) {
    const styleDir = path.join(CARDS_DIR, styleId);
    if (!fs.statSync(styleDir).isDirectory()) continue;

    for (const item of fs.readdirSync(styleDir)) {
      const itemPath = path.join(styleDir, item);
      const stat = fs.statSync(itemPath);
      if (stat.isDirectory()) {
        for (const file of fs.readdirSync(itemPath)) {
          if (!file.endsWith('.png') && !file.endsWith('.webp')) continue;
          targets.push({ localPath: path.join(itemPath, file), storagePath: `cards/${styleId}/${item}/${file}` });
        }
      } else if (item.endsWith('.png') || item.endsWith('.webp')) {
        targets.push({ localPath: itemPath, storagePath: `cards/${styleId}/${item}` });
      }
    }
  }
  return targets;
}

function collectBackgroundTargets(): UploadTarget[] {
  const targets: UploadTarget[] = [];
  if (!fs.existsSync(BACKGROUNDS_DIR)) return targets;

  function walk(dir: string, prefix: string): void {
    for (const item of fs.readdirSync(dir)) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        walk(fullPath, `${prefix}/${item}`);
      } else if (item.endsWith('.png') || item.endsWith('.webp') || item.endsWith('.jpg')) {
        targets.push({ localPath: fullPath, storagePath: `backgrounds${prefix}/${item}` });
      }
    }
  }
  walk(BACKGROUNDS_DIR, '');
  return targets;
}

function contentTypeFor(p: string): string {
  const ext = path.extname(p).slice(1).toLowerCase();
  if (ext === 'png') return 'image/png';
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  return 'image/webp';
}

async function keyExists(client: S3Client, bucket: string, key: string): Promise<boolean> {
  try {
    await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch {
    return false;
  }
}

async function uploadOne(client: S3Client, bucket: string, t: UploadTarget): Promise<boolean> {
  const buf = fs.readFileSync(t.localPath);
  const md5 = crypto.createHash('md5').update(buf).digest('hex').toLowerCase();
  const key = `${DEST_PREFIX}/${t.storagePath}`;
  const res = await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buf,
      ContentType: contentTypeFor(t.localPath),
      CacheControl: 'public, max-age=31536000, immutable',
    }),
  );
  const etag = (res.ETag ?? '').replace(/"/g, '').toLowerCase();
  return etag === md5; // 단일 PUT ETag == 콘텐츠 md5 → 바이트 무결성
}

async function main(): Promise<void> {
  console.log('=== Cloudflare R2 업로드 시작 ===');
  const { client, bucket } = getR2();
  console.log(`버킷: ${bucket} · prefix: ${DEST_PREFIX}/ · 기존 스킵: ${SKIP_EXISTING}`);

  const allTargets = [...collectCardTargets(), ...collectBackgroundTargets()];
  console.log(`\n총 대상: ${allTargets.length}개 (cards + backgrounds)`);
  if (allTargets.length === 0) {
    console.log(`업로드할 파일이 없습니다. ${CARDS_DIR} / ${BACKGROUNDS_DIR}에 생성물이 있는지 확인하세요.`);
    return;
  }

  let toUpload = allTargets;
  if (SKIP_EXISTING) {
    console.log('R2 기존 키 확인 중...');
    const flags = await Promise.all(
      allTargets.map((t) => keyExists(client, bucket, `${DEST_PREFIX}/${t.storagePath}`)),
    );
    toUpload = allTargets.filter((_, i) => !flags[i]);
    console.log(`스킵: ${allTargets.length - toUpload.length}개 | 업로드 예정: ${toUpload.length}개`);
    if (toUpload.length === 0) return;
  }

  const tracker = new ProgressTracker(toUpload.length);
  const etagMismatch: string[] = [];
  console.log('업로드 시작...\n');

  const tasks = toUpload.map((t) => async () => {
    try {
      const ok = await uploadOne(client, bucket, t);
      if (!ok) etagMismatch.push(t.storagePath);
      tracker.tick(ok, t.storagePath);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      process.stderr.write(`\nERROR [${t.storagePath}]: ${msg}\n`);
      tracker.tick(false, t.storagePath);
    }
  });

  await runConcurrent(tasks, CONCURRENT_UPLOADS);
  tracker.summary();

  if (etagMismatch.length > 0) {
    process.stderr.write(`\n⚠️ ETag≠md5 (무결성 확인 필요) ${etagMismatch.length}개:\n`);
    etagMismatch.slice(0, 20).forEach((k) => process.stderr.write(`   ${k}\n`));
    process.exitCode = 1;
  } else {
    console.log('\n✅ 전 파일 ETag=md5 무결성 검증 통과');
  }

  const base = process.env.NEXT_PUBLIC_ASSET_BASE_URL ?? '(NEXT_PUBLIC_ASSET_BASE_URL 미설정)';
  console.log(`\nCDN base: ${base}/${DEST_PREFIX}`);
  console.log('⚠️ 기존 키를 덮어썼다면 Cloudflare에서 해당 URL 캐시 퍼지 필요(immutable 캐시).');
}

main().catch((err) => {
  console.error('업로드 중 치명적 오류:', err);
  process.exit(1);
});
