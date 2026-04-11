import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  if (process.env.DB_PROVIDER !== "postgres") {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
  const { handlers } = await import("@/lib/auth/nextauth")
  return handlers.GET(req)
}

export async function POST(req: NextRequest) {
  if (process.env.DB_PROVIDER !== "postgres") {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
  const { handlers } = await import("@/lib/auth/nextauth")
  return handlers.POST(req)
}
