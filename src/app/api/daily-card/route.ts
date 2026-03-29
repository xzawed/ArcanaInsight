import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { GrokProvider } from "@/services/core/grok-provider";
import { DeckManager } from "@/services/tarot/deck-manager";
import { getCharacterById } from "@/data/characters";

const grokProvider = new GrokProvider();
const deckManager = new DeckManager();

function hashDateSeed(date: string, characterId: string): number {
  let hash = 0;
  const str = `${date}-${characterId}`;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

export async function POST(request: NextRequest) {
  try {
    const { characterId, date } = (await request.json()) as { characterId: string; date: string };

    if (!characterId || !date) {
      return NextResponse.json({ error: "characterId and date are required" }, { status: 400 });
    }

    const character = getCharacterById(characterId);
    if (!character) {
      return NextResponse.json({ error: "Character not found" }, { status: 404 });
    }

    // 캐시 확인
    const supabase = await createClient();
    const { data: cached } = await supabase
      .from("daily_cards")
      .select("*")
      .eq("date", date)
      .eq("character_id", characterId)
      .single();

    if (cached) {
      return NextResponse.json({
        cardId: cached.card_id,
        isReversed: cached.is_reversed,
        interpretation: cached.interpretation,
        keywords: cached.keywords,
      });
    }

    // 카드 결정 (날짜+캐릭터 해시 시드)
    const allCards = deckManager.getAllCards();
    const seed = hashDateSeed(date, characterId);
    const cardIndex = seed % allCards.length;
    const card = allCards[cardIndex];
    const isReversed = (seed % 3) === 0;

    // Grok AI 해석
    const direction = isReversed ? "역방향" : "정방향";
    const meanings = isReversed ? card.reversed : card.upright;
    const prompt = `당신은 "${character.name}"입니다. ${character.speechStyle}

오늘의 카드: ${card.nameKo} (${card.name}) [${direction}]
키워드: ${meanings.keywords.join(", ")}
의미: ${meanings.meaning}

위 카드를 기반으로 오늘의 짧은 운세 메시지를 3~4문장으로 작성해주세요. 당신의 말투와 성격을 반영하세요. JSON 형식 없이 순수 텍스트로만 응답하세요.`;

    const interpretation = await grokProvider.generateReading(
      `당신은 ${character.name}입니다. ${character.personality} ${character.speechStyle}`,
      prompt
    );

    const keywords = meanings.keywords.slice(0, 3);

    // 캐시 저장
    await supabase.from("daily_cards").insert({
      date,
      character_id: characterId,
      card_id: card.id,
      is_reversed: isReversed,
      interpretation,
      keywords,
    });

    return NextResponse.json({ cardId: card.id, isReversed, interpretation, keywords });
  } catch (error) {
    console.error("Daily card error:", error);
    return NextResponse.json({ error: "Failed to generate daily card" }, { status: 500 });
  }
}
