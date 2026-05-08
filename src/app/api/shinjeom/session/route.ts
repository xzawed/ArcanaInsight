import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"
import { ShinjeomSessionSchema } from "@/lib/validation/api-schemas"
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit"
import { getClientIp } from "@/lib/request-utils"
import { getRequestLocale } from "@/i18n/server-locale"
import { SHINJEOM_TOPICS } from "@/data/topics"

export async function POST(request: NextRequest) {
  try {
    const locale = await getRequestLocale()
    // Rate limiting
    const ip = getClientIp(request.headers)
    if (!(await checkRateLimit(`shinjeom-session:${ip}`, 20, 60_000))) return rateLimitResponse(locale)

    const parsed = ShinjeomSessionSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 })
    }
    const { topic, characterId } = parsed.data
    if (!SHINJEOM_TOPICS.includes(topic)) {
      return NextResponse.json({ error: "Invalid topic" }, { status: 400 })
    }

    let session = null
    try {
      const user = await getCurrentUser()
      const db = getDb()
      session = await db.insert("sessions", {
        service_type: "shinjeom",
        topic,
        character_id: characterId,
        user_id: user?.id ?? null,
        status: "in_progress",
        locale,
      })
    } catch (e) {
      console.warn("세션 생성 실패 (신점은 계속 진행):", e)
    }

    return NextResponse.json({ session })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
