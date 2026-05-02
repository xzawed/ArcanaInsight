import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"
import { TarotService } from "@/services/tarot/tarot-service"
import { SpreadResolver } from "@/services/tarot/spread-resolver"
import { getCharacterById } from "@/data/characters"
import { Topic } from "@/types/session"
import { TAROT_TOPICS } from "@/data/topics"
import { TarotSessionSchema } from "@/lib/validation/api-schemas"

const tarotService = new TarotService()
const spreadResolver = new SpreadResolver()

export async function POST(request: NextRequest) {
  try {
    const parsed = TarotSessionSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 })
    }
    const { topic, characterId, spreadType } = parsed.data as { topic: Topic; characterId?: string | null; spreadType?: string | null }
    if (!TAROT_TOPICS.includes(topic)) {
      return NextResponse.json({ error: "Invalid topic" }, { status: 400 })
    }
    const validCharId = characterId && getCharacterById(characterId) ? characterId : null
    const user = await getCurrentUser()
    const sessionData = tarotService.startSession(topic)
    const resolvedSpreadType = (spreadType && spreadResolver.getSpreadByType(spreadType))
      ? spreadType
      : sessionData.spreadType

    const db = getDb()
    const session = await db.insert("sessions", {
      user_id: user?.id ?? null,
      service_type: sessionData.serviceType,
      topic: sessionData.topic,
      spread_type: resolvedSpreadType,
      status: sessionData.status,
      character_id: validCharId,
    })
    return NextResponse.json({ session })
  } catch (e) {
    console.error("세션 생성 오류:", e)
    return NextResponse.json({ error: "Failed to create session" }, { status: 500 })
  }
}
