import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"
import { ShinjeomSessionSchema } from "@/lib/validation/api-schemas"

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
      session = await db.insert("sessions", {
        service_type: "shinjeom",
        topic,
        character_id: characterId,
        user_id: user?.id ?? null,
        status: "in_progress",
      })
    } catch (e) {
      console.warn("세션 생성 실패 (신점은 계속 진행):", e)
    }

    return NextResponse.json({ session })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
