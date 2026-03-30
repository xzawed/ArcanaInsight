import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { TarotService } from "@/services/tarot/tarot-service";
import { Topic } from "@/types/session";

const tarotService = new TarotService();

export async function POST(request: NextRequest) {
  try {
    const { topic } = (await request.json()) as { topic: Topic };
    if (!["love", "love-single", "love-couple", "finance", "career", "health", "general"].includes(topic)) {
      return NextResponse.json({ error: "Invalid topic" }, { status: 400 });
    }
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const sessionData = tarotService.startSession(topic);
    const { data: session, error } = await supabase
      .from("sessions").insert({
        user_id: user?.id || null, service_type: sessionData.serviceType,
        topic: sessionData.topic, spread_type: sessionData.spreadType, status: sessionData.status,
      }).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ session });
  } catch (e) {
    console.error("세션 생성 오류:", e);
    return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
  }
}
