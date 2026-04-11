import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { requireUser } from "@/lib/auth"
import { getCharacterById } from "@/data/characters"

export async function POST(request: NextRequest) {
  try {
    const { characterId } = (await request.json()) as { characterId: string | null }
    if (characterId !== null && !getCharacterById(characterId)) {
      return NextResponse.json({ error: "Invalid character" }, { status: 400 })
    }
    const user = await requireUser()
    const db = getDb()
    await db.update("profiles", { id: user.id }, { favorite_character_id: characterId })
    return NextResponse.json({ success: true })
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
