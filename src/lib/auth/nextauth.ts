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
    async signIn({ user }) {
      if (!user.id || !user.email) return false
      try {
        const db = getDb()
        await db.upsert(
          "profiles",
          {
            id: user.id,
            email: user.email,
            nickname: user.name ?? user.email.split("@")[0],
            avatar_url: user.image ?? null,
            provider: "google",
          },
          "id"
        )
      } catch (e) {
        console.error("profiles upsert 실패:", e)
        // 프로필 저장 실패해도 로그인은 허용
      }
      return true
    },
    async jwt({ token, user }) {
      if (user?.id) token.sub = user.id
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
