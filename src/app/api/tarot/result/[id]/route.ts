import { NextRequest, NextResponse } from "next/server"
import { getAdminDb } from "@/lib/db"
import { pickFields, getClientIp } from "@/lib/request-utils"
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit"
import { getRequestLocale } from "@/i18n/server-locale"
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/i18n/config"

const SAFE_KEYS = ["id", "card_interpretation", "overall_reading", "direct_answer", "advice", "share_token", "created_at"] as const

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let locale: Locale = DEFAULT_LOCALE
  try {
    const reqLocale = await getRequestLocale()
    if (isLocale(reqLocale)) locale = reqLocale
    const ip = getClientIp(request.headers)
    if (!(await checkRateLimit(`tarot-result:${ip}`, 60, 60_000))) return rateLimitResponse(locale)

    const { id } = await params
    const db = getAdminDb()
    const reading = await db.findOne<Record<string, unknown>>("readings", { share_token: id })
    if (!reading) return NextResponse.json({ error: "Reading not found" }, { status: 404 })
    return NextResponse.json({ reading: pickFields(reading, SAFE_KEYS) })
  } catch (e) {
    // 공유 링크의 500은 서버 신호가 없으면 원인 추적이 불가능하다(DB 장애·어댑터 오류가 조용히 묻힘).
    // reading-saver의 `[reading-save-failed]`와 같은 방식으로 grep·알림 가능한 단일 마커를 남긴다.
    console.error("[result-fetch-failed]", { service: "tarot", err: e instanceof Error ? e.message : String(e) })
    return NextResponse.json({ error: "Failed to fetch reading" }, { status: 500 })
  }
}
