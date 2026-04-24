import { Suspense } from "react"
import LoginClient from "./LoginClient"
import { getDbProvider } from "@/lib/env"

export default function LoginPage() {
  const useNextAuth = getDbProvider() === "postgres"
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
