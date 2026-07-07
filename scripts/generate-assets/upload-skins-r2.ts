/**
 * 카드 스킨 이미지(card-skins)를 Cloudflare R2에 업로드한다.
 *
 * `public/images/skins/<skinId>/front/<cardId>.png` + `<skinId>/back.png`를
 * R2 버킷(`R2_BUCKET`)의 `card-skins/<skinId>/...` 키로 업로드하며, 업로드 후
 * ETag(단일 PUT=md5)와 로컬 md5를 대조해 바이트 무결성을 검증한다.
 * R2 키 구조는 기존 Supabase Storage `card-skins/` 구조와 정확히 일치(무손실 이전).
 *
 * 배경: card-skins 6종(474객체·224MB)이 Supabase Storage에 남은 유일한 자산으로
 *   public URL 직접 서빙 → egress를 소비했다. card-styles와 동일하게 R2로 이관해
 *   Supabase Storage를 0으로, egress를 R2(무료)로 옮긴다.
 *   설계: docs/superpowers/plans/2026-06-26-supabase-storage-r2-migration.md(card-styles 선례)
 *
 * 소스 준비: `pnpm download:skins`로 Supabase에서 public/images/skins/에 먼저 내려받는다.
 *
 * 자격증명: 루트 `.env.r2.local`(gitignore) — R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY / R2_BUCKET
 *
 * 사용:
 *   pnpm upload:skins:r2         # 전량 업로드(upsert)
 *   pnpm upload:skins:r2:skip    # R2에 이미 있는 키는 건너뜀
 *
 * ⚠️ 기존 키 덮어쓰기 시 Cloudflare CDN immutable 캐시 퍼지 필요.
 */
import { config } from 'dotenv';
config({ path: '.env.r2.local' });

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';

const DEST_PREFIX = 'card-skins';
const SRC_DIR = 'public/images/skins';
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

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir)) {
    const p = path.join(dir, entry);
    const stat = fs.statSync(p);
    if (stat.isDirectory()) out.push(...walk(p));
    else if (p.endsWith('.png') || p.endsWith('.webp')) out.push(p);
  }
  return out;
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
  if (!fs.existsSync(SRC_DIR)) throw new Error(`${SRC_DIR} 없음 — 먼저 'pnpm download:skins' 실행`);
  const { client, bucket } = getR2();
  const files = walk(SRC_DIR);
  console.log(`카드 스킨 이미지 ${files.length}개 → R2(${bucket}) '${DEST_PREFIX}/' 업로드 (skip-existing=${SKIP_EXISTING})`);
  if (files.length === 0) throw new Error(`${SRC_DIR}에 업로드할 이미지가 없습니다.`);

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
        const res = await client.send(new PutObjectCommand({
          Bucket: bucket, Key: key, Body: body, ContentType: contentType,
          CacheControl: 'public, max-age=31536000, immutable',
        }));
        const etag = (res.ETag ?? '').replace(/"/g, '');
        const local5 = md5(body);
        if (etag && etag !== local5) {
          failed++;
          console.error(`✗ ETag 불일치 ${key}: r2=${etag} local=${local5}`);
        } else {
          done++;
          if (done % 20 === 0) console.log(`  ...${done}/${files.length}`);
        }
      } catch (e) {
        failed++;
        console.error(`✗ 업로드 실패 ${key}:`, e instanceof Error ? e.message : String(e));
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENT }, () => worker()));
  console.log(`\n완료: 업로드 ${done} / 스킵 ${skipped} / 실패 ${failed}`);
  const base = process.env.NEXT_PUBLIC_ASSET_BASE_URL ?? '(NEXT_PUBLIC_ASSET_BASE_URL 미설정)';
  console.log(`CDN base: ${base}/${DEST_PREFIX}`);
  if (failed > 0) process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(1); });
