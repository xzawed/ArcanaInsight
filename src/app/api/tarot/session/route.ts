import { NextRequest, NextResponse } from "next/server"
import { getAdminDb } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"
import { TarotService } from "@/services/tarot/tarot-service"
import { SpreadResolver } from "@/services/tarot/spread-resolver"
import { getCharacterById } from "@/data/characters"
import { Topic } from "@/types/session"
import { isTarotTopic } from "@/data/topics"
import { TarotSessionSchema } from "@/lib/validation/api-schemas"
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit"
import { getClientIp } from "@/lib/request-utils"
import { getRequestLocale } from "@/i18n/server-locale"

const tarotService = new TarotService()
const spreadResolver = new SpreadResolver()

export async function POST(request: NextRequest) {
  try {
    const locale = await getRequestLocale()
    // Rate limiting
    const ip = getClientIp(request.headers)
    if (!(await checkRateLimit(`tarot-session:${ip}`, 20, 60_000))) return rateLimitResponse(locale)

    const parsed = TarotSessionSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 })
    }
    const { topic: rawTopic, characterId, spreadType } = parsed.data
    if (!isTarotTopic(rawTopic)) {
      return NextResponse.json({ error: "Invalid topic" }, { status: 400 })
    }
    const topic: Topic = rawTopic
    const validCharId = characterId && getCharacterById(characterId) ? characterId : null
    const user = await getCurrentUser()
    const sessionData = tarotService.startSession(topic)
    const resolvedSpreadType = (spreadType && spreadResolver.getSpreadByType(spreadType))
      ? spreadType
      : sessionData.spreadType

    const db = getAdminDb()
    const session = await db.insert("sessions", {
      user_id: user?.id ?? null,
      service_type: sessionData.serviceType,
      topic: sessionData.topic,
      spread_type: resolvedSpreadType,
      status: sessionData.status,
      character_id: validCharId,
      locale,
    })
    return NextResponse.json({ session })
  } catch (e) {
    console.error("세션 생성 오류:", e)
    return NextResponse.json({ error: "Failed to create session" }, { status: 500 })
  }
}
