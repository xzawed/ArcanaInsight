import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { requireUser } from "@/lib/auth"
import { getCharacterById } from "@/data/characters"
import { FavoriteCharacterSchema } from "@/lib/validation/api-schemas"

export async function GET() {
  try {
    const user = await requireUser()
    const db = getDb()
    const profile = await db.findOne<{ favorite_character_id: string | null }>(
      "profiles",
      { id: user.id },
    )
    return NextResponse.json({ characterId: profile?.favorite_character_id ?? null })
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser()
    const parsed = FavoriteCharacterSchema.safeParse(await request.json())
    if (!parsed.success) return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
    const { characterId } = parsed.data
    if (characterId !== null && !getCharacterById(characterId)) {
      return NextResponse.json({ error: "Invalid character" }, { status: 400 })
    }
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
