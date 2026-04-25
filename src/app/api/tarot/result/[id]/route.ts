import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

const SAFE_KEYS = ["id", "card_interpretation", "overall_reading", "advice", "share_token", "created_at"] as const

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const db = getDb()
    const reading = await db.findOne<Record<string, unknown>>("readings", { share_token: id })
    if (!reading) return NextResponse.json({ error: "Reading not found" }, { status: 404 })
    const safeReading = Object.fromEntries(
      SAFE_KEYS.filter(k => k in reading).map(k => [k, reading[k]])
    )
    return NextResponse.json({ reading: safeReading })
  } catch {
    return NextResponse.json({ error: "Failed to fetch reading" }, { status: 500 })
  }
}
