import { Suspense } from "react"
import LoginClient from "./LoginClient"

export default function LoginPage() {
  const useNextAuth = process.env.DB_PROVIDER === "postgres"
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-arcana-muted">로딩 중...</p>
      </div>
    }>
      <LoginClient useNextAuth={useNextAuth} />
    </Suspense>
  )
}
