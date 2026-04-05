/**
 * UI 아이콘 이미지 생성 스크립트 (Grok grok-imagine-image-pro 모델 사용)
 *
 * 사용법:
 *   GROK_API_KEY=your_key pnpm tsx scripts/generate-icons.ts --all
 *   GROK_API_KEY=your_key pnpm tsx scripts/generate-icons.ts --category=nav
 *   GROK_API_KEY=your_key pnpm tsx scripts/generate-icons.ts --id=nav-home
 */

import fs from "fs";
import path from "path";

const API_KEY = process.env.GROK_API_KEY;
const API_URL = "https://api.x.ai/v1/images/generations";
const MODEL = "grok-imagine-image-pro";
const OUTPUT_DIR = path.join(process.cwd(), "public/images/icons");

if (!API_KEY || API_KEY === "your_grok_api_key") {
  console.error("❌ GROK_API_KEY 환경변수를 설정해주세요.");
  process.exit(1);
}

// === 아이콘 정의 ===

interface IconDef {
  id: string;
  category: string;
  prompt: string;
}

const BASE_STYLE = "Mystical anime-style flat icon, dark purple-black gradient background (#1a1a3e to transparent), soft glowing neon edge, minimalist design, centered composition, high detail, 128x128 pixel art quality";

const icons: IconDef[] = [
  // ── 네비게이션 (5개) ──
  { id: "nav-home", category: "nav", prompt: `${BASE_STYLE}, a mystical glowing house silhouette with a crescent moon above, purple and gold glow` },
  { id: "nav-tarot", category: "nav", prompt: `${BASE_STYLE}, a single tarot card with a glowing star symbol on it, purple and gold accents, mystical aura` },
  { id: "nav-saju", category: "nav", prompt: `${BASE_STYLE}, a yin-yang symbol with glowing energy, surrounded by four pillars of light, purple and blue tones` },
  { id: "nav-shinjeom", category: "nav", prompt: `${BASE_STYLE}, a crystal ball with swirling purple mist inside, sitting on an ornate stand, mystical glow` },
  { id: "nav-mypage", category: "nav", prompt: `${BASE_STYLE}, a person silhouette with a glowing aura outline, purple and indigo tones, mystical profile icon` },

  // ── 신점 카테고리 (6개) ──
  { id: "shinjeom-general", category: "shinjeom", prompt: `${BASE_STYLE}, a large crystal ball with cosmic energy swirling inside, stars and nebula visible, bright purple glow` },
  { id: "shinjeom-love", category: "shinjeom", prompt: `${BASE_STYLE}, two intertwined glowing hearts with sparkles, romantic pink and purple gradient, mystical love energy` },
  { id: "shinjeom-wealth", category: "shinjeom", prompt: `${BASE_STYLE}, a glowing golden coin with mystical symbols, surrounded by golden light particles, wealth and fortune` },
  { id: "shinjeom-career", category: "shinjeom", prompt: `${BASE_STYLE}, a mystical briefcase with a glowing compass arrow pointing upward, career growth energy, purple and gold` },
  { id: "shinjeom-health", category: "shinjeom", prompt: `${BASE_STYLE}, a glowing protective shield with a healing cross symbol, green and purple energy, spiritual protection` },
  { id: "shinjeom-auspicious", category: "shinjeom", prompt: `${BASE_STYLE}, a mystical calendar page with a glowing lucky star marked on it, golden highlight, fortune telling date selection` },

  // ── 타로 주제 (6개) ──
  { id: "topic-love-single", category: "tarot", prompt: `${BASE_STYLE}, a single glowing heart with butterfly wings, seeking love energy, pink and purple sparkles` },
  { id: "topic-love-couple", category: "tarot", prompt: `${BASE_STYLE}, two glowing figures holding hands under a heart-shaped moon, romantic couple energy, warm pink tones` },
  { id: "topic-career", category: "tarot", prompt: `${BASE_STYLE}, a glowing compass rose with career symbols, upward arrow, professional growth, purple and gold` },
  { id: "topic-finance", category: "tarot", prompt: `${BASE_STYLE}, stacked golden coins with mystical energy flowing around them, financial fortune, gold and purple glow` },
  { id: "topic-health", category: "tarot", prompt: `${BASE_STYLE}, a glowing green herb leaf with healing energy aura, vitality and wellness, green and purple harmony` },
  { id: "topic-general", category: "tarot", prompt: `${BASE_STYLE}, a sparkling constellation forming a question mark shape, general divination, purple starfield` },

  // ── 테마 (7개) ──
  { id: "theme-midnight", category: "theme", prompt: `${BASE_STYLE}, a crescent moon with stars in deep night sky, midnight mystical atmosphere, dark blue and silver` },
  { id: "theme-dawn", category: "theme", prompt: `${BASE_STYLE}, a rising sun over horizon with morning light rays, dawn breaking, warm orange and soft pink` },
  { id: "theme-sunset", category: "theme", prompt: `${BASE_STYLE}, a dramatic sunset with clouds colored in orange and red, twilight atmosphere, warm golden tones` },
  { id: "theme-spring", category: "theme", prompt: `${BASE_STYLE}, cherry blossom petals floating in gentle breeze, spring renewal energy, soft pink and light green` },
  { id: "theme-summer", category: "theme", prompt: `${BASE_STYLE}, bright sparkles and sunlight rays with vibrant energy, summer vitality, golden and bright yellow` },
  { id: "theme-autumn", category: "theme", prompt: `${BASE_STYLE}, falling autumn maple leaves in warm colors, wisdom of seasons, amber and burnt orange` },
  { id: "theme-winter", category: "theme", prompt: `${BASE_STYLE}, elegant snowflake crystal with ice blue glow, winter serenity, ice blue and silver white` },

  // ── 기타 UI (4개) ──
  { id: "ui-settings", category: "ui", prompt: `${BASE_STYLE}, a mystical gear/cog wheel with glowing inner mechanisms, settings and configuration, purple metallic` },
  { id: "ui-auto-theme", category: "ui", prompt: `${BASE_STYLE}, two circular arrows forming a cycle with day and night halves, auto-switching, purple and gold gradient` },
  { id: "ui-info", category: "ui", prompt: `${BASE_STYLE}, a glowing scroll or notepad with a quill pen, information input, purple and gold mystical` },
  { id: "ui-target", category: "ui", prompt: `${BASE_STYLE}, a glowing bullseye target with a mystical arrow hitting center, topic selection, purple and gold precision` },
];

// === 이미지 생성 ===

async function generateIcon(icon: IconDef): Promise<void> {
  const outputPath = path.join(OUTPUT_DIR, `${icon.id}.png`);

  if (fs.existsSync(outputPath)) {
    console.log(`⏭️  ${icon.id} — 이미 존재, 스킵`);
    return;
  }

  console.log(`🎨 ${icon.id} 생성 중...`);

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        prompt: icon.prompt,
        n: 1,
        response_format: "b64_json",
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error(`❌ ${icon.id} 실패 (${response.status}):`, err);
      return;
    }

    const data = await response.json() as { data: { b64_json: string }[] };
    if (!data.data?.[0]?.b64_json) {
      console.error(`❌ ${icon.id} — 응답에 이미지 데이터 없음`);
      return;
    }

    const buffer = Buffer.from(data.data[0].b64_json, "base64");
    fs.writeFileSync(outputPath, buffer);
    console.log(`✅ ${icon.id} → ${outputPath}`);

    // API 쿨다운 (Rate Limit 방지)
    await new Promise((r) => setTimeout(r, 2000));
  } catch (e) {
    console.error(`❌ ${icon.id} 에러:`, e);
  }
}

// === CLI 파싱 ===

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const args = process.argv.slice(2);
  const allFlag = args.includes("--all");
  const categoryArg = args.find((a) => a.startsWith("--category="))?.split("=")[1];
  const idArg = args.find((a) => a.startsWith("--id="))?.split("=")[1];

  let targets: IconDef[];

  if (allFlag) {
    targets = icons;
  } else if (categoryArg) {
    targets = icons.filter((i) => i.category === categoryArg);
    if (targets.length === 0) {
      console.error(`❌ 카테고리 "${categoryArg}" 없음. 가능: nav, shinjeom, tarot, theme, ui`);
      process.exit(1);
    }
  } else if (idArg) {
    targets = icons.filter((i) => i.id === idArg);
    if (targets.length === 0) {
      console.error(`❌ ID "${idArg}" 없음.`);
      process.exit(1);
    }
  } else {
    console.log("사용법:");
    console.log("  --all                모든 아이콘 생성 (28개)");
    console.log("  --category=nav       카테고리별 생성 (nav|shinjeom|tarot|theme|ui)");
    console.log("  --id=nav-home        개별 아이콘 생성");
    console.log(`\n총 ${icons.length}개 아이콘 정의됨`);
    process.exit(0);
  }

  console.log(`\n🚀 ${targets.length}개 아이콘 생성 시작\n`);

  for (const icon of targets) {
    await generateIcon(icon);
  }

  console.log("\n✨ 완료!");
}

main();
