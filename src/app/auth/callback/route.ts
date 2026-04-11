import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export async function GET(request: NextRequest) {
  // DB_PROVIDER=postgres 모드에서는 NextAuth가 /api/auth/callback/google을 처리
  // 이 라우트는 Supabase 모드 전용
  if (process.env.DB_PROVIDER === "postgres") {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin
    return NextResponse.redirect(`${siteUrl}/`)
  }

  const { searchParams } = new URL(request.url)
  const code = searchParams.get("code")
  const rawNext = searchParams.get("next") ?? "/"
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/"
  const error = searchParams.get("error")
  const errorDescription = searchParams.get("error_description")
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin

  if (error) {
    return NextResponse.redirect(
      `${siteUrl}/auth/login?error=${encodeURIComponent(error)}&message=${encodeURIComponent(errorDescription || "")}`
    )
  }

  if (code) {
    const cookieStore = await cookies()
    const cookiesToSet: { name: string; value: string; options: Record<string, unknown> }[] = []
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(c) { cookiesToSet.push(...c) },
        },
      },
    )
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
    if (!exchangeError) {
      const response = NextResponse.redirect(`${siteUrl}${next}`)
      for (const { name, value, options } of cookiesToSet) {
        response.cookies.set(name, value, options)
      }
      return response
    }
    return NextResponse.redirect(
      `${siteUrl}/auth/login?error=exchange_failed&message=${encodeURIComponent(exchangeError.message)}`
    )
  }

  return NextResponse.redirect(`${siteUrl}/auth/login?error=no_code`)
}
