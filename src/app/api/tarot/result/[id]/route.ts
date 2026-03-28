import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: reading, error } = await supabase
      .from("readings").select("*").eq("share_token", id).single();
    if (error || !reading) return NextResponse.json({ error: "Reading not found" }, { status: 404 });
    return NextResponse.json({ reading });
  } catch {
    return NextResponse.json({ error: "Failed to fetch reading" }, { status: 500 });
  }
}
