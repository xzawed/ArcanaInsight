import { NextRequest, NextResponse } from "next/server"
import { getDb, getAdminDb } from "@/lib/db"
import { requireUser } from "@/lib/auth"
import { getCharacterById } from "@/data/characters"
import { FavoriteCharacterSchema } from "@/lib/validation/api-schemas"
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit"
import { getClientIp } from "@/lib/request-utils"
import { getRequestLocale } from "@/i18n/server-locale"
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/i18n/config"

export async function GET(request: NextRequest) {
  let locale: Locale = DEFAULT_LOCALE
  try {
    const reqLocale = await getRequestLocale()
    if (isLocale(reqLocale)) locale = reqLocale
    const ip = getClientIp(request.headers)
    if (!(await checkRateLimit(`favorite-character:${ip}`, 30, 60_000))) return rateLimitResponse(locale)

    const user = await requireUser()
    const db = getDb()
    const profile = await db.findOne<{ favorite_character_id: string | null }>(
      "profiles",
      { id: user.id },
    )
    return NextResponse.json({ characterId: profile?.favorite_character_id ?? null })
  } catch (e) {
    // 비로그인 사용자는 "선호 상담사 없음"으로 취급(200/null) — preselect 조회 훅이 401 콘솔 에러 없이 정상 동작.
    // 비민감 데이터라 유출 없음. 선호를 '설정'하는 POST는 401 유지.
    if (e instanceof Error && e.message === "Unauthorized") {
      return NextResponse.json({ characterId: null })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  let locale: Locale = DEFAULT_LOCALE
  try {
    const reqLocale = await getRequestLocale()
    if (isLocale(reqLocale)) locale = reqLocale
    const ip = getClientIp(request.headers)
    if (!(await checkRateLimit(`favorite-character:${ip}`, 10, 60_000))) return rateLimitResponse(locale)

    // 순서 엄수: Rate Limit → Zod → Auth (.claude/rules/api-routes.md).
    // 이 라우트만 Auth가 앞서 있어, 미인증 + 잘못된 body가 400이 아닌 401을 받았다.
    const parsed = FavoriteCharacterSchema.safeParse(await request.json())
    if (!parsed.success) return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
    const user = await requireUser()
    const { characterId } = parsed.data
    if (characterId !== null && !getCharacterById(characterId)) {
      return NextResponse.json({ error: "Invalid character" }, { status: 400 })
    }
    const db = getAdminDb()
    await db.update("profiles", { id: user.id }, { favorite_character_id: characterId })
    return NextResponse.json({ success: true })
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
