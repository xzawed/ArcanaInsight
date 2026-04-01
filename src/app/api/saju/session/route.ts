import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCharacterById } from "@/data/characters";
import { Topic } from "@/types/session";

const VALID_TOPICS: string[] = [
  "love", "love-single", "love-couple", "finance", "career", "health", "general",
  "fortune-3y", "fortune-5y", "fortune-full",
];

export async function POST(request: NextRequest) {
  try {
    const { topic, characterId } = (await request.json()) as { topic: Topic; characterId?: string };
    if (!VALID_TOPICS.includes(topic)) {
      return NextResponse.json({ error: "Invalid topic" }, { status: 400 });
    }
    const validCharId = characterId && getCharacterById(characterId) ? characterId : null;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { data: session, error } = await supabase
      .from("sessions").insert({
        user_id: user?.id || null,
        service_type: "saju",
        topic,
        spread_type: null,
        status: "in_progress",
        character_id: validCharId,
      }).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ session });
  } catch (e) {
    console.error("사주 세션 생성 오류:", e);
    return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
  }
}
