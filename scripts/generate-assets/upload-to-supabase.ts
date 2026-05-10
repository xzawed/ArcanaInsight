import { config } from 'dotenv';
config({ path: '.env.local' });

import * as fs from 'fs';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';
import { ProgressTracker, runConcurrent } from './progress';

const BUCKET = 'card-styles';
const CONCURRENT_UPLOADS = 5;
const SKIP_EXISTING = process.argv.includes('--skip-existing');

const CARDS_DIR = 'public/images/cards';
const BACKGROUNDS_DIR = 'public/images/backgrounds';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다.');
  }
  return createClient(url, key);
}

type SupabaseAdminClient = ReturnType<typeof getSupabaseAdmin>;

async function ensureBucket(supabase: SupabaseAdminClient): Promise<void> {
  const { data: buckets } = await supabase.storage.listBuckets();
  const exists = buckets?.some((b) => b.name === BUCKET);
  if (!exists) {
    const { error } = await supabase.storage.createBucket(BUCKET, { public: true });
    if (error) throw new Error(`버킷 생성 실패: ${error.message}`);
    console.log(`버킷 '${BUCKET}' 생성 완료.`);
  } else {
    console.log(`버킷 '${BUCKET}' 이미 존재.`);
  }
}

interface UploadTarget {
  localPath: string;
  storagePath: string;
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
          if (!file.endsWith('.png')) continue;
          targets.push({
            localPath: path.join(itemPath, file),
            storagePath: `cards/${styleId}/${item}/${file}`,
          });
        }
      } else if (item.endsWith('.png')) {
        targets.push({
          localPath: itemPath,
          storagePath: `cards/${styleId}/${item}`,
        });
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
        targets.push({
          localPath: fullPath,
          storagePath: `backgrounds${prefix}/${item}`,
        });
      }
    }
  }

  walk(BACKGROUNDS_DIR, '');
  return targets;
}

async function uploadFile(
  supabase: SupabaseAdminClient,
  target: UploadTarget
): Promise<void> {
  const fileBuffer = fs.readFileSync(target.localPath);
  const ext = path.extname(target.localPath).slice(1);
  const contentType = ext === 'png' ? 'image/png' : ext === 'jpg' ? 'image/jpeg' : 'image/webp';

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(target.storagePath, fileBuffer, {
      contentType,
      upsert: true,
    });

  if (error) throw new Error(error.message);
}

async function main(): Promise<void> {
  console.log('=== Supabase Storage 업로드 시작 ===');
  console.log(`버킷: ${BUCKET}`);
  console.log(`기존 파일 스킵: ${SKIP_EXISTING}`);

  const supabase = getSupabaseAdmin();
  await ensureBucket(supabase);

  const cardTargets = collectCardTargets();
  const bgTargets = collectBackgroundTargets();
  const allTargets = [...cardTargets, ...bgTargets];

  console.log(`\n총 업로드 대상: ${allTargets.length}개`);

  let skipped = 0;
  const toUpload: UploadTarget[] = [];

  if (SKIP_EXISTING) {
    console.log('기존 파일 확인 중...');
    const { data: existing } = await supabase.storage.from(BUCKET).list('cards', { limit: 9999 });
    const existingPaths = new Set(existing?.map((f) => f.name) ?? []);

    for (const t of allTargets) {
      const fileName = path.basename(t.storagePath);
      if (existingPaths.has(fileName)) {
        skipped++;
      } else {
        toUpload.push(t);
      }
    }
    console.log(`스킵: ${skipped}개 | 업로드 예정: ${toUpload.length}개`);
  } else {
    toUpload.push(...allTargets);
  }

  if (toUpload.length === 0) {
    console.log('업로드할 파일이 없습니다.');
    return;
  }

  const tracker = new ProgressTracker(toUpload.length);
  console.log('업로드 시작...\n');

  const tasks = toUpload.map((target) => async () => {
    try {
      await uploadFile(supabase, target);
      tracker.tick(true, target.storagePath);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      process.stderr.write(`\nERROR [${target.storagePath}]: ${msg}\n`);
      tracker.tick(false, target.storagePath);
    }
  });

  await runConcurrent(tasks, CONCURRENT_UPLOADS);
  tracker.summary();

  console.log(`\nCDN base URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}`);
}

main().catch((err) => {
  console.error('업로드 중 치명적 오류:', err);
  process.exit(1);
});
