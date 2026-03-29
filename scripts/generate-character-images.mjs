/**
 * Grok API를 사용하여 아르카나 캐릭터 6가지 표정 이미지를 생성하는 스크립트
 *
 * 사용법: node scripts/generate-character-images.mjs
 * 필요: GROK_API_KEY 환경변수 (.env.local에서 로드)
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

// .env.local에서 API 키 로드
const envPath = path.join(ROOT, ".env.local");
const envContent = fs.readFileSync(envPath, "utf-8");
const apiKey = envContent.match(/GROK_API_KEY=(.+)/)?.[1]?.trim();

if (!apiKey) {
  console.error("GROK_API_KEY를 .env.local에서 찾을 수 없습니다.");
  process.exit(1);
}

const OUTPUT_DIR = path.join(ROOT, "public/images/characters/arcana/sprites");

// 캐릭터 기본 설명 (일관성 유지용)
const BASE_CHARACTER = `anime style illustration, high quality, detailed.
A mystical silver-haired anime girl with cat ears, purple eyes, long flowing silver hair.
She wears an elegant dark purple and black dress with gold magical rune accents.
She holds a glowing crystal ball. Floating tarot cards surround her.
Cosmic starry night background with purple nebula.
Upper body portrait, centered composition, dark mystical atmosphere.
Semi-transparent background suitable for game character overlay.`;

// 6가지 표정/동작별 프롬프트
const MOODS = [
  {
    name: "idle",
    prompt: `${BASE_CHARACTER}
Expression: calm, serene, neutral expression with slight gentle smile. Eyes looking forward warmly.
Pose: standing gracefully, holding crystal ball gently in both hands at chest level.
Mood: peaceful, welcoming, ready to listen.`,
  },
  {
    name: "talking",
    prompt: `${BASE_CHARACTER}
Expression: friendly, engaged, mouth slightly open as if speaking, eyes bright and attentive.
Pose: one hand gesturing gracefully while speaking, other hand holding crystal ball.
Mood: warm conversation, explaining something with enthusiasm.`,
  },
  {
    name: "happy",
    prompt: `${BASE_CHARACTER}
Expression: bright warm smile, eyes sparkling with joy, cheeks slightly blushing.
Pose: both hands clasped together happily near chest, crystal ball floating nearby with sparkles.
Mood: delighted, joyful, celebrating good fortune in a reading.`,
  },
  {
    name: "serious",
    prompt: `${BASE_CHARACTER}
Expression: focused, concentrated, slightly furrowed brows, determined eyes looking at crystal ball.
Pose: holding crystal ball up with one hand, other hand touching chin thoughtfully.
Mood: deep concentration, reading an important card, contemplative.`,
  },
  {
    name: "mystical",
    prompt: `${BASE_CHARACTER}
Expression: eyes closed peacefully, serene mystical expression, glowing purple aura around her.
Pose: arms outstretched with palms up, crystal ball floating between hands emanating purple magical energy.
Tarot cards swirling in a magical spiral around her. Intense purple and gold magical particles.
Mood: channeling supernatural power, deep in mystical reading, ethereal.`,
  },
  {
    name: "surprised",
    prompt: `${BASE_CHARACTER}
Expression: wide eyes with surprise and wonder, mouth slightly open in amazement, raised eyebrows.
Pose: one hand raised to mouth in surprise, crystal ball glowing brightly with unexpected energy.
Mood: astonished by an unexpected card combination, excited discovery.`,
  },
];

async function generateImage(mood) {
  console.log(`🎨 [${mood.name}] 이미지 생성 중...`);

  const response = await fetch("https://api.x.ai/v1/images/generations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "grok-imagine-image-pro",
      prompt: mood.prompt,
      n: 1,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error(`❌ [${mood.name}] API 에러 (${response.status}): ${error}`);
    return false;
  }

  const data = await response.json();

  // xAI API는 b64_json 또는 url 형식으로 반환
  const imageData = data.data?.[0];
  if (!imageData) {
    console.error(`❌ [${mood.name}] 이미지 데이터 없음`);
    return false;
  }

  const outputPath = path.join(OUTPUT_DIR, `${mood.name}.png`);

  if (imageData.b64_json) {
    const buffer = Buffer.from(imageData.b64_json, "base64");
    fs.writeFileSync(outputPath, buffer);
  } else if (imageData.url) {
    // URL인 경우 다운로드
    const imgResponse = await fetch(imageData.url);
    const arrayBuffer = await imgResponse.arrayBuffer();
    fs.writeFileSync(outputPath, Buffer.from(arrayBuffer));
  } else {
    console.error(`❌ [${mood.name}] 알 수 없는 응답 형식:`, JSON.stringify(data).slice(0, 200));
    return false;
  }

  console.log(`✅ [${mood.name}] 저장 완료: ${outputPath}`);
  return true;
}

async function main() {
  console.log("=== 아르카나 캐릭터 이미지 생성 시작 ===\n");

  // 출력 디렉토리 확인
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  let success = 0;
  let fail = 0;

  for (const mood of MOODS) {
    try {
      const result = await generateImage(mood);
      if (result) success++;
      else fail++;
    } catch (err) {
      console.error(`❌ [${mood.name}] 예외:`, err.message);
      fail++;
    }

    // API rate limit 방지 (2초 대기)
    if (MOODS.indexOf(mood) < MOODS.length - 1) {
      console.log("   ⏳ 2초 대기...\n");
      await new Promise((r) => setTimeout(r, 2000));
    }
  }

  console.log(`\n=== 완료: ${success}개 성공, ${fail}개 실패 ===`);

  if (success > 0) {
    console.log("\n다음 단계:");
    console.log("1. public/images/characters/arcana/sprites/ 에서 생성된 이미지를 확인하세요");
    console.log("2. SpriteAnimator가 .png 파일을 참조하도록 업데이트하세요");
  }
}

main().catch(console.error);
