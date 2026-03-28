import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin;

  // OAuth provider 에러
  if (error) {
    console.error("OAuth error:", error, errorDescription);
    return NextResponse.redirect(
      `${siteUrl}/auth/login?error=${encodeURIComponent(error)}&message=${encodeURIComponent(errorDescription || "")}`
    );
  }

  if (code) {
    const cookieStore = await cookies();

    // 쿠키를 redirect 응답에 직접 설정하기 위해 캡처
    const cookiesToSet: { name: string; value: string; options: Record<string, unknown> }[] = [];

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookies) {
            cookiesToSet.push(...cookies);
          },
        },
      },
    );

    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (!exchangeError) {
      const response = NextResponse.redirect(`${siteUrl}${next}`);
      // 세션 쿠키를 redirect 응답에 명시적으로 설정
      for (const { name, value, options } of cookiesToSet) {
        response.cookies.set(name, value, options);
      }
      return response;
    }

    console.error("Code exchange error:", exchangeError);
    return NextResponse.redirect(
      `${siteUrl}/auth/login?error=exchange_failed&message=${encodeURIComponent(exchangeError.message)}`
    );
  }

  return NextResponse.redirect(`${siteUrl}/auth/login?error=no_code`);
}
