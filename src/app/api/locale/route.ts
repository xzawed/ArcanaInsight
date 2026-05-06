import { NextRequest, NextResponse } from "next/server";
import { LOCALE_COOKIE, LOCALE_COOKIE_MAX_AGE } from "@/i18n/config";
import { LocaleSchema } from "@/lib/validation/api-schemas";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const parsed = LocaleSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid locale" }, { status: 400 });
    }
    const { locale } = parsed.data;

    // 인증 사용자는 profiles.locale도 동기화 (PR-1.5: SSOT는 쿠키, profiles는 보조)
    const user = await getCurrentUser();
    if (user) {
      try {
        const db = getDb();
        await db.update("profiles", { id: user.id }, { locale });
      } catch (e) {
        console.error("[locale] profile update failed:", e);
        // 쿠키 저장은 계속 진행
      }
    }

    const response = NextResponse.json({ success: true, locale });
    response.cookies.set(LOCALE_COOKIE, locale, {
      maxAge: LOCALE_COOKIE_MAX_AGE,
      path: "/",
      sameSite: "lax",
    });
    return response;
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
