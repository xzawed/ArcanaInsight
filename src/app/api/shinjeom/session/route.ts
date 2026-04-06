import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { topic, characterId } = await request.json();
    if (!topic || !characterId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    let session = null;
    try {
      const { createClient } = await import("@/lib/supabase/server");
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      const { data } = await supabase.from("sessions").insert({
        service_type: "shinjeom",
        topic,
        character_id: characterId,
        user_id: user?.id || null,
        status: "in_progress",
      }).select("id").single();
      session = data;
    } catch (e) {
      console.warn("세션 생성 실패 (신점은 계속 진행):", e);
    }

    return NextResponse.json({ session });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
