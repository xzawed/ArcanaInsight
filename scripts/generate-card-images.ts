/**
 * Grok Aurora를 사용한 타로 카드 이미지 생성 스크립트
 *
 * 사용법:
 *   GROK_API_KEY=your_key pnpm tsx scripts/generate-card-images.ts
 *   GROK_API_KEY=your_key pnpm tsx scripts/generate-card-images.ts --only=major  (메이저만)
 *   GROK_API_KEY=your_key pnpm tsx scripts/generate-card-images.ts --only=back   (뒷면만)
 *   GROK_API_KEY=your_key pnpm tsx scripts/generate-card-images.ts --card=major-00 (특정 카드)
 */

import fs from "fs";
import path from "path";

const API_KEY = process.env.GROK_API_KEY;
const API_URL = "https://api.x.ai/v1/images/generations";
const MODEL = "grok-imagine-image-pro";
const OUTPUT_DIR = path.join(process.cwd(), "public/images/cards");

if (!API_KEY || API_KEY === "your_grok_api_key") {
  console.error("❌ GROK_API_KEY 환경변수를 설정해주세요.");
  process.exit(1);
}

// === 카드 정의 ===

const majorArcana = [
  { id: "major-00", name: "The Fool", nameKo: "바보", keywords: "새로운 시작, 모험, 순수, 자유" },
  { id: "major-01", name: "The Magician", nameKo: "마법사", keywords: "의지력, 창조, 기술, 집중" },
  { id: "major-02", name: "The High Priestess", nameKo: "여교황", keywords: "직관, 신비, 내면의 지혜" },
  { id: "major-03", name: "The Empress", nameKo: "여황제", keywords: "풍요, 모성, 자연, 아름다움" },
  { id: "major-04", name: "The Emperor", nameKo: "황제", keywords: "권위, 구조, 안정, 리더십" },
  { id: "major-05", name: "The Hierophant", nameKo: "교황", keywords: "전통, 가르침, 영적 지도" },
  { id: "major-06", name: "The Lovers", nameKo: "연인", keywords: "사랑, 선택, 조화, 관계" },
  { id: "major-07", name: "The Chariot", nameKo: "전차", keywords: "승리, 의지, 전진, 결단" },
  { id: "major-08", name: "Strength", nameKo: "힘", keywords: "용기, 인내, 내면의 힘" },
  { id: "major-09", name: "The Hermit", nameKo: "은둔자", keywords: "성찰, 고독, 내면 탐색" },
  { id: "major-10", name: "Wheel of Fortune", nameKo: "운명의 수레바퀴", keywords: "변화, 운명, 순환" },
  { id: "major-11", name: "Justice", nameKo: "정의", keywords: "공정, 균형, 진실, 법" },
  { id: "major-12", name: "The Hanged Man", nameKo: "매달린 사람", keywords: "희생, 새로운 관점, 기다림" },
  { id: "major-13", name: "Death", nameKo: "죽음", keywords: "변환, 끝과 시작, 재탄생" },
  { id: "major-14", name: "Temperance", nameKo: "절제", keywords: "균형, 조화, 인내, 치유" },
  { id: "major-15", name: "The Devil", nameKo: "악마", keywords: "유혹, 속박, 그림자, 욕망" },
  { id: "major-16", name: "The Tower", nameKo: "탑", keywords: "붕괴, 해방, 각성, 충격" },
  { id: "major-17", name: "The Star", nameKo: "별", keywords: "희망, 영감, 치유, 평화" },
  { id: "major-18", name: "The Moon", nameKo: "달", keywords: "환상, 불안, 직감, 무의식" },
  { id: "major-19", name: "The Sun", nameKo: "태양", keywords: "기쁨, 성공, 활력, 행복" },
  { id: "major-20", name: "Judgement", nameKo: "심판", keywords: "부활, 심판, 각성, 용서" },
  { id: "major-21", name: "The World", nameKo: "세계", keywords: "완성, 성취, 통합, 여행" },
];

const suits = ["wands", "cups", "swords", "pentacles"];
const suitNames: Record<string, { en: string; ko: string; element: string }> = {
  wands: { en: "Wands", ko: "완드", element: "불" },
  cups: { en: "Cups", ko: "컵", element: "물" },
  swords: { en: "Swords", ko: "검", element: "바람" },
  pentacles: { en: "Pentacles", ko: "펜타클", element: "땅" },
};

const minorNames = [
  "Ace", "Two", "Three", "Four", "Five", "Six", "Seven",
  "Eight", "Nine", "Ten", "Page", "Knight", "Queen", "King",
];

// === 프롬프트 생성 ===

const STYLE_PREFIX = `Ultra-premium luxury tarot card illustration. Elegant Art Nouveau style with rich deep purple, midnight blue, and luminous gold leaf accents. Ethereal glowing light effects with soft bokeh. Hand-painted oil painting quality with intricate fine details. Ornate gilded border with delicate filigree patterns. Vertical card format 2:3 ratio. No text, numbers, or letters on the card. Museum-quality fine art aesthetic.`;

function buildMajorPrompt(card: typeof majorArcana[0]): string {
  return `${STYLE_PREFIX} The "${card.name}" tarot card (Major Arcana). Symbolizing: ${card.keywords}. An elegant, regal figure in flowing robes surrounded by celestial light and symbolic elements. Renaissance master painting quality with magical luminescence. Rich jewel-tone colors with gold highlights.`;
}

function buildMinorPrompt(suit: string, number: number, name: string): string {
  const s = suitNames[suit];
  const suitObj = suit === "wands" ? "ornate golden staff" : suit === "cups" ? "jeweled crystal chalice" : suit === "swords" ? "silver ceremonial sword" : "ancient gold coin with mystical engravings";
  return `${STYLE_PREFIX} The "${name} of ${s.en}" tarot card (Minor Arcana). ${s.element} element theme. ${number <= 10 ? `Elegant arrangement of ${number} beautifully crafted ${s.en.toLowerCase()} with magical aura.` : `A noble ${name.toLowerCase()} figure holding a ${suitObj}, dressed in luxurious royal attire.`} Sophisticated ${s.element}-themed atmosphere with ethereal lighting.`;
}

function buildBackPrompt(): string {
  return `${STYLE_PREFIX} The back design of a premium tarot card. Breathtaking symmetrical sacred geometry mandala with interlocking golden circles, celestial constellations, crescent moon, radiant sun, and mystical eye of providence at center. Deep royal purple and burnished gold palette. Intricate Art Nouveau floral border. Timeless, luxurious, museum-quality decorative art.`;
}

// === API 호출 ===

async function generateImage(prompt: string, outputPath: string): Promise<boolean> {
  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        prompt,
        n: 1,
        response_format: "b64_json",
      }),
    });

    if (!res.ok) {
      const error = await res.text();
      console.error(`  ✗ API 오류 (${res.status}): ${error.slice(0, 200)}`);
      return false;
    }

    const data = await res.json();
    const b64 = data.data?.[0]?.b64_json;
    if (!b64) {
      console.error("  ✗ 이미지 데이터 없음");
      return false;
    }

    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    fs.writeFileSync(outputPath, Buffer.from(b64, "base64"));
    console.log(`  ✓ ${path.basename(outputPath)} 생성 완료`);
    return true;
  } catch (e) {
    console.error(`  ✗ 네트워크 오류:`, e instanceof Error ? e.message : e);
    return false;
  }
}

// 속도 제한: 요청 간 2초 대기
function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// === 메인 실행 ===

async function main() {
  const args = process.argv.slice(2);
  const onlyFlag = args.find((a) => a.startsWith("--only="))?.split("=")[1];
  const cardFlag = args.find((a) => a.startsWith("--card="))?.split("=")[1];

  console.log("🃏 Grok Aurora 타로 카드 이미지 생성");
  console.log("=====================================\n");

  let generated = 0;
  let failed = 0;

  // 카드 뒷면
  if (!onlyFlag || onlyFlag === "back") {
    if (!cardFlag) {
      console.log("📦 카드 뒷면 생성...");
      const outputPath = path.join(OUTPUT_DIR, "card-back.png");
      const ok = await generateImage(buildBackPrompt(), outputPath);
      if (ok) generated++; else failed++;
      await delay(2000);
    }
  }

  // 메이저 아르카나
  if (!onlyFlag || onlyFlag === "major") {
    console.log("\n📦 메이저 아르카나 (22장)...");
    for (const card of majorArcana) {
      if (cardFlag && card.id !== cardFlag) continue;
      const outputPath = path.join(OUTPUT_DIR, "major", `${card.id}.png`);
      console.log(`  [${card.id}] ${card.nameKo} (${card.name})`);
      const ok = await generateImage(buildMajorPrompt(card), outputPath);
      if (ok) generated++; else failed++;
      await delay(2000);
    }
  }

  // 마이너 아르카나
  if (!onlyFlag || onlyFlag === "minor") {
    for (const suit of suits) {
      console.log(`\n📦 마이너 아르카나 — ${suitNames[suit].ko} (14장)...`);
      for (let i = 0; i < 14; i++) {
        const num = i + 1;
        const id = `${suit}-${String(num).padStart(2, "0")}`;
        if (cardFlag && id !== cardFlag) continue;
        const outputPath = path.join(OUTPUT_DIR, suit, `${id}.png`);
        console.log(`  [${id}] ${minorNames[i]} of ${suitNames[suit].en}`);
        const ok = await generateImage(buildMinorPrompt(suit, num, minorNames[i]), outputPath);
        if (ok) generated++; else failed++;
        await delay(2000);
      }
    }
  }

  console.log("\n=====================================");
  console.log(`✅ 생성: ${generated}장 | ❌ 실패: ${failed}장`);
  console.log(`📂 출력: ${OUTPUT_DIR}`);
}

main().catch(console.error);
