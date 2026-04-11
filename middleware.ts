import { type NextRequest, NextResponse } from "next/server"

export async function middleware(request: NextRequest) {
  if (process.env.DB_PROVIDER === "postgres") {
    // NextAuth.js는 자체 미들웨어(/api/auth/*)를 처리함
    // 추가 보호가 필요한 라우트는 여기서 auth() 호출 가능
    return NextResponse.next()
  }
  const { updateSession } = await import("@/lib/supabase/middleware")
  return updateSession(request)
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|images/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
