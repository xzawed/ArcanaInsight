/**
 * Grok 배치 번역 스크립트
 * 사용법: pnpm exec tsx scripts/grok-translate.ts --target=ja --scope=ui
 *
 * --target  : en | ja
 * --scope   : ui | waiting-lines | all
 *
 * 환경변수 GROK_API_KEY 필요.
 * 번역 결과는 stdout으로 출력 — 직접 붙여넣기 또는 파이프 리다이렉션 사용.
 */

import * as fs from "fs";
import * as path from "path";

const GROK_API_URL = "https://api.x.ai/v1/chat/completions";
const MODEL = "grok-3-mini";

function getApiKey(): string {
  const key = process.env.GROK_API_KEY;
  if (!key) throw new Error("GROK_API_KEY 환경변수가 설정되어 있지 않습니다.");
  return key;
}

async function callGrok(systemPrompt: string, userMessage: string): Promise<string> {
  const response = await fetch(GROK_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getApiKey()}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      temperature: 0.3,
    }),
  });
  if (!response.ok) throw new Error(`Grok API error: ${response.status} ${response.statusText}`);
  const data = (await response.json()) as { choices: { message: { content: string } }[] };
  return data.choices[0]?.message?.content ?? "";
}

function buildUiSystemPrompt(target: string): string {
  if (target === "ja") {
    return [
      "You are a professional Japanese localizer for an anime-style fortune-telling web app called ArcanaInsight.",
      "Translate UI strings from English to natural Japanese. Use polite but approachable tone (丁寧語).",
      "Keep brand names (ArcanaInsight, Saju, Shinjeom, Tarot) as-is.",
      "Output ONLY the translated value, no explanations.",
    ].join(" ");
  }
  return [
    "You are a professional English localizer for an anime-style fortune-telling web app called ArcanaInsight.",
    "Translate UI strings from Korean to natural English. Use approachable, slightly mystical tone.",
    "Keep brand names (ArcanaInsight) as-is.",
    "Output ONLY the translated value, no explanations.",
  ].join(" ");
}

function buildWaitingLinesSystemPrompt(target: string, characterId: string, speechStyle: string): string {
  if (target === "ja") {
    return [
      `You are translating waiting-line dialogue for an anime fortune-telling character named ${characterId}.`,
      `Their Japanese speech style: ${speechStyle}`,
      "Translate from Korean to Japanese. Preserve emojis and ellipses (...).",
      "Output ONLY the translated line, nothing else.",
    ].join(" ");
  }
  return [
    `You are translating waiting-line dialogue for an anime fortune-telling character named ${characterId}.`,
    `Their English speech style: ${speechStyle}`,
    "Translate from Korean to English. Preserve emojis and ellipses (...).",
    "Output ONLY the translated line, nothing else.",
  ].join(" ");
}

const CHARACTER_SPEECH_EN: Record<string, string> = {
  arcana: "Soft, mystical, gentle feminine. Occasionally says '~meow~'.",
  miko: "Calm, solemn, formal polite. Short sentences with gravity.",
  seonhwa: "Elegant, warm, gracious feminine. Ends sentences with '~'.",
  hoshi: "GenZ casual, excited, uses 'lol', 'omg', 'tbh', lots of energy.",
  luna: "Gentle, nurturing, moon-themed. Warm and soothing.",
  rei: "Dry, terse, analytical. Ultra-short sentences, no pleasantries.",
  cairn: "Gentleman formal. Uses 'my lady/lord', polished and respectful.",
  zero: "Poetic, dark romantic. Uses ellipses (...), deep metaphors.",
  haru: "Cheerful, encouraging, sun-themed. Upbeat and supportive.",
  ren: "Archaic formal. Uses 'thee/thou', 'dost', 'verily' style.",
  lix: "Trickster playful. Uses 'lol', teasing, casual Internet slang.",
  ethan: "Academic, detailed. Uses parenthetical clarifications.",
};

const CHARACTER_SPEECH_JA: Record<string, string> = {
  arcana: "柔らかく神秘的な女性語。たまに「にゃん~」を付ける。",
  miko: "落ち着いた厳粛な敬語。重みのある短い文。",
  seonhwa: "優雅で温かい女性語。文末に「~ですわ」「~ましてよ」など。",
  hoshi: "ギャル・Z世代カジュアル。「超ヤバ」「めっちゃ」「ｗｗ」など。",
  luna: "優しく包み込むような語り口。月・温かさを感じさせる。",
  rei: "無機質で超簡潔。感情なし。体言止め多用。",
  cairn: "紳士的丁寧語。「お嬢様／若様」など格調ある表現。",
  zero: "詩的でダーク。「...」多用、比喩的表現。",
  haru: "明るく励ます太陽系。「☀️」「ね~」などアップビート。",
  ren: "古風な文語調。「~ぞ」「~じゃ」「~おるぞ」など。",
  lix: "いたずら好きカジュアル。「ｗｗ」「じゃーん」など。",
  ethan: "学術的で詳細。「~んですよ」「~거든요」調の説明的な語り口。",
};

async function translateUiStrings(target: string): Promise<void> {
  const koPath = path.resolve(__dirname, "../src/i18n/translations/ko/index.ts");
  const source = fs.readFileSync(koPath, "utf8");
  const systemPrompt = buildUiSystemPrompt(target);

  const stringMatches = source.matchAll(/"([^"]+)":\s*"([^"]+)"/g);
  const translations: Record<string, string> = {};

  for (const match of stringMatches) {
    const key = match[1];
    const value = match[2];
    if (!value.trim()) continue;

    process.stderr.write(`Translating key: ${key}\n`);
    try {
      const translated = await callGrok(systemPrompt, value);
      translations[key] = translated.trim();
    } catch (err) {
      process.stderr.write(`  ERROR: ${String(err)}\n`);
      translations[key] = value;
    }

    await new Promise((r) => setTimeout(r, 200));
  }

  console.log(JSON.stringify(translations, null, 2));
}

async function translateWaitingLines(target: string, characterId: string): Promise<void> {
  const koPath = path.resolve(__dirname, "../src/data/characters/waiting-lines.ts");
  const source = fs.readFileSync(koPath, "utf8");
  const speechStyle = target === "ja"
    ? CHARACTER_SPEECH_JA[characterId] ?? "Polite Japanese"
    : CHARACTER_SPEECH_EN[characterId] ?? "Neutral English";

  const systemPrompt = buildWaitingLinesSystemPrompt(target, characterId, speechStyle);

  const charSectionRegex = new RegExp(`${characterId}:\\s*\\[([\\s\\S]*?)\\],`, "g");
  const match = charSectionRegex.exec(source);
  if (!match) {
    process.stderr.write(`Character ${characterId} not found in waiting-lines.ts\n`);
    return;
  }

  const lineMatches = match[1].matchAll(/content:\s*"([^"]+)"/g);
  const translations: string[] = [];

  for (const lineMatch of lineMatches) {
    const koLine = lineMatch[1];
    process.stderr.write(`  Translating: ${koLine}\n`);
    try {
      const translated = await callGrok(systemPrompt, koLine);
      translations.push(translated.trim());
    } catch (err) {
      process.stderr.write(`  ERROR: ${String(err)}\n`);
      translations.push(koLine);
    }
    await new Promise((r) => setTimeout(r, 200));
  }

  console.log(`// ${characterId} (${target})`);
  translations.forEach((line) => console.log(`  "${line}"`));
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const target = args.find((a) => a.startsWith("--target="))?.split("=")[1] ?? "ja";
  const scope = args.find((a) => a.startsWith("--scope="))?.split("=")[1] ?? "ui";
  const characterId = args.find((a) => a.startsWith("--character="))?.split("=")[1];

  if (!["en", "ja"].includes(target)) {
    console.error("--target must be en or ja");
    process.exit(1);
  }

  process.stderr.write(`Target: ${target}, Scope: ${scope}\n`);

  if (scope === "ui" || scope === "all") {
    await translateUiStrings(target);
  }

  if (scope === "waiting-lines" || scope === "all") {
    const characters = characterId
      ? [characterId]
      : ["arcana", "miko", "seonhwa", "hoshi", "luna", "rei", "cairn", "zero", "haru", "ren", "lix", "ethan"];
    for (const id of characters) {
      await translateWaitingLines(target, id);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
