import fs from "fs";
import path from "path";

const API_KEY = process.env.GROK_API_KEY;
const API_URL = "https://api.x.ai/v1/images/generations";
const MODEL = "grok-imagine-image-pro";
const OUTPUT_DIR = path.join(process.cwd(), "public/images/icons");

const BASE_STYLE = "Mystical anime-style flat icon, dark purple-black gradient background (#1a1a3e to transparent), soft glowing neon edge, minimalist design, centered composition, high detail, 128x128 pixel art quality";

const icons = [
  { id: "saju-general", prompt: `${BASE_STYLE}, a yin-yang symbol with glowing cosmic energy, four pillars of destiny, deep purple and blue tones` },
  { id: "saju-personality", prompt: `${BASE_STYLE}, a glowing brain with constellation patterns inside, personality analysis, purple and cyan neural connections` },
  { id: "saju-compatibility", prompt: `${BASE_STYLE}, two hands reaching toward each other with connecting energy threads, compatibility matching, warm purple glow` },
  { id: "saju-week", prompt: `${BASE_STYLE}, a mystical weekly calendar with 7 glowing day markers, time cycle, purple and gold` },
  { id: "saju-month", prompt: `${BASE_STYLE}, a crescent moon with calendar page, monthly fortune, silver and purple glow` },
  { id: "saju-year", prompt: `${BASE_STYLE}, a mystical bar chart with rising energy columns, yearly analysis, purple and gold data visualization` },
  { id: "saju-crystal", prompt: `${BASE_STYLE}, a crystal ball showing future vision with swirling mist, next year forecast, deep purple and gold` },
  { id: "saju-trend", prompt: `${BASE_STYLE}, a glowing upward trend arrow with star trail, multi-year growth, purple and gold ascending energy` },
  { id: "saju-calendar", prompt: `${BASE_STYLE}, a mystical torn calendar with glowing dates, five-year projection, purple and gold pages` },
  { id: "saju-destiny", prompt: `${BASE_STYLE}, a grand cosmic wheel of fortune with glowing segments, life destiny map, brilliant purple and gold starfield` },
  { id: "saju-date", prompt: `${BASE_STYLE}, a mystical calendar with a golden star marking the auspicious date, date selection, purple and gold highlight` },
  { id: "spread-card", prompt: `${BASE_STYLE}, a single glowing tarot card with mystical symbols, one card spread, purple and gold card back` },
  { id: "spread-three", prompt: `${BASE_STYLE}, three tarot cards fanned out with glowing edges, three card spread, purple and gold arrangement` },
  { id: "spread-five", prompt: `${BASE_STYLE}, five cards arranged in a cross pattern with glowing connections, celtic cross mini, purple and gold layout` },
  { id: "spread-celtic", prompt: `${BASE_STYLE}, ten cards arranged in full celtic cross pattern with intricate energy lines, traditional spread, purple and gold` },
  { id: "spread-relationship", prompt: `${BASE_STYLE}, cards mirrored on two sides with connecting heart energy, relationship spread, pink and purple` },
  { id: "spread-horseshoe", prompt: `${BASE_STYLE}, seven cards arranged in U shape horseshoe with flowing energy, horseshoe spread, purple and gold arc` },
  { id: "spread-decision", prompt: `${BASE_STYLE}, scales of justice with tarot cards on each side, decision making, balanced purple and gold` },
  { id: "spread-week", prompt: `${BASE_STYLE}, seven cards in a row representing days of week with sun cycle, weekly forecast, purple and gold timeline` },
  { id: "spread-zodiac", prompt: `${BASE_STYLE}, twelve cards arranged in a zodiac circle with constellation symbols, astrology wheel, purple and gold cosmic` },
  { id: "spread-tree", prompt: `${BASE_STYLE}, mystical tree of life with glowing nodes and cards at each position, kabbalistic tree, purple and gold branches` },
  { id: "ui-hourglass", prompt: `${BASE_STYLE}, a mystical hourglass with flowing purple sand and glowing energy, time selection, purple and gold frame` },
  { id: "ui-book", prompt: `${BASE_STYLE}, an open mystical book with glowing pages and floating symbols, reading result, purple and gold ancient text` },
  { id: "ui-person", prompt: `${BASE_STYLE}, a mystical person silhouette with glowing aura selecting from options, counselor choice, purple and gold profile` },
];

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  for (const icon of icons) {
    const outputPath = path.join(OUTPUT_DIR, `${icon.id}.png`);
    if (fs.existsSync(outputPath)) { console.log(`⏭️ ${icon.id} 스킵`); continue; }
    console.log(`🎨 ${icon.id}...`);
    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: MODEL, prompt: icon.prompt, n: 1, response_format: "b64_json" }),
      });
      if (!res.ok) { console.error(`❌ ${icon.id} (${res.status})`); continue; }
      const data = await res.json() as { data: { b64_json: string }[] };
      if (!data.data?.[0]?.b64_json) { console.error(`❌ ${icon.id} 데이터 없음`); continue; }
      fs.writeFileSync(outputPath, Buffer.from(data.data[0].b64_json, "base64"));
      console.log(`✅ ${icon.id}`);
      await new Promise(r => setTimeout(r, 2000));
    } catch (e) { console.error(`❌ ${icon.id}`, e); }
  }
  console.log("✨ 완료!");
}
main();
