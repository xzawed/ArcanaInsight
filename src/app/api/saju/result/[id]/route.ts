import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const db = getDb()
    const reading = await db.findOne<Record<string, unknown>>("saju_readings", { share_token: id })
    if (!reading) return NextResponse.json({ error: "Reading not found" }, { status: 404 })
    const safeReading = { ...reading }
    delete safeReading.sessionId
    delete safeReading.session_id
    return NextResponse.json({ reading: safeReading })
  } catch {
    return NextResponse.json({ error: "Failed to fetch reading" }, { status: 500 })
  }
}
