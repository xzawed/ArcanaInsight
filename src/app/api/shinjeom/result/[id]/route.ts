import { NextRequest, NextResponse } from "next/server"
import { getAdminDb } from "@/lib/db"
import { pickFields, getClientIp } from "@/lib/request-utils"
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit"
import { getRequestLocale } from "@/i18n/server-locale"
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/i18n/config"

const SAFE_KEYS = ["id", "overall_reading", "topic_reading", "direct_answer", "advice", "share_token", "created_at"] as const

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let locale: Locale = DEFAULT_LOCALE
  try {
    const reqLocale = await getRequestLocale()
    if (isLocale(reqLocale)) locale = reqLocale
    const ip = getClientIp(request.headers)
    if (!(await checkRateLimit(`shinjeom-result:${ip}`, 60, 60_000))) return rateLimitResponse(locale)

    const { id } = await params
    const db = getAdminDb()
    const reading = await db.findOne<Record<string, unknown>>("shinjeom_readings", { share_token: id })
    if (!reading) return NextResponse.json({ error: "Reading not found" }, { status: 404 })
    return NextResponse.json({ reading: pickFields(reading, SAFE_KEYS) })
  } catch (e) {
    // 마커 근거는 tarot/result/[id]/route.ts 참조 — 3서비스 동일 형식으로 남긴다.
    console.error("[result-fetch-failed]", { service: "shinjeom", err: e instanceof Error ? e.message : String(e) })
    return NextResponse.json({ error: "Failed to fetch reading" }, { status: 500 })
  }
}
