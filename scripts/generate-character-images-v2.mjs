/**
 * Grok API (grok-imagine-image-pro)로 12개 캐릭터 × 6 표정 이미지를 생성하는 스크립트
 *
 * 사용법:
 *   node scripts/generate-character-images-v2.mjs              # 전체 생성
 *   node scripts/generate-character-images-v2.mjs arcana       # 특정 캐릭터만
 *   node scripts/generate-character-images-v2.mjs arcana smile # 특정 캐릭터 + 특정 표정
 *
 * 필요: GROK_API_KEY 환경변수 (.env.local에서 로드)
 *
 * 이미지 저장 위치: public/images/characters/{id}/nukki/{mood}.png
 * 해상도: 세로형 864x1536 (3:5.33 비율, 864x1296 권장이지만 API가 지원하는 최근접값 사용)
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

// ── 공통 품질 접두어 ──────────────────────────────────────────────────────────
const QUALITY_PREFIX = `masterpiece, best quality, ultra-detailed, 8k, anime illustration,
Japanese anime art style, high quality anime character art, vibrant colors,
clean linework, beautiful detailed eyes, detailed hair, expressive face,
professional anime illustration, game character portrait,
upper body portrait shot, centered composition,
transparent or dark mystical background suitable for UI overlay,
no watermark, no text, no signature`;

// ── 캐릭터 베이스 설명 ──────────────────────────────────────────────────────
const CHARACTERS = {
  arcana: {
    name: "아르카나",
    base: `A beautiful mystical anime girl with long flowing silver-white hair and adorable cat ears.
Purple glowing eyes, pale porcelain skin.
Wears an elegant dark purple and black gothic lolita dress with gold magical rune accents.
Holds a glowing crystal ball. Floating tarot cards surround her.
Dark purple starry night atmosphere with purple and gold magical particles.`,
  },
  miko: {
    name: "미코",
    base: `A serene and ethereal anime girl wearing traditional Japanese shrine maiden (miko) attire.
Pure white haori and red hakama with gold decorative cords. Long straight black hair with white ribbons.
Calm dark eyes with deep spiritual presence. She holds a gohei (ritual wand with paper streamers).
Subtle red torii gate silhouette in background. Sacred spiritual atmosphere.`,
  },
  seonhwa: {
    name: "선화",
    base: `An elegant and graceful anime girl wearing a beautiful traditional Korean hanbok.
Flowing pink and white hanbok with gold embroidery patterns. Long flowing black hair with jade hairpin.
Warm gentle brown eyes, soft smile. She holds a delicate folding fan with floral patterns.
Cherry blossom petals floating around her. Soft dawn light atmosphere, warm pink and gold tones.`,
  },
  hoshi: {
    name: "호시",
    base: `A bright and energetic anime girl who is a spirit of stars.
Pale lavender-blue short twin-tails with sparkling star clips. Large bright blue eyes full of energy.
Wears a cute galaxy-themed sailor uniform with star and moon patterns, short skirt.
Surrounded by floating glowing stars and constellation lines.
Night sky background with bright stars and aurora effects.`,
  },
  luna: {
    name: "루나",
    base: `A beautiful mystical anime girl with long flowing silver-blue moonlight hair.
Soft silver-blue eyes that glow like moonlight, gentle and warm expression.
Wears an elegant constellation-pattern dress with a semi-transparent moonlit cape.
Crescent moon motifs as accessories. Surrounded by soft moonlight glow and floating star dust.
Night sky with full moon background, soft blue and silver magical atmosphere.`,
  },
  rei: {
    name: "레이",
    base: `A cool and sharp-looking anime girl with pure white short hair, styled precisely.
Striking crimson red eyes with intense gaze, sharp and analytical expression.
Wears sophisticated black outfit with white accents and black gloves.
Minimal accessories, clean and precise aesthetic.
Abstract dark background with subtle geometric patterns, cool blue-black atmosphere.`,
  },
  cairn: {
    name: "카이른",
    base: `A handsome and aristocratic anime young man with deep navy blue hair, slightly messy but elegant.
Golden amber eyes with a refined and slightly playful expression.
Wears a high-quality dark navy blazer with a magical golden crest brooch.
Elegant and noble appearance, like a young nobleman from a fantasy setting.
Ornate palace interior background with warm golden candlelight atmosphere.`,
  },
  zero: {
    name: "제로",
    base: `A mysterious and brooding anime young man with dark crimson-red hair.
One eye partially covered by falling hair, the other visible with a piercing dark gaze.
Wears a dark hooded coat with chain accessories, edgy yet elegant.
Romantic and dark aesthetic, like a tragic hero from gothic fantasy.
Dark misty background with scattered crimson rose petals, moonlit night atmosphere.`,
  },
  haru: {
    name: "하루",
    base: `A warm and cheerful anime young man with bright golden blond hair, slightly messy.
Large bright sky-blue eyes with a genuinely warm and reassuring smile.
Wears a casual but stylish white shirt with rolled-up sleeves and jeans.
Small star-shaped earrings as accessory. Radiates sunshine and warmth.
Soft sunrise background with warm golden light and gentle bokeh effects.`,
  },
  ren: {
    name: "렌",
    base: `A wise and serene anime young man with long black hair, neatly tied back.
Deep calm dark eyes with a tranquil sage-like expression, ageless wisdom.
Wears elegant oriental-style robes with lotus flower patterns and blue-green accents.
Holds a delicate folding fan with Chinese ink painting of lotus.
Misty mountain landscape background with lotus flowers floating on water.`,
  },
  lix: {
    name: "릭스",
    base: `A playful and quirky anime young man with two-tone hair: neon green and electric purple.
Mischievous bright eyes with a sly grin, wearing over-ear headphones around neck.
Wears a futuristic digital-pattern jacket with holographic accents.
Holds a glowing holographic card between fingers.
Cyber-fantasy background with neon grid patterns and floating holographic displays.`,
  },
  ethan: {
    name: "에단",
    base: `A studious and shy anime young man with silver-gray hair, neatly combed.
Warm brown eyes behind round glasses, gentle and earnest expression.
Wears a scholar's robe over a neat shirt, carrying a thick magical tome.
The book has glowing arcane runes on its cover.
Library background with countless floating magical books and warm amber light.`,
  },
};

// ── 표정별 공통 설명 ─────────────────────────────────────────────────────────
const MOOD_DESCRIPTIONS = {
  default: {
    label: "idle",
    desc: `Expression: calm, serene, neutral expression with a gentle natural smile. Eyes looking warmly forward.
Pose: standing gracefully in a relaxed natural pose.
Mood: welcoming, peaceful, ready to greet. Natural resting state.`,
  },
  smile: {
    label: "smile",
    desc: `Expression: bright warm smile, eyes curving into happy crescents (anime smile eyes), genuine joy.
Pose: slight lean forward with energy, open and inviting body language.
Mood: genuinely happy, warm, delighted, radiant positivity.`,
  },
  serious: {
    label: "serious",
    desc: `Expression: focused and concentrated look, slightly furrowed brows, determined and attentive eyes.
Pose: straight and composed posture, chin slightly raised with authority.
Mood: deep in thought, analytical, concentrated on an important matter.`,
  },
  surprised: {
    label: "surprised",
    desc: `Expression: wide open eyes with surprise and wonder, mouth slightly open in amazement, raised eyebrows.
Pose: slight backwards lean, one hand raised near face in surprise gesture.
Mood: genuinely astonished, excited by an unexpected discovery.`,
  },
  wink: {
    label: "wink",
    desc: `Expression: one eye closed in a playful wink, other eye bright, confident smile with slight smirk.
Pose: slight side tilt of head, playful and charming body language.
Mood: playful, teasing, confident, charming and flirtatious.`,
  },
  mystical: {
    label: "mystical",
    desc: `Expression: eyes closed or half-open with ethereal expression, serene trance-like state, glowing aura.
Pose: arms slightly outstretched, magical energy visibly emanating from hands.
Magical particles and energy swirling around the character in a spiral.
Mood: channeling supernatural power, deep in mystical trance, ethereal and powerful.`,
  },
};

// ── 이미지 생성 함수 ─────────────────────────────────────────────────────────
async function generateImage(characterId, moodKey) {
  const character = CHARACTERS[characterId];
  const mood = MOOD_DESCRIPTIONS[moodKey];

  if (!character || !mood) {
    console.error(`❌ 알 수 없는 캐릭터(${characterId}) 또는 표정(${moodKey})`);
    return false;
  }

  const prompt = `${QUALITY_PREFIX}

${character.base}

${mood.desc}`;

  const outputDir = path.join(ROOT, `public/images/characters/${characterId}/nukki`);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  const outputPath = path.join(outputDir, `${moodKey}.png`);

  // default 표정은 idle.png로도 저장 (CharacterGallery에서 idle.png를 참조)
  const idlePath = moodKey === "default" ? path.join(outputDir, "idle.png") : null;

  console.log(`🎨 [${character.name}/${moodKey}] 생성 중...`);

  const response = await fetch("https://api.x.ai/v1/images/generations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "grok-2-image",
      prompt,
      n: 1,
      response_format: "b64_json",
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error(`❌ [${character.name}/${moodKey}] API 에러 (${response.status}): ${error.slice(0, 300)}`);
    return false;
  }

  const data = await response.json();
  const imageData = data.data?.[0];

  if (!imageData) {
    console.error(`❌ [${character.name}/${moodKey}] 이미지 데이터 없음:`, JSON.stringify(data).slice(0, 200));
    return false;
  }

  if (imageData.b64_json) {
    const buffer = Buffer.from(imageData.b64_json, "base64");
    fs.writeFileSync(outputPath, buffer);
    if (idlePath) fs.writeFileSync(idlePath, buffer);
  } else if (imageData.url) {
    const imgResponse = await fetch(imageData.url);
    const arrayBuffer = await imgResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    fs.writeFileSync(outputPath, buffer);
    if (idlePath) fs.writeFileSync(idlePath, buffer);
  } else {
    console.error(`❌ [${character.name}/${moodKey}] 알 수 없는 응답 형식`);
    return false;
  }

  console.log(`✅ [${character.name}/${moodKey}] 저장: ${outputPath}`);
  if (idlePath) console.log(`   ↳ idle.png로도 복사`);
  return true;
}

// ── 메인 ─────────────────────────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2);
  const targetCharacter = args[0];
  const targetMood = args[1];

  const characterIds = targetCharacter
    ? Object.keys(CHARACTERS).filter((id) => id === targetCharacter)
    : Object.keys(CHARACTERS);

  const moodKeys = targetMood
    ? Object.keys(MOOD_DESCRIPTIONS).filter((m) => m === targetMood)
    : Object.keys(MOOD_DESCRIPTIONS);

  if (targetCharacter && characterIds.length === 0) {
    console.error(`❌ 알 수 없는 캐릭터: ${targetCharacter}`);
    console.log("사용 가능한 캐릭터:", Object.keys(CHARACTERS).join(", "));
    process.exit(1);
  }

  const total = characterIds.length * moodKeys.length;
  console.log(`\n=== 캐릭터 이미지 생성 시작 ===`);
  console.log(`대상: ${characterIds.map((id) => CHARACTERS[id].name).join(", ")}`);
  console.log(`표정: ${moodKeys.join(", ")}`);
  console.log(`총 ${total}장 생성 예정\n`);

  let success = 0;
  let fail = 0;
  let count = 0;

  for (const characterId of characterIds) {
    for (const moodKey of moodKeys) {
      count++;
      console.log(`\n[${count}/${total}]`);
      try {
        const result = await generateImage(characterId, moodKey);
        if (result) success++;
        else fail++;
      } catch (err) {
        console.error(`❌ [${characterId}/${moodKey}] 예외:`, err.message);
        fail++;
      }

      // API rate limit 방지
      if (count < total) {
        console.log("   ⏳ 3초 대기...");
        await new Promise((r) => setTimeout(r, 3000));
      }
    }
  }

  console.log(`\n=== 완료: ${success}개 성공, ${fail}개 실패 ===`);
  console.log(`\n이미지 저장 위치: public/images/characters/{id}/nukki/`);
}

main().catch(console.error);
