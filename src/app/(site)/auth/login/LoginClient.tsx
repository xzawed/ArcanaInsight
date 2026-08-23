"use client"

import { useSearchParams } from "next/navigation"
import { useState } from "react"
import Image from "next/image"
import { signIn } from "next-auth/react"
import { createClient } from "@/lib/supabase/client"
import { useT } from "@/i18n/useT"

interface Props {
  useNextAuth: boolean
}

export default function LoginClient({ useNextAuth }: Readonly<Props>) {
  const { t } = useT()
  const searchParams = useSearchParams()
  const error = searchParams.get("error")
  const message = searchParams.get("message")
  const [loginError, setLoginError] = useState<string | null>(null)

  const handleLogin = async () => {
    setLoginError(null)
    if (useNextAuth) {
      try {
        await signIn("google", { callbackUrl: "/" })
      } catch (e) {
        setLoginError(e instanceof Error ? e.message : t("auth.login.fallback-error"))
      }
      return
    }
    const supabase = createClient()
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || globalThis.location.origin
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${siteUrl}/auth/callback` },
    })
    if (authError) setLoginError(authError.message)
  }

  return (
    <div className="min-h-[calc(100dvh-10.5rem)] md:min-h-[calc(100dvh-6.25rem)] flex items-center justify-center px-4 relative overflow-hidden">
      {/* 배경 이미지 */}
      <div className="fixed inset-0 -z-10">
        <Image src="/images/backgrounds/login-bg.jpg" alt="" fill className="object-cover"  sizes="100vw" />
        <div className="absolute inset-0 bg-arcana-bg/60" />
      </div>
      <div className="w-full max-w-sm relative">
        <div className="bg-arcana-card/70 backdrop-blur-sm border border-arcana-border rounded-2xl p-8 shadow-xl shadow-arcana-purple/30">
          {/* 장식 이미지 */}
          <div className="flex justify-center mb-6">
            <div className="relative w-20 h-20 animate-float">
              <Image src="/images/backgrounds/deco-crystal-ball.jpg" alt="" fill className="object-contain rounded-full"  sizes="100vw" />
            </div>
          </div>
          <div className="text-center mb-8">
            <h1 className="text-2xl md:text-3xl font-serif font-bold text-arcana-purple mb-2">{t("header.auth.login")}</h1>
            <p className="text-arcana-muted text-sm">{t("auth.page.subtitle")}</p>
          </div>
          {(error || loginError) && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              <p className="font-bold">{t("auth.page.error-title")}</p>
              <p className="mt-1 text-xs">{loginError || message || error}</p>
            </div>
          )}
          <div className="space-y-3">
            <button
              onClick={handleLogin}
              className="w-full px-6 py-2.5 rounded-full bg-white text-gray-800 font-serif font-bold text-sm flex items-center justify-center gap-2 hover:bg-gray-100 transition-colors shadow-lg shadow-arcana-purple/20"
            >
              <span>G</span> {t("auth.page.google-button")}
            </button>
          </div>
          <p className="text-arcana-muted text-xs text-center mt-6">{t("auth.page.guest-hint")}</p>
        </div>
      </div>
    </div>
  )
}
