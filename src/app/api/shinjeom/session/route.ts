import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"
import { ShinjeomSessionSchema } from "@/lib/validation/api-schemas"
import { getRequestLocale } from "@/i18n/server-locale"

export async function POST(request: NextRequest) {
  try {
    const parsed = ShinjeomSessionSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 })
    }
    const { topic, characterId } = parsed.data

    let session = null
    try {
      const user = await getCurrentUser()
      const db = getDb()
      const locale = await getRequestLocale()
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
