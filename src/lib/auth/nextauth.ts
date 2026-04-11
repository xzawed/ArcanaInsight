import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import { getDb } from "@/lib/db"

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    // First sign-in: user and account are both present
    async jwt({ token, user, account }) {
      if (user && account) {
        try {
          const db = getDb()
          // 이메일로 기존 프로필 조회 — 재로그인 시 동일 UUID 재사용
          const existing = await db.findOne<{ id: string }>("profiles", { email: user.email! })
          const profileId = existing?.id ?? crypto.randomUUID()
          await db.upsert(
            "profiles",
            {
              id: profileId,
              email: user.email,
              nickname: user.name ?? user.email!.split("@")[0],
              avatar_url: user.image ?? null,
              provider: "google",
            },
            "id"
          )
          token.sub = profileId
        } catch (e) {
          console.error("profiles upsert 실패:", e)
          // 프로필 저장 실패해도 로그인은 허용 — token.sub는 Google sub 유지
        }
      }
      return token
    },
    async session({ session, token }) {
      if (token.sub) session.user.id = token.sub
      return session
    },
  },
  pages: {
    signIn: "/auth/login",
  },
})
