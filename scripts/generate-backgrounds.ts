/**
 * 각 페이지별 배경/장식 이미지 생성 스크립트
 * 사용법: node --import tsx scripts/generate-backgrounds.ts
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

if (!API_KEY) {
  console.error("GROK_API_KEY가 설정되어 있지 않습니다.");
  process.exit(1);
}

// 각 페이지별 이미지 프롬프트 정의
const imagePrompts: Array<{ name: string; prompt: string; aspectRatio?: string }> = [
  // 홈 히어로 배경
  {
    name: "hero-bg",
    prompt: [
      "anime style fantasy background, mystical tarot reading room,",
      "floating tarot cards and crystal balls, soft purple and indigo lighting,",
      "magical sparkles and stars, dreamy atmosphere with floating candles,",
      "ornate mystical decorations, crescent moons, celestial patterns,",
      "soft bokeh lights, warm cozy magical atmosphere,",
      "wide panoramic view, high quality anime background art",
    ].join(" "),
    aspectRatio: "16:9",
  },
  // 타로 주제 선택 페이지 배경
  {
    name: "tarot-topic-bg",
    prompt: [
      "anime style fantasy background, mystical fortune teller's table,",
      "spread tarot cards on velvet cloth, crystal ball centerpiece,",
      "incense smoke wisps, candlelight ambiance, purple and gold tones,",
      "zodiac symbols floating in air, mysterious magical setting,",
      "soft dreamy lighting, high quality anime background art",
    ].join(" "),
    aspectRatio: "16:9",
  },
  // 타로 세션 배경
  {
    name: "session-bg",
    prompt: [
      "anime style fantasy background, enchanted reading chamber,",
      "circular magic circle on floor glowing purple, floating orbs of light,",
      "tall arched windows showing starry night sky, curtains flowing,",
      "mystical runes on walls, ethereal mist, candelabras with soft flames,",
      "deep purple and midnight blue atmosphere, high quality anime art",
    ].join(" "),
    aspectRatio: "16:9",
  },
  // 결과 페이지 배경
  {
    name: "result-bg",
    prompt: [
      "anime style fantasy background, celestial revelation scene,",
      "golden light rays streaming through clouds, constellation map overlay,",
      "mystical garden with glowing flowers, floating golden particles,",
      "dreamy ethereal atmosphere, purple sky with aurora borealis,",
      "peaceful magical scenery, high quality anime background art",
    ].join(" "),
    aspectRatio: "16:9",
  },
  // 마이페이지 배경
  {
    name: "mypage-bg",
    prompt: [
      "anime style fantasy background, cozy magical study room,",
      "bookshelves filled with ancient tomes, desk with tarot cards and journals,",
      "warm candlelight, window showing moonlit night, hanging crystals,",
      "comfortable magical atmosphere, personal sanctuary vibes,",
      "soft warm lighting, high quality anime background art",
    ].join(" "),
    aspectRatio: "16:9",
  },
  // 로그인 페이지 배경
  {
    name: "login-bg",
    prompt: [
      "anime style fantasy background, magical gateway portal,",
      "ornate door with mystical symbols and runes, purple glowing edges,",
      "floating keys and lock symbols, starry void beyond the door,",
      "welcoming mysterious atmosphere, soft ethereal lighting,",
      "fantasy entrance scene, high quality anime background art",
    ].join(" "),
    aspectRatio: "9:16",
  },
  // 장식 요소 - 떠다니는 타로 카드
  {
    name: "deco-floating-cards",
    prompt: [
      "anime style illustration, floating tarot cards arrangement,",
      "glowing mystical cards scattered in air, golden edges,",
      "magical sparkle trails behind cards, transparent/dark background,",
      "ethereal glow effect, purple and gold color scheme,",
      "decorative fantasy element, high quality anime art",
    ].join(" "),
  },
  // 장식 요소 - 수정구슬
  {
    name: "deco-crystal-ball",
    prompt: [
      "anime style illustration, beautiful glowing crystal ball,",
      "swirling mystical energy inside, purple and blue reflections,",
      "sitting on ornate golden stand, magical particles around it,",
      "soft ethereal glow, dark background, fortune telling theme,",
      "decorative fantasy element, high quality anime art",
    ].join(" "),
  },
  // 장식 요소 - 마법진
  {
    name: "deco-magic-circle",
    prompt: [
      "anime style illustration, intricate magical circle pattern,",
      "glowing purple runes and symbols, zodiac signs around edge,",
      "celestial star pattern in center, mystical energy emanating,",
      "dark background, top-down view of magic circle on floor,",
      "ethereal glow effect, high quality anime art",
    ].join(" "),
  },
  // 카드 뒷면 디자인
  {
    name: "card-back-design",
    prompt: [
      "anime style illustration, ornate tarot card back design,",
      "intricate mystical pattern with crescent moon centerpiece,",
      "surrounded by stars and celestial symbols, purple and gold colors,",
      "art nouveau border design, symmetrical sacred geometry,",
      "premium elegant design, dark purple background, high quality art",
    ].join(" "),
    aspectRatio: "2:3",
  },
];

async function generateImage(prompt: string, aspectRatio?: string): Promise<Buffer | null> {
  const body = JSON.stringify({
    model: "grok-imagine-image",
    prompt,
    n: 1,
    response_format: "b64_json",
    ...(aspectRatio && { aspect_ratio: aspectRatio }),
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
  const outputDir = path.resolve(process.cwd(), "public/images/backgrounds");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log("=== 페이지 배경/장식 이미지 생성 ===");
  console.log(`총 ${imagePrompts.length}장 생성 예정\n`);

  let success = 0;
  let failed = 0;

  for (let i = 0; i < imagePrompts.length; i++) {
    const item = imagePrompts[i];
    const filePath = path.join(outputDir, `${item.name}.jpg`);
    console.log(`(${i + 1}/${imagePrompts.length}) ${item.name} 생성 중...`);

    const imageBuffer = await generateImage(item.prompt, item.aspectRatio);

    if (imageBuffer) {
      fs.writeFileSync(filePath, imageBuffer);
      console.log(`  ✅ 저장: ${filePath}`);
      success++;
    } else {
      console.log(`  ❌ 실패: ${item.name}`);
      failed++;
    }

    if (i < imagePrompts.length - 1) {
      await sleep(2000);
    }
  }

  console.log(`\n=== 완료: 성공 ${success}, 실패 ${failed} ===`);
}

main().catch(console.error);
