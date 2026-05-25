/**
 * 서비스별·테마별 세션 배경 이미지 생성 스크립트 (7테마 × 3서비스 = 21장)
 * 사용법: node --import tsx scripts/generate-service-backgrounds.ts
 * 옵션:  --skip  이미 존재하는 이미지 건너뜀
 */

import * as fs from "fs";
import * as path from "path";
import * as https from "https";

function loadEnvFile(filePath: string): void {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvFile(path.resolve(process.cwd(), ".env.local"));

const API_KEY = process.env.GROK_API_KEY;
const API_URL = "https://api.x.ai/v1/images/generations";
const SKIP_EXISTING = process.argv.includes("--skip");

if (!API_KEY) {
  console.error("GROK_API_KEY가 설정되어 있지 않습니다.");
  process.exit(1);
}

type ServiceId = "tarot" | "saju" | "shinjeom";
type ThemeId = "midnight" | "dawn" | "sunset" | "spring" | "summer" | "autumn" | "winter";

// 테마별 공통 분위기 구문 (서비스 프롬프트에 prefix로 결합)
const THEME_ATMOSPHERE: Record<ThemeId, string> = {
  midnight: [
    "deep midnight darkness, infinite starfield sky, Milky Way arc overhead,",
    "cold silver moonlight casting long shadows, deep indigo and violet hues,",
    "glowing purple mystical energy, ethereal bioluminescent wisps,",
    "dramatic chiaroscuro lighting, otherworldly and transcendent atmosphere,",
  ].join(" "),
  dawn: [
    "delicate pre-dawn twilight, thin crescent moon hanging low,",
    "pale rose gold and lilac sky gradient, morning mist over still water,",
    "first light rays piercing through silk curtains, dew-covered ethereal flowers,",
    "soft pastel palette pink-lavender-gold, gentle awakening atmosphere,",
  ].join(" "),
  sunset: [
    "dramatic golden hour sunset, sky ablaze in amber orange and deep crimson,",
    "long warm shadows, silhouettes against glowing horizon,",
    "floating embers and sparks in warm air, purple-indigo dusk creeping in,",
    "rich saturated jewel tones, passionate and intense atmosphere,",
  ].join(" "),
  spring: [
    "Japanese cherry blossom spring evening, petals drifting in soft breeze,",
    "pale pink and white sakura canopy overhead, gentle warm light filtering through,",
    "scattered flower petals floating like snow, soft green and blush pink palette,",
    "fresh new beginnings atmosphere, tender romantic mood,",
  ].join(" "),
  summer: [
    "midsummer night, fireflies dancing in warm humid air,",
    "deep blue-green night sky, cicada summer magic, glowing moonflowers,",
    "luminescent sea or lake reflecting stars, vibrant turquoise and azure hues,",
    "alive and electric summer atmosphere, rich lush tropical mood,",
  ].join(" "),
  autumn: [
    "deep autumn twilight, maple and ginkgo leaves in crimson gold orange,",
    "falling leaves spiraling in cool breeze, warm lantern light cutting through dusk,",
    "rich amber and burnt sienna palette, harvest moon rising large and golden,",
    "melancholic beautiful wabi-sabi atmosphere, contemplative mood,",
  ].join(" "),
  winter: [
    "silent winter night, pristine snowfall in moonlight, everything crystal white,",
    "ice blue and silver palette, frost patterns on dark glass,",
    "aurora borealis dancing overhead in green and violet,",
    "frozen crystalline magical atmosphere, hushed and luminous winter stillness,",
  ].join(" "),
};

// 서비스별 핵심 장면 요소
const SERVICE_ELEMENTS: Record<ServiceId, string> = {
  tarot: [
    "ornate tarot cards suspended in air and softly illuminated, velvet-draped reading table,",
    "crystal ball with swirling inner galaxies, ancient leather-bound tome open to celestial charts,",
    "gold-edged arcana cards fanned out glowing, arcane symbols and constellation lines traced in light,",
    "silk cushions and candlelit brass candelabras, smoky incense spirals rising,",
  ].join(" "),
  saju: [
    "ancient East Asian astronomical observatory, celestial sphere armillary orrery,",
    "four heavenly pillars with Chinese characters glowing, Bagua octagram chart,",
    "bronze and jade ritual vessels, ink-brush calligraphy strokes floating,",
    "five-element color wheels—fire red, water blue, wood green, metal gold, earth brown—",
    "silk hanging scroll with birth chart, moon and sun in cosmic dance,",
  ].join(" "),
  shinjeom: [
    "Korean shamanic mudang ritual space, ceremonial altar laden with offerings,",
    "silk prayer flags streaming in spirit wind, brass bells and hand drums,",
    "tiger spirit and crane spirit guardian figures flanking the scene,",
    "phoenix rising from sacred fire, copper divination coins mid-toss,",
    "spiritual portal doorway radiating warm saffron and violet light,",
  ].join(" "),
};

// 공통 품질 지시어
const QUALITY_SUFFIX = [
  "anime background art style, cinematic composition with rule-of-thirds framing,",
  "ultra-detailed environment, painterly brushwork, premium illustration quality,",
  "no characters, no text, no UI elements, pure atmospheric background,",
  "16:9 landscape format, depth of field with blurred foreground elements,",
  "professional concept art for mobile game or visual novel,",
].join(" ");

function buildPrompt(service: ServiceId, theme: ThemeId): string {
  return [
    THEME_ATMOSPHERE[theme],
    SERVICE_ELEMENTS[service],
    QUALITY_SUFFIX,
  ].join(" ");
}

interface ImageTask {
  service: ServiceId;
  theme: ThemeId;
  outputPath: string;
  prompt: string;
}

function buildTaskList(outputRoot: string): ImageTask[] {
  const services: ServiceId[] = ["tarot", "saju", "shinjeom"];
  const themes: ThemeId[] = ["midnight", "dawn", "sunset", "spring", "summer", "autumn", "winter"];
  const tasks: ImageTask[] = [];
  for (const service of services) {
    for (const theme of themes) {
      tasks.push({
        service,
        theme,
        outputPath: path.join(outputRoot, service, `${theme}.png`),
        prompt: buildPrompt(service, theme),
      });
    }
  }
  return tasks;
}

async function generateImage(prompt: string): Promise<Buffer | null> {
  const body = JSON.stringify({
    model: "grok-imagine-image",
    prompt,
    n: 1,
    response_format: "b64_json",
    aspect_ratio: "16:9",
  });

  return new Promise((resolve) => {
    const url = new URL(API_URL);
    const options = {
      hostname: url.hostname,
      path: url.pathname,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_KEY}`,
        "Content-Length": Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (chunk: Buffer) => chunks.push(chunk));
      res.on("end", () => {
        try {
          const responseBody = Buffer.concat(chunks).toString("utf-8");
          const json = JSON.parse(responseBody) as {
            data?: Array<{ b64_json?: string }>;
            error?: { message?: string };
          };
          if (json.error) {
            console.error(`  API 에러: ${json.error.message ?? JSON.stringify(json.error)}`);
            resolve(null);
            return;
          }
          const b64 = json.data?.[0]?.b64_json;
          if (!b64) {
            console.error("  응답에 이미지 데이터가 없습니다.");
            resolve(null);
            return;
          }
          resolve(Buffer.from(b64, "base64"));
        } catch (e) {
          console.error("  JSON 파싱 에러:", e);
          resolve(null);
        }
      });
    });

    req.on("error", (e: NodeJS.ErrnoException) => {
      console.error("  요청 에러:", e.message);
      resolve(null);
    });

    req.write(body);
    req.end();
  });
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main(): Promise<void> {
  const outputRoot = path.resolve(process.cwd(), "public/images/backgrounds");

  // 서비스 디렉토리 생성
  for (const service of ["tarot", "saju", "shinjeom"]) {
    const dir = path.join(outputRoot, service);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }

  const tasks = buildTaskList(outputRoot);
  const pending = SKIP_EXISTING ? tasks.filter((t) => !fs.existsSync(t.outputPath)) : tasks;

  console.log("=== 서비스별·테마별 세션 배경 이미지 생성 ===");
  console.log(`총 ${tasks.length}장 중 ${pending.length}장 생성 예정`);
  if (SKIP_EXISTING && pending.length < tasks.length) {
    console.log(`(${tasks.length - pending.length}장 이미 존재 — 건너뜀)\n`);
  } else {
    console.log();
  }

  let success = 0;
  let failed = 0;
  const skipped = tasks.length - pending.length;

  for (let i = 0; i < pending.length; i++) {
    const task = pending[i];
    const label = `[${task.service}/${task.theme}]`;
    console.log(`(${i + 1}/${pending.length}) ${label} 생성 중...`);

    const imageBuffer = await generateImage(task.prompt);
    if (imageBuffer) {
      fs.writeFileSync(task.outputPath, imageBuffer);
      console.log(`  ✅ 저장: ${task.outputPath}`);
      success++;
    } else {
      console.log(`  ❌ 실패: ${label}`);
      failed++;
    }

    if (i < pending.length - 1) {
      await sleep(2500);
    }
  }

  console.log(`\n=== 완료: 성공 ${success}, 실패 ${failed}, 건너뜀 ${skipped} ===`);
  if (failed > 0) {
    console.log("실패한 이미지는 --skip 옵션으로 재실행하면 성공한 이미지를 건너뛰고 재시도합니다.");
  }
}

main().catch(console.error);
