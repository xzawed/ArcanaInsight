/**
 * Real-ESRGAN으로 캐릭터 누끼 이미지 화질 일괄 개선
 *
 * 처리 방식:
 *   Real-ESRGAN 4x AI 업스케일 → Python/Pillow로 2x 다운샘플링 (LANCZOS)
 *   → 원본 위치에 덮어쓰기 (원본은 backup 폴더에 자동 보관)
 *
 * 사전 준비:
 *   1. GitHub "xinntao/Real-ESRGAN releases" 에서
 *      realesrgan-ncnn-vulkan-20220424-windows.zip 다운로드 후 압축 해제
 *   2. pip install Pillow  (다운샘플링 후처리용)
 *
 * 사용법:
 *   node scripts/enhance-character-images.mjs --exe <경로> [옵션]
 *
 * 옵션:
 *   --exe    <경로>   realesrgan-ncnn-vulkan.exe 경로 (필수)
 *   --model  <이름>   사용 모델 (기본: realesrgan-x4plus-anime)
 *   --gpu    <번호>   GPU 인덱스 (기본: 자동 — 고성능 GPU 수동 지정 시)
 *   --output-size <가로x세로>  최종 출력 해상도 (기본: 2816x1536 = 원본 2x)
 *   --dry-run         실행하지 않고 대상 파일 목록만 출력
 *
 * 예:
 *   node scripts/enhance-character-images.mjs --exe C:/realesrgan-ncnn-vulkan-20220424-windows/realesrgan-ncnn-vulkan.exe
 *   node scripts/enhance-character-images.mjs --exe C:/realesrgan.../realesrgan-ncnn-vulkan.exe --gpu 1
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync, execSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

// ─── 인수 파싱 ─────────────────────────────────────────────────────────────
function parseArgs() {
  const args = process.argv.slice(2);
  let exe = "";
  let model = "realesrgan-x4plus-anime";
  let gpu = null;
  let outputSize = "2816x1536";
  let dryRun = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--exe")         exe        = args[++i];
    else if (args[i] === "--model")  model      = args[++i];
    else if (args[i] === "--gpu")    gpu        = args[++i];
    else if (args[i] === "--output-size") outputSize = args[++i];
    else if (args[i] === "--dry-run") dryRun    = true;
  }
  return { exe, model, gpu, outputSize, dryRun };
}

// ─── 이미지 탐색 ───────────────────────────────────────────────────────────
function findNukkiImages() {
  const imagesRoot = path.join(ROOT, "public/images/characters");
  const results = [];
  for (const char of fs.readdirSync(imagesRoot)) {
    const nukkiDir = path.join(imagesRoot, char, "nukki");
    if (!fs.existsSync(nukkiDir)) continue;
    for (const file of fs.readdirSync(nukkiDir)) {
      if (!file.endsWith(".png")) continue;
      results.push({ char, file, fullPath: path.join(nukkiDir, file) });
    }
  }
  return results;
}

// ─── 단일 이미지 처리 ─────────────────────────────────────────────────────
function processImage(exePath, model, gpu, outputW, outputH, imgPath) {
  const tmpRaw   = imgPath.replace(/\.png$/, ".__4x.png");
  const tmpFinal = imgPath.replace(/\.png$/, ".__final.png");

  try {
    // Step 1: Real-ESRGAN 4x AI 업스케일
    const esrganArgs = ["-i", imgPath, "-o", tmpRaw, "-n", model, "-f", "png"];
    if (gpu !== null) esrganArgs.push("-g", gpu);

    execFileSync(exePath, esrganArgs, { stdio: "pipe", timeout: 180_000 });
    if (!fs.existsSync(tmpRaw)) throw new Error("Real-ESRGAN 출력 파일 없음");

    // Step 2: Python/Pillow로 2x 다운샘플 (LANCZOS 최고 품질)
    const rawPosix   = tmpRaw.replaceAll("\\", "/");
    const finalPosix = tmpFinal.replaceAll("\\", "/");
    const pyScript = [
      "from PIL import Image",
      `img = Image.open(r'${rawPosix}')`,
      `img = img.resize((${outputW}, ${outputH}), Image.LANCZOS)`,
      `img.save(r'${finalPosix}', 'PNG', compress_level=6)`,
    ].join("; ");
    execSync(`python -c "${pyScript}"`, { stdio: "pipe", timeout: 30_000 });
    if (!fs.existsSync(tmpFinal)) throw new Error("Pillow 다운샘플 실패");

    // Step 3: 원본 교체
    fs.renameSync(tmpFinal, imgPath);
  } finally {
    if (fs.existsSync(tmpRaw))   fs.unlinkSync(tmpRaw);
    if (fs.existsSync(tmpFinal)) fs.unlinkSync(tmpFinal);
  }
}

// ─── 메인 ─────────────────────────────────────────────────────────────────
function main() {
  const opts = parseArgs();

  if (!opts.exe) {
    console.error("❌ --exe 옵션이 필요합니다.");
    console.error("   예: node scripts/enhance-character-images.mjs --exe C:/realesrgan-ncnn-vulkan-20220424-windows/realesrgan-ncnn-vulkan.exe");
    process.exit(1);
  }

  const [outW, outH] = opts.outputSize.split("x").map(Number);
  const images = findNukkiImages();
  const timestamp = new Date().toISOString().slice(0, 19).replaceAll(/[T:]/g, "-");
  const backupRoot = path.join(ROOT, `backup_nukki_${timestamp}`);

  console.log("=== 캐릭터 이미지 화질 개선 (Real-ESRGAN 4x → Pillow 다운샘플) ===");
  console.log(`  대상 이미지: ${images.length}개`);
  console.log(`  모델: ${opts.model}`);
  console.log(`  출력 해상도: ${outW}×${outH} (원본의 2x)`);
  if (opts.gpu) console.log(`  GPU: ${opts.gpu}`);
  console.log(`  백업: ${backupRoot}`);

  if (opts.dryRun) {
    console.log("\n[DRY RUN] 대상 파일 목록:");
    images.forEach(({ char, file }) => console.log(`  ${char}/nukki/${file}`));
    return;
  }

  // Pillow 확인
  try {
    execSync(`python -c "from PIL import Image"`, { stdio: "pipe" });
  } catch {
    console.error("❌ Pillow가 없습니다. pip install Pillow 를 먼저 실행하세요.");
    process.exit(1);
  }

  // 원본 백업
  console.log(`\n[1/2] 원본 백업 중...`);
  for (const { char, file, fullPath } of images) {
    const dir = path.join(backupRoot, char, "nukki");
    fs.mkdirSync(dir, { recursive: true });
    fs.copyFileSync(fullPath, path.join(dir, file));
  }
  console.log(`  ${images.length}개 백업 완료.`);

  // 처리
  console.log(`\n[2/2] 이미지 처리 시작...`);
  let success = 0;
  let fail = 0;

  for (let i = 0; i < images.length; i++) {
    const { char, file, fullPath } = images[i];
    process.stdout.write(`  [${String(i + 1).padStart(2)}/${images.length}] ${char}/${file} ... `);
    try {
      processImage(opts.exe, opts.model, opts.gpu, outW, outH, fullPath);
      success++;
      console.log("✅");
    } catch (e) {
      fail++;
      console.log(`❌  ${e.message.slice(0, 80)}`);
    }
  }

  console.log(`\n=== 완료: 성공 ${success}개  실패 ${fail}개 ===`);
  console.log(`원본 백업 위치: ${backupRoot}`);
  if (fail > 0) {
    console.log("⚠️  실패한 이미지는 백업에서 복원 가능합니다.");
  }
}

try {
  main();
} catch (e) {
  console.error("\n예기치 않은 오류:", e.message);
  process.exit(1);
}
