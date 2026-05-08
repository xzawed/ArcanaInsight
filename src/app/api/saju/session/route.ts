import { NextRequest, NextResponse } from "next/server"
import { getAdminDb } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"
import { getCharacterById } from "@/data/characters"
import { Topic } from "@/types/session"
import { SAJU_TOPICS } from "@/data/topics"
import { SajuSessionSchema } from "@/lib/validation/api-schemas"
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit"
import { getClientIp } from "@/lib/request-utils"
import { getRequestLocale } from "@/i18n/server-locale"

export async function POST(request: NextRequest) {
  try {
    const locale = await getRequestLocale()
    // Rate limiting
    const ip = getClientIp(request.headers)
    if (!(await checkRateLimit(`saju-session:${ip}`, 20, 60_000))) return rateLimitResponse(locale)

    const parsed = SajuSessionSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 })
    }
    const { topic: rawTopic, characterId } = parsed.data
    if (!SAJU_TOPICS.includes(rawTopic as Topic)) {
      return NextResponse.json({ error: "Invalid topic" }, { status: 400 })
    }
    const topic = rawTopic as Topic
    const validCharId = characterId && getCharacterById(characterId) ? characterId : null
    const user = await getCurrentUser()
    const db = getAdminDb()
    const session = await db.insert("sessions", {
      user_id: user?.id ?? null,
      service_type: "saju",
      topic,
      spread_type: null,
      status: "in_progress",
      character_id: validCharId,
      locale,
    })
    return NextResponse.json({ session })
  } catch (e) {
    console.error("사주 세션 생성 오류:", e)
    return NextResponse.json({ error: "Failed to create session" }, { status: 500 })
  }
}
