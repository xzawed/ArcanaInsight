/**
 * Grok API를 사용한 캐릭터 이미지 생성 스크립트
 *
 * 사용법: npx tsx scripts/generate-characters.ts
 *
 * 환경변수 필요: GROK_API_KEY (.env.local에서 자동 로드)
 */

import * as fs from "fs";
import * as path from "path";
import * as https from "https";

// .env.local 수동 파싱 (dotenv 의존성 없이)
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

if (!API_KEY) {
  console.error("GROK_API_KEY가 .env.local에 설정되어 있지 않습니다.");
  process.exit(1);
}

// 캐릭터별 기본 외형 프롬프트
const characterBase: Record<string, string> = {
  arcana: [
    "anime style illustration, beautiful sexy young woman, silver hair with cat ears,",
    "purple glowing eyes, wearing a low-cut dark purple witch robe with gold trim,",
    "holding a crystal ball, mystical tarot cards floating around her,",
    "soft moonlight, magical sparkles, dark mystical background with stars,",
    "detailed anime art, high quality, vibrant colors",
  ].join(" "),

  miko: [
    "anime style illustration, beautiful sexy young woman, long straight black hair,",
    "deep red eyes, wearing a traditional Japanese shrine maiden outfit (miko),",
    "white haori with revealing neckline, red hakama, red ribbon in hair,",
    "holding sacred paper streamers (shide), spiritual energy aura,",
    "shrine background with torii gate, cherry blossoms, detailed anime art, high quality",
  ].join(" "),

  seonhwa: [
    "anime style illustration, beautiful sexy young woman, elegant long flowing hair with flower ornaments,",
    "golden eyes, wearing a fantasy fusion Korean hanbok dress, low shoulder design,",
    "holding a celestial fan with star patterns, floating flower petals around her,",
    "ethereal heavenly background with clouds and constellations,",
    "detailed anime art, high quality, pastel and gold color palette",
  ].join(" "),

  hoshi: [
    "anime style illustration, cute handsome young boy, short messy pastel blue hair,",
    "bright starry eyes with star-shaped pupils, wearing a celestial themed outfit,",
    "star-patterned cape with constellation embroidery, crescent moon accessory,",
    "energetic cheerful pose, surrounded by floating stars and sparkles,",
    "dreamy galaxy background, detailed anime art, high quality, pastel color palette",
  ].join(" "),
};

// 무드별 추가 프롬프트
const moodModifiers: Record<string, string> = {
  default: "neutral calm expression, gentle posture, looking at viewer",
  smile: "warm bright smile, happy expression, slightly tilted head, cheerful mood",
  serious: "serious focused expression, sharp gaze, intense eyes, determined look",
  surprised: "surprised expression, wide open eyes, open mouth, shocked reaction",
  wink: "playful wink, one eye closed, flirty expression, charming smile, cute pose",
  mystical: "mystical glowing aura, closed eyes in meditation, ethereal light surrounding, magical energy",
};

interface GenerationResult {
  characterId: string;
  mood: string;
  success: boolean;
  filePath?: string;
  error?: string;
}

async function generateImage(prompt: string): Promise<Buffer | null> {
  const body = JSON.stringify({
    model: "grok-imagine-image",
    prompt,
    n: 1,
    response_format: "b64_json",
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
          const json = JSON.parse(responseBody);

          if (json.error) {
            console.error(`  API 에러: ${json.error.message || JSON.stringify(json.error)}`);
            resolve(null);
            return;
          }

          const b64 = json.data?.[0]?.b64_json;
          if (!b64) {
            console.error("  응답에 이미지 데이터가 없습니다:", JSON.stringify(json).slice(0, 200));
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

    req.on("error", (e) => {
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
  const outputBase = path.resolve(process.cwd(), "public/images/characters");
  const characterIds = Object.keys(characterBase);
  const moods = Object.keys(moodModifiers);
  const results: GenerationResult[] = [];

  const total = characterIds.length * moods.length;
  let current = 0;

  console.log("=== ArcanaInsight 캐릭터 이미지 생성 ===");
  console.log(`캐릭터: ${characterIds.join(", ")}`);
  console.log(`무드: ${moods.join(", ")}`);
  console.log(`총 ${total}장 생성 예정\n`);

  for (const charId of characterIds) {
    const charDir = path.join(outputBase, charId);
    if (!fs.existsSync(charDir)) {
      fs.mkdirSync(charDir, { recursive: true });
    }

    console.log(`\n📌 [${charId}] 캐릭터 이미지 생성 시작`);

    for (const mood of moods) {
      current++;
      const prompt = `${characterBase[charId]}, ${moodModifiers[mood]}`;
      const filePath = path.join(charDir, `${mood}.jpg`);

      console.log(`  (${current}/${total}) ${charId}/${mood} 생성 중...`);

      const imageBuffer = await generateImage(prompt);

      if (imageBuffer) {
        fs.writeFileSync(filePath, imageBuffer);
        console.log(`  ✅ 저장 완료: ${filePath}`);
        results.push({ characterId: charId, mood, success: true, filePath });
      } else {
        console.log(`  ❌ 생성 실패: ${charId}/${mood}`);
        results.push({ characterId: charId, mood, success: false, error: "생성 실패" });
      }

      // API rate limit 방지 (요청 간 2초 대기)
      if (current < total) {
        await sleep(2000);
      }
    }
  }

  // 결과 요약
  console.log("\n=== 생성 결과 요약 ===");
  const succeeded = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;
  console.log(`성공: ${succeeded}/${total}, 실패: ${failed}/${total}`);

  if (failed > 0) {
    console.log("\n실패 목록:");
    results
      .filter((r) => !r.success)
      .forEach((r) => console.log(`  - ${r.characterId}/${r.mood}: ${r.error}`));
  }

  // 프롬프트 로그 저장 (재생성 시 참고용)
  const logPath = path.join(outputBase, "generation-log.json");
  const logData = {
    generatedAt: new Date().toISOString(),
    model: "grok-imagine-image",
    results: results.map((r) => ({
      ...r,
      prompt: `${characterBase[r.characterId]}, ${moodModifiers[r.mood]}`,
    })),
  };
  fs.writeFileSync(logPath, JSON.stringify(logData, null, 2), "utf-8");
  console.log(`\n프롬프트 로그 저장: ${logPath}`);
}

main().catch(console.error);
