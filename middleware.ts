import { type NextRequest, NextResponse } from "next/server"
import { LOCALE_COOKIE, LOCALE_COOKIE_MAX_AGE } from "@/i18n/config"
import { detectLocale } from "@/i18n/detect"

export async function middleware(request: NextRequest) {
  if (process.env.DB_PROVIDER === "postgres") {
    // NextAuth.js는 자체 미들웨어(/api/auth/*)를 처리함
    // 추가 보호가 필요한 라우트는 여기서 auth() 호출 가능
    const response = NextResponse.next()
    const locale = detectLocale(request)
    if (request.cookies.get(LOCALE_COOKIE)?.value !== locale) {
      response.cookies.set(LOCALE_COOKIE, locale, {
        maxAge: LOCALE_COOKIE_MAX_AGE,
        path: "/",
        sameSite: "lax",
      })
    }
    response.headers.set("x-locale", locale)
    return response
  }
  const { updateSession } = await import("@/lib/supabase/middleware")
  return updateSession(request)
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|images/|api/health|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
