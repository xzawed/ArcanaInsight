import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin;

  // OAuth error from provider
  if (error) {
    console.error("OAuth error:", error, errorDescription);
    return NextResponse.redirect(
      `${siteUrl}/auth/login?error=${encodeURIComponent(error)}&message=${encodeURIComponent(errorDescription || "")}`
    );
  }

  if (code) {
    const supabase = await createClient();
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    if (!exchangeError) {
      return NextResponse.redirect(`${siteUrl}${next}`);
    }
    console.error("Code exchange error:", exchangeError);
    return NextResponse.redirect(
      `${siteUrl}/auth/login?error=exchange_failed&message=${encodeURIComponent(exchangeError.message)}`
    );
  }

  return NextResponse.redirect(`${siteUrl}/auth/login?error=no_code`);
}
