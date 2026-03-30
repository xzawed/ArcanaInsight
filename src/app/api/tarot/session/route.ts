import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { TarotService } from "@/services/tarot/tarot-service";
import { getCharacterById } from "@/data/characters";
import { Topic } from "@/types/session";

const tarotService = new TarotService();
const VALID_TOPICS = ["love", "love-single", "love-couple", "finance", "career", "health", "general"];

export async function POST(request: NextRequest) {
  try {
    const { topic, characterId, spreadType } = (await request.json()) as { topic: Topic; characterId?: string; spreadType?: string };
    if (!VALID_TOPICS.includes(topic)) {
      return NextResponse.json({ error: "Invalid topic" }, { status: 400 });
    }
    const validCharId = characterId && getCharacterById(characterId) ? characterId : null;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const sessionData = tarotService.startSession(topic);
    // 사용자가 선택한 spreadType 우선, 없으면 topic 기반 자동 결정
    const validSpreadTypes = ["one-card", "three-card", "five-card"];
    const resolvedSpreadType = spreadType && validSpreadTypes.includes(spreadType)
      ? spreadType
      : sessionData.spreadType;
    const { data: session, error } = await supabase
      .from("sessions").insert({
        user_id: user?.id || null, service_type: sessionData.serviceType,
        topic: sessionData.topic, spread_type: resolvedSpreadType, status: sessionData.status,
        character_id: validCharId,
      }).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ session });
  } catch (e) {
    console.error("세션 생성 오류:", e);
    return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
  }
}
