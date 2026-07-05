import { NextRequest, NextResponse } from "next/server"
import { getAdminDb } from "@/lib/db"
import { pickFields, getClientIp } from "@/lib/request-utils"
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit"
import { getRequestLocale } from "@/i18n/server-locale"
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/i18n/config"

const SAFE_KEYS = [
  "id", "birth_date", "birth_hour", "gender", "birth_name", "mbti",
  "pillars", "day_master", "day_master_element", "is_strong",
  "elements", "ten_stars", "twelve_stages", "interactions",
  "yongsin", "major_fortunes", "yearly_fortune",
  "overall_reading", "topic_reading", "direct_answer", "saju_sections", "advice", "share_token", "created_at",
] as const

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let locale: Locale = DEFAULT_LOCALE
  try {
    const reqLocale = await getRequestLocale()
    if (isLocale(reqLocale)) locale = reqLocale
    const ip = getClientIp(request.headers)
    if (!(await checkRateLimit(`saju-result:${ip}`, 60, 60_000))) return rateLimitResponse(locale)

    const { id } = await params
    const db = getAdminDb()
    const reading = await db.findOne<Record<string, unknown>>("saju_readings", { share_token: id })
    if (!reading) return NextResponse.json({ error: "Reading not found" }, { status: 404 })
    return NextResponse.json({ reading: pickFields(reading, SAFE_KEYS) })
  } catch {
    return NextResponse.json({ error: "Failed to fetch reading" }, { status: 500 })
  }
}
