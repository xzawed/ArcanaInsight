/**
 * 4캐릭터 × 6표정 = 24장 전체 재생성
 * 모든 이미지를 세로 규격(portrait)으로 통일
 * 사용법: node scripts/regenerate-all-nukki.mjs
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const envContent = fs.readFileSync(path.join(ROOT, ".env.local"), "utf-8");
const apiKey = envContent.match(/GROK_API_KEY=(.+)/)?.[1]?.trim();
if (!apiKey) { console.error("GROK_API_KEY not found"); process.exit(1); }

// 공통 스타일 지시 (모든 캐릭터에 동일 적용)
const STYLE_PREFIX = `anime illustration, high quality, detailed, vertical portrait orientation, upper body to waist shot, centered composition, dark purple cosmic starry background with nebula. Single character only, no text, no watermark.`;

const CHARACTERS = {
  arcana: `${STYLE_PREFIX}
Character: A mystical anime girl with silver-white long flowing hair and cat ears on top of her head. She has striking purple eyes. She wears an elegant dark purple and black Victorian-style dress decorated with golden magical rune patterns and accents. She holds a glowing purple crystal ball. Her overall appearance is mysterious and enchanting.`,

  miko: `${STYLE_PREFIX}
Character: A Japanese shrine maiden (miko) anime girl with long straight black hair tied with a large red ribbon bow. She has gentle dark brown eyes. She wears a traditional white kosode top and red hakama pants, with golden ornamental pins. She holds sacred paper talismans (ofuda). Her appearance is serene and spiritual.`,

  seonhwa: `${STYLE_PREFIX}
Character: An elegant Korean celestial maiden anime girl with long dark brown wavy hair decorated with pink cherry blossom flower ornaments and golden hairpins. She has warm brown eyes. She wears a beautiful pink and white Korean hanbok with fantasy-style flowing silk ribbons. She holds an ornate folding fan. Her appearance is graceful and noble.`,

  hoshi: `${STYLE_PREFIX}
Character: A cheerful and energetic anime girl spirit with short bobcut hair in pastel gradient colors (light blue to pink). She has bright sparkling blue eyes. She wears a pastel-toned frilly outfit with star and constellation motifs, decorated with small star accessories. She has a lively and cute appearance.`,
};

const EXPRESSIONS = {
  idle:      "Expression: calm and serene with a gentle soft smile, relaxed natural standing pose, hands gently held together at waist level.",
  talking:   "Expression: friendly and engaged, mouth slightly open as if speaking warmly, one hand raised in a graceful explaining gesture.",
  happy:     "Expression: bright joyful smile with sparkling eyes, slight head tilt, both hands clasped together near chest in delight.",
  serious:   "Expression: focused and contemplative, slightly furrowed brows, one hand touching chin in deep thought, intense gaze.",
  mystical:  "Expression: eyes peacefully closed, serene mystical aura, both arms slightly raised with palms open, glowing purple magical energy around hands.",
  surprised: "Expression: wide eyes with wonder and amazement, mouth slightly open in surprise, one hand raised near mouth in astonishment.",
};

const MAX_RETRIES = 3;
const DELAY_MS = 3000;

async function generateImage(charId, charPrompt, moodName, moodDesc, attempt = 1) {
  const prompt = `${charPrompt}\n${moodDesc}`;

  const response = await fetch("https://api.x.ai/v1/images/generations", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: "grok-imagine-image-pro", prompt, n: 1 }),
  });

  if (!response.ok) {
    const errText = await response.text();
    if (response.status === 503 && attempt < MAX_RETRIES) {
      console.log(`    ⏳ 503 에러, ${attempt + 1}번째 재시도 (5초 대기)...`);
      await new Promise(r => setTimeout(r, 5000));
      return generateImage(charId, charPrompt, moodName, moodDesc, attempt + 1);
    }
    console.error(`  ❌ [${charId}/${moodName}] 실패 (${response.status}): ${errText.slice(0, 100)}`);
    return false;
  }

  const data = await response.json();
  const img = data.data?.[0];
  const outDir = path.join(ROOT, `public/images/characters/${charId}/nukki`);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, `${moodName}.png`);

  if (img?.b64_json) {
    fs.writeFileSync(outPath, Buffer.from(img.b64_json, "base64"));
  } else if (img?.url) {
    const ir = await fetch(img.url);
    fs.writeFileSync(outPath, Buffer.from(await ir.arrayBuffer()));
  } else {
    console.error(`  ❌ [${charId}/${moodName}] 알 수 없는 응답`);
    return false;
  }

  // 해상도 확인
  const buf = fs.readFileSync(outPath);
  let w = "?", h = "?";
  for (let i = 0; i < buf.length - 10; i++) {
    if (buf[i] === 0xFF && (buf[i+1] === 0xC0 || buf[i+1] === 0xC2)) {
      h = buf.readUInt16BE(i + 5);
      w = buf.readUInt16BE(i + 7);
      break;
    }
  }
  console.log(`  ✅ [${charId}/${moodName}] ${w}x${h}`);
  return true;
}

async function main() {
  console.log("=== 전체 누끼 이미지 재생성 (4캐릭터 × 6표정 = 24장) ===");
  console.log("=== 모든 이미지를 세로 portrait 규격으로 통일 ===\n");

  let success = 0, fail = 0;
  const charEntries = Object.entries(CHARACTERS);

  for (const [charId, charPrompt] of charEntries) {
    console.log(`\n📌 ${charId} 캐릭터:`);
    for (const [moodName, moodDesc] of Object.entries(EXPRESSIONS)) {
      try {
        const ok = await generateImage(charId, charPrompt, moodName, moodDesc);
        if (ok) success++; else fail++;
      } catch (e) {
        console.error(`  ❌ [${charId}/${moodName}] 예외:`, e.message);
        fail++;
      }
      await new Promise(r => setTimeout(r, DELAY_MS));
    }
  }

  console.log(`\n=== 완료: ${success}개 성공, ${fail}개 실패 ===`);

  if (fail > 0) {
    console.log("\n실패한 이미지는 스크립트를 다시 실행하면 덮어쓰기됩니다.");
  }
}

main().catch(console.error);
