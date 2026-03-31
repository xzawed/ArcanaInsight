/**
 * 카드 스킨 이미지 Supabase Storage 업로드 스크립트
 *
 * 사용법:
 *   SUPABASE_URL=... SERVICE_ROLE_KEY=... pnpm tsx scripts/upload-skin-images.ts
 *   SUPABASE_URL=... SERVICE_ROLE_KEY=... pnpm tsx scripts/upload-skin-images.ts --skin=gold-luxury
 *
 * 전제 조건:
 *   - scripts/generate-skin-images.ts 실행 후 output/card-skins/ 디렉토리에 이미지가 있어야 함
 */

import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET_NAME = "card-skins";
const INPUT_DIR = path.join(process.cwd(), "output/card-skins");

if (!SUPABASE_URL) {
  console.error("❌ SUPABASE_URL 또는 NEXT_PUBLIC_SUPABASE_URL 환경변수를 설정해주세요.");
  process.exit(1);
}
if (!SERVICE_ROLE_KEY) {
  console.error("❌ SERVICE_ROLE_KEY 또는 SUPABASE_SERVICE_ROLE_KEY 환경변수를 설정해주세요.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// === 버킷 초기화 ===

async function ensureBucket(): Promise<void> {
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  if (listError) {
    console.error("❌ 버킷 목록 조회 실패:", listError.message);
    process.exit(1);
  }

  const exists = buckets?.some((b) => b.name === BUCKET_NAME);
  if (!exists) {
    console.log(`📦 버킷 '${BUCKET_NAME}' 생성 중...`);
    const { error: createError } = await supabase.storage.createBucket(BUCKET_NAME, {
      public: true,
      fileSizeLimit: 10 * 1024 * 1024, // 10MB
    });
    if (createError) {
      console.error("❌ 버킷 생성 실패:", createError.message);
      process.exit(1);
    }
    console.log(`  ✓ 버킷 '${BUCKET_NAME}' 생성 완료`);
  } else {
    console.log(`  ✓ 버킷 '${BUCKET_NAME}' 확인됨`);
  }
}

// === 파일 업로드 ===

async function uploadFile(localPath: string, storagePath: string): Promise<boolean> {
  try {
    const fileBuffer = fs.readFileSync(localPath);
    const { error } = await supabase.storage.from(BUCKET_NAME).upload(storagePath, fileBuffer, {
      upsert: true,
      contentType: "image/png",
    });

    if (error) {
      console.error(`  ✗ 업로드 실패 [${storagePath}]: ${error.message}`);
      return false;
    }

    console.log(`  ✓ ${storagePath}`);
    return true;
  } catch (e) {
    console.error(`  ✗ 파일 읽기 오류 [${localPath}]:`, e instanceof Error ? e.message : e);
    return false;
  }
}

// === 스킨 업로드 ===

async function uploadSkin(skinId: string): Promise<{ uploaded: number; failed: number }> {
  const skinDir = path.join(INPUT_DIR, skinId);

  if (!fs.existsSync(skinDir)) {
    console.warn(`  ⚠ 디렉토리 없음: ${skinDir} — 스킵`);
    return { uploaded: 0, failed: 0 };
  }

  let uploaded = 0;
  let failed = 0;

  // 카드 뒷면 업로드
  const backLocal = path.join(skinDir, "back.png");
  if (fs.existsSync(backLocal)) {
    const backOk = await uploadFile(backLocal, `${skinId}/back.png`);
    if (backOk) uploaded++; else failed++;
  } else {
    console.warn(`  ⚠ 뒷면 이미지 없음: ${backLocal}`);
  }

  // 앞면 이미지 업로드
  const frontDir = path.join(skinDir, "front");
  if (fs.existsSync(frontDir)) {
    const files = fs.readdirSync(frontDir).filter((f) => f.endsWith(".png"));
    files.sort();

    for (const file of files) {
      const localPath = path.join(frontDir, file);
      const storagePath = `${skinId}/front/${file}`;
      const fileOk = await uploadFile(localPath, storagePath);
      if (fileOk) uploaded++; else failed++;
    }
  } else {
    console.warn(`  ⚠ 앞면 디렉토리 없음: ${frontDir}`);
  }

  return { uploaded, failed };
}

// === 메인 실행 ===

async function main() {
  const args = process.argv.slice(2);
  const skinFlag = args.find((a) => a.startsWith("--skin="))?.split("=")[1];

  console.log("☁️  카드 스킨 이미지 Supabase 업로드");
  console.log("=====================================\n");

  if (!fs.existsSync(INPUT_DIR)) {
    console.error(`❌ 입력 디렉토리가 없습니다: ${INPUT_DIR}`);
    console.error("먼저 scripts/generate-skin-images.ts 를 실행해주세요.");
    process.exit(1);
  }

  // 버킷 확인/생성
  await ensureBucket();
  console.log();

  // 업로드할 스킨 목록 결정
  let skinIds: string[];
  if (skinFlag) {
    skinIds = [skinFlag];
  } else {
    skinIds = fs
      .readdirSync(INPUT_DIR)
      .filter((entry) => fs.statSync(path.join(INPUT_DIR, entry)).isDirectory());
    skinIds.sort();
  }

  if (skinIds.length === 0) {
    console.warn("⚠ 업로드할 스킨 디렉토리가 없습니다.");
    process.exit(0);
  }

  let totalUploaded = 0;
  let totalFailed = 0;

  for (const skinId of skinIds) {
    console.log(`\n🎨 [${skinId}] 업로드 중...`);
    console.log("─".repeat(40));
    const { uploaded, failed } = await uploadSkin(skinId);
    totalUploaded += uploaded;
    totalFailed += failed;
    console.log(`  → 완료: ${uploaded}장 업로드, ${failed}장 실패`);
  }

  console.log("\n=====================================");
  console.log(`✅ 총 업로드: ${totalUploaded}장 | ❌ 총 실패: ${totalFailed}장`);
  console.log(`🪣 버킷: ${BUCKET_NAME} (${SUPABASE_URL})`);
}

main().catch(console.error);
