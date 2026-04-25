import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { pickFields } from "@/lib/request-utils"

const SAFE_KEYS = [
  "id", "birth_date", "birth_hour", "gender", "birth_name",
  "pillars", "day_master", "day_master_element", "is_strong",
  "elements", "ten_stars", "twelve_stages", "interactions",
  "yongsin", "major_fortunes", "yearly_fortune",
  "overall_reading", "topic_reading", "advice", "share_token", "created_at",
] as const

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const db = getDb()
    const reading = await db.findOne<Record<string, unknown>>("saju_readings", { share_token: id })
    if (!reading) return NextResponse.json({ error: "Reading not found" }, { status: 404 })
    return NextResponse.json({ reading: pickFields(reading, SAFE_KEYS) })
  } catch {
    return NextResponse.json({ error: "Failed to fetch reading" }, { status: 500 })
  }
}
