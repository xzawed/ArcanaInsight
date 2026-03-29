/**
 * Grok API로 4캐릭터 × 6표정 투명 배경 누끼 이미지 생성
 * 사용법: node scripts/generate-nukki-images.mjs
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const envContent = fs.readFileSync(path.join(ROOT, ".env.local"), "utf-8");
const apiKey = envContent.match(/GROK_API_KEY=(.+)/)?.[1]?.trim();
if (!apiKey) { console.error("GROK_API_KEY not found"); process.exit(1); }

const CHARACTERS = [
  {
    id: "arcana",
    base: `anime style illustration, high quality, detailed, full body, white solid background, character only, no background elements, no scenery.
A mystical silver-haired anime girl with cat ears, purple eyes, long flowing silver hair.
She wears an elegant dark purple and black dress with gold magical rune accents.
She holds a glowing crystal ball. Standing pose, facing forward.`,
  },
  {
    id: "miko",
    base: `anime style illustration, high quality, detailed, full body, white solid background, character only, no background elements, no scenery.
A solemn yet compassionate shrine maiden (miko) with long black hair tied with a red ribbon.
She wears a traditional white hakama and red shrine maiden outfit with spiritual talismans.
She holds sacred ofuda paper charms. Standing pose, facing forward.`,
  },
  {
    id: "seonhwa",
    base: `anime style illustration, high quality, detailed, full body, white solid background, character only, no background elements, no scenery.
An elegant and wise celestial maiden with long dark brown hair adorned with flower ornaments.
She wears a Korean hanbok mixed with fantasy elements in soft pink and white colors.
She holds an ornate fan. Standing pose, facing forward.`,
  },
  {
    id: "hoshi",
    base: `anime style illustration, high quality, detailed, full body, white solid background, character only, no background elements, no scenery.
A bright and energetic star spirit girl with short pastel-colored hair (light blue and pink).
She wears a pastel-toned outfit with star motifs and constellation patterns.
Cheerful and lively expression. Standing pose, facing forward.`,
  },
];

const MOODS = [
  { file: "idle", desc: "calm, serene, neutral expression with gentle smile, hands at rest" },
  { file: "talking", desc: "friendly, mouth slightly open speaking, one hand gesturing" },
  { file: "happy", desc: "bright warm smile, eyes sparkling with joy, hands clasped happily" },
  { file: "serious", desc: "focused concentrated expression, slightly furrowed brows, hand on chin" },
  { file: "mystical", desc: "eyes closed peacefully, glowing purple aura, arms outstretched, magical energy" },
  { file: "surprised", desc: "wide eyes with surprise, mouth open in amazement, hand raised to mouth" },
];

async function generateImage(characterId, base, mood) {
  const prompt = `${base}\nExpression and pose: ${mood.desc}`;
  console.log(`  🎨 [${characterId}/${mood.file}] 생성 중...`);

  const response = await fetch("https://api.x.ai/v1/images/generations", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: "grok-imagine-image-pro", prompt, n: 1 }),
  });

  if (!response.ok) {
    const err = await response.text();
    console.error(`  ❌ [${characterId}/${mood.file}] 실패 (${response.status}): ${err.slice(0, 100)}`);
    return false;
  }

  const data = await response.json();
  const img = data.data?.[0];
  const outDir = path.join(ROOT, `public/images/characters/${characterId}/nukki`);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, `${mood.file}.png`);

  if (img?.b64_json) {
    fs.writeFileSync(outPath, Buffer.from(img.b64_json, "base64"));
  } else if (img?.url) {
    const ir = await fetch(img.url);
    fs.writeFileSync(outPath, Buffer.from(await ir.arrayBuffer()));
  } else {
    console.error(`  ❌ [${characterId}/${mood.file}] 알 수 없는 응답`);
    return false;
  }

  console.log(`  ✅ [${characterId}/${mood.file}] 저장 완료`);
  return true;
}

async function main() {
  console.log("=== 누끼 이미지 생성 시작 (4캐릭터 × 6표정 = 24장) ===\n");
  let success = 0, fail = 0;

  for (const char of CHARACTERS) {
    console.log(`\n📌 ${char.id} 캐릭터:`);
    for (const mood of MOODS) {
      try {
        const ok = await generateImage(char.id, char.base, mood);
        if (ok) success++; else fail++;
      } catch (e) {
        console.error(`  ❌ [${char.id}/${mood.file}] 예외:`, e.message);
        fail++;
      }
      await new Promise((r) => setTimeout(r, 2500));
    }
  }

  console.log(`\n=== 완료: ${success}개 성공, ${fail}개 실패 ===`);
}

main().catch(console.error);
