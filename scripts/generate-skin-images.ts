/**
 * 카드 스킨 이미지 생성 스크립트 (Grok grok-2-image 모델 사용)
 *
 * 사용법:
 *   GROK_API_KEY=your_key pnpm tsx scripts/generate-skin-images.ts
 *   GROK_API_KEY=your_key pnpm tsx scripts/generate-skin-images.ts --skin=gold-luxury
 *   GROK_API_KEY=your_key pnpm tsx scripts/generate-skin-images.ts --skin=gold-luxury --card=major-00
 *   GROK_API_KEY=your_key pnpm tsx scripts/generate-skin-images.ts --skin=dark-gothic --back-only
 */

import fs from "fs";
import path from "path";

const API_KEY = process.env.GROK_API_KEY;
const API_URL = "https://api.x.ai/v1/images/generations";
const MODEL = "grok-2-image";
const OUTPUT_DIR = path.join(process.cwd(), "output/card-skins");

if (!API_KEY || API_KEY === "your_grok_api_key") {
  console.error("❌ GROK_API_KEY 환경변수를 설정해주세요.");
  process.exit(1);
}

// === 카드 정의 ===

const majorArcana = [
  { id: "major-00", name: "The Fool", keywords: "새로운 시작, 모험, 순수, 자유" },
  { id: "major-01", name: "The Magician", keywords: "의지력, 창조, 기술, 집중" },
  { id: "major-02", name: "The High Priestess", keywords: "직관, 신비, 내면의 지혜" },
  { id: "major-03", name: "The Empress", keywords: "풍요, 모성, 자연, 아름다움" },
  { id: "major-04", name: "The Emperor", keywords: "권위, 구조, 안정, 리더십" },
  { id: "major-05", name: "The Hierophant", keywords: "전통, 가르침, 영적 지도" },
  { id: "major-06", name: "The Lovers", keywords: "사랑, 선택, 조화, 관계" },
  { id: "major-07", name: "The Chariot", keywords: "승리, 의지, 전진, 결단" },
  { id: "major-08", name: "Strength", keywords: "용기, 인내, 내면의 힘" },
  { id: "major-09", name: "The Hermit", keywords: "성찰, 고독, 내면 탐색" },
  { id: "major-10", name: "Wheel of Fortune", keywords: "변화, 운명, 순환" },
  { id: "major-11", name: "Justice", keywords: "공정, 균형, 진실, 법" },
  { id: "major-12", name: "The Hanged Man", keywords: "희생, 새로운 관점, 기다림" },
  { id: "major-13", name: "Death", keywords: "변환, 끝과 시작, 재탄생" },
  { id: "major-14", name: "Temperance", keywords: "균형, 조화, 인내, 치유" },
  { id: "major-15", name: "The Devil", keywords: "유혹, 속박, 그림자, 욕망" },
  { id: "major-16", name: "The Tower", keywords: "붕괴, 해방, 각성, 충격" },
  { id: "major-17", name: "The Star", keywords: "희망, 영감, 치유, 평화" },
  { id: "major-18", name: "The Moon", keywords: "환상, 불안, 직감, 무의식" },
  { id: "major-19", name: "The Sun", keywords: "기쁨, 성공, 활력, 행복" },
  { id: "major-20", name: "Judgement", keywords: "부활, 심판, 각성, 용서" },
  { id: "major-21", name: "The World", keywords: "완성, 성취, 통합, 여행" },
];

const suits = ["wands", "cups", "swords", "pentacles"] as const;
type Suit = (typeof suits)[number];

const suitNames: Record<Suit, { en: string; ko: string; element: string }> = {
  wands: { en: "Wands", ko: "완드", element: "fire" },
  cups: { en: "Cups", ko: "컵", element: "water" },
  swords: { en: "Swords", ko: "검", element: "air" },
  pentacles: { en: "Pentacles", ko: "펜타클", element: "earth" },
};

const minorNames = [
  "Ace", "Two", "Three", "Four", "Five", "Six", "Seven",
  "Eight", "Nine", "Ten", "Page", "Knight", "Queen", "King",
];

// === 스킨 정의 ===

interface SkinDefinition {
  id: string;
  nameKo: string;
  stylePrefix: string;
  backPrompt: string;
}

const QUALITY_SUFFIX =
  "Ultra-detailed, museum-quality fine art. No text, numbers, or letters on the card. Vertical tarot card format 2:3 ratio.";

const skins: SkinDefinition[] = [
  {
    id: "gold-luxury",
    nameKo: "골드 럭셔리",
    stylePrefix:
      "Ultra-premium luxury tarot card illustration. Elegant Art Nouveau style with rich deep midnight blue background and luminous gold leaf accents. Hand-painted oil painting quality with ornate gilded borders and delicate filigree patterns. Rich jewel-tone colors with gold highlights. Ethereal glowing light effects.",
    backPrompt:
      "Ultra-premium luxury tarot card back. Breathtaking symmetrical sacred geometry mandala with interlocking golden circles, celestial constellations, crescent moon, radiant sun, and mystical eye of providence at center. Deep midnight blue and burnished gold palette. Intricate Art Nouveau floral border. Timeless, luxurious, museum-quality decorative art. Ultra-detailed, museum-quality fine art. No text, numbers, or letters on the card. Vertical tarot card format 2:3 ratio.",
  },
  {
    id: "dark-gothic",
    nameKo: "다크 고딕",
    stylePrefix:
      "Dark gothic tarot card illustration. Medieval occult style with deep black background, blood red and silver accents. Dramatic chiaroscuro lighting, intricate gothic architecture elements, thorny vine borders, dark romanticism. Oil painting quality with heavy atmosphere. Ominous and mysterious mood.",
    backPrompt:
      "Dark gothic tarot card back. Intricate symmetrical skull and thorny vine mandala on deep black background. Blood red and tarnished silver accents. Gothic cathedral rose window pattern, gargoyle silhouettes at corners. Heavy atmosphere with dramatic candlelight glow. Dark romanticism aesthetic. Ultra-detailed, museum-quality fine art. No text, numbers, or letters on the card. Vertical tarot card format 2:3 ratio.",
  },
  {
    id: "celestial-mystic",
    nameKo: "셀레스티얼 미스틱",
    stylePrefix:
      "Celestial mystic tarot card illustration. Deep navy blue background with silver starlight, constellation patterns, and moonlit atmosphere. Ethereal watercolor-meets-digital art style. Soft luminescent glow, astronomical chart elements, zodiac symbolism. Dreamy cosmic palette of deep indigo, silver, and soft blue.",
    backPrompt:
      "Celestial mystic tarot card back. Stunning symmetrical constellation map mandala on deep navy background. Silver star clusters, crescent moon phases, zodiac wheel, and astronomical chart lines. Soft silver and soft blue luminescent glow. Ethereal watercolor-meets-digital art style. Ultra-detailed, museum-quality fine art. No text, numbers, or letters on the card. Vertical tarot card format 2:3 ratio.",
  },
  {
    id: "pastel-dream",
    nameKo: "파스텔 드림",
    stylePrefix:
      "Dreamy pastel tarot card illustration. Soft watercolor style with lavender, rose quartz, and baby blue palette. Delicate brushstrokes with bleeding edges, flower petal accents, iridescent shimmer effects. Light and airy composition. Gentle, healing, whimsical mood. Light pastel background.",
    backPrompt:
      "Dreamy pastel tarot card back. Soft watercolor floral mandala with roses, cherry blossoms, and wildflowers. Lavender, rose quartz, and baby blue palette. Iridescent shimmer, delicate leaf borders, gentle light rays. Airy and healing composition. Whimsical fairy-tale aesthetic. Ultra-detailed, museum-quality fine art. No text, numbers, or letters on the card. Vertical tarot card format 2:3 ratio.",
  },
  {
    id: "neon-cyberpunk",
    nameKo: "네온 사이버펑크",
    stylePrefix:
      "Cyberpunk neon tarot card illustration. Black background with cyan and magenta neon glow effects. Digital holographic art style, circuit board patterns, glitch effects, futuristic UI elements. High-tech oracle aesthetic. Sharp geometric compositions with neon light trails.",
    backPrompt:
      "Cyberpunk neon tarot card back. Symmetrical circuit board mandala on black background. Glowing cyan and magenta neon lines, holographic grid overlay, digital glitch fragments. Futuristic hexagonal patterns with neon light trails. High-tech oracle aesthetic. Ultra-detailed, museum-quality fine art. No text, numbers, or letters on the card. Vertical tarot card format 2:3 ratio.",
  },
  {
    id: "emerald-enchant",
    nameKo: "에메랄드 인챈트",
    stylePrefix:
      "Emerald enchantment tarot card illustration. Deep forest green background with emerald gemstone and botanical elements. Art Nouveau style with flowing vines, mystical forest creatures, bioluminescent accents. Rich green palette with gold filigree. Enchanted forest atmosphere.",
    backPrompt:
      "Emerald enchantment tarot card back. Lush symmetrical botanical mandala with emerald gemstones, winding ivy, exotic ferns, and glowing mushrooms. Deep forest green and gold palette. Art Nouveau vine borders, bioluminescent accents, mystical forest creature silhouettes. Enchanted forest atmosphere. Ultra-detailed, museum-quality fine art. No text, numbers, or letters on the card. Vertical tarot card format 2:3 ratio.",
  },
];

// === 프롬프트 생성 ===

function buildMajorPrompt(skin: SkinDefinition, card: (typeof majorArcana)[0]): string {
  return `${skin.stylePrefix} The "${card.name}" tarot card (Major Arcana). Symbolizing: ${card.keywords}. An elegant figure surrounded by symbolic elements appropriate to the card meaning. ${QUALITY_SUFFIX}`;
}

function buildMinorPrompt(
  skin: SkinDefinition,
  suit: Suit,
  index: number,
  name: string
): string {
  const s = suitNames[suit];
  const num = index + 1;
  const isCourt = num >= 11;
  const arrangement = isCourt
    ? `A noble ${name.toLowerCase()} figure holding symbolic ${s.en.toLowerCase()} elements, dressed in attire befitting the ${s.element} element.`
    : `Elegant arrangement of ${num} ${s.en.toLowerCase()} with ${s.element}-themed atmosphere.`;
  return `${skin.stylePrefix} The "${name} of ${s.en}" tarot card (Minor Arcana). ${s.element} element theme. ${arrangement} An elegant figure surrounded by symbolic elements appropriate to the card meaning. ${QUALITY_SUFFIX}`;
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

    const data = (await res.json()) as { data?: { b64_json?: string }[] };
    const b64 = data.data?.[0]?.b64_json;
    if (!b64) {
      console.error("  ✗ 이미지 데이터 없음");
      return false;
    }

    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    fs.writeFileSync(outputPath, Buffer.from(b64, "base64"));
    console.log(`  ✓ ${path.relative(process.cwd(), outputPath)} 생성 완료`);
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
  const skinFlag = args.find((a) => a.startsWith("--skin="))?.split("=")[1];
  const cardFlag = args.find((a) => a.startsWith("--card="))?.split("=")[1];
  const backOnly = args.includes("--back-only");

  console.log("🃏 Grok 카드 스킨 이미지 생성");
  console.log("=====================================\n");

  const targetSkins = skinFlag
    ? skins.filter((s) => s.id === skinFlag)
    : skins;

  if (skinFlag && targetSkins.length === 0) {
    console.error(`❌ 알 수 없는 스킨: ${skinFlag}`);
    console.error(`사용 가능한 스킨: ${skins.map((s) => s.id).join(", ")}`);
    process.exit(1);
  }

  let generated = 0;
  let failed = 0;

  for (const skin of targetSkins) {
    console.log(`\n🎨 [${skin.id}] ${skin.nameKo}`);
    console.log("─".repeat(40));

    // 카드 뒷면
    if (!cardFlag) {
      const backPath = path.join(OUTPUT_DIR, skin.id, "back.png");
      console.log("  [back] 카드 뒷면");
      const backOk = await generateImage(skin.backPrompt, backPath);
      if (backOk) generated++; else failed++;
      await delay(2000);
    }

    if (backOnly) continue;

    // 메이저 아르카나
    console.log("\n  📦 메이저 아르카나 (22장)");
    for (const card of majorArcana) {
      if (cardFlag && card.id !== cardFlag) continue;
      const outputPath = path.join(OUTPUT_DIR, skin.id, "front", `${card.id}.png`);
      console.log(`  [${card.id}] ${card.name}`);
      const majorOk = await generateImage(buildMajorPrompt(skin, card), outputPath);
      if (majorOk) generated++; else failed++;
      await delay(2000);
    }

    // 마이너 아르카나
    for (const suit of suits) {
      console.log(`\n  📦 마이너 아르카나 — ${suitNames[suit].ko} (14장)`);
      for (let i = 0; i < 14; i++) {
        const num = i + 1;
        const id = `${suit}-${String(num).padStart(2, "0")}`;
        if (cardFlag && id !== cardFlag) continue;
        const outputPath = path.join(OUTPUT_DIR, skin.id, "front", `${id}.png`);
        console.log(`  [${id}] ${minorNames[i]} of ${suitNames[suit].en}`);
        const minorOk = await generateImage(buildMinorPrompt(skin, suit, i, minorNames[i]), outputPath);
        if (minorOk) generated++; else failed++;
        await delay(2000);
      }
    }
  }

  console.log("\n=====================================");
  console.log(`✅ 생성: ${generated}장 | ❌ 실패: ${failed}장`);
  console.log(`📂 출력: ${OUTPUT_DIR}`);
}

main().catch(console.error);
