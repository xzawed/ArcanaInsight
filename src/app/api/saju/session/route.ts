import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"
import { getCharacterById } from "@/data/characters"
import { Topic } from "@/types/session"

const VALID_TOPICS: string[] = [
  "saju-general", "saju-love-single", "saju-love-couple",
  "saju-career", "saju-health", "saju-personality",
  "saju-compatibility", "saju-auspicious-date",
]

export async function POST(request: NextRequest) {
  try {
    const { topic, characterId } = (await request.json()) as { topic: Topic; characterId?: string }
    if (!VALID_TOPICS.includes(topic)) {
      return NextResponse.json({ error: "Invalid topic" }, { status: 400 })
    }
    const validCharId = characterId && getCharacterById(characterId) ? characterId : null
    const user = await getCurrentUser()
    const db = getDb()
    const session = await db.insert("sessions", {
      user_id: user?.id ?? null,
      service_type: "saju",
      topic,
      spread_type: null,
      status: "in_progress",
      character_id: validCharId,
    })
    return NextResponse.json({ session })
  } catch (e) {
    console.error("사주 세션 생성 오류:", e)
    return NextResponse.json({ error: "Failed to create session" }, { status: 500 })
  }
}
