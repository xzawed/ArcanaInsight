import { getDb } from "@/lib/db";

/** fire-and-forget: 리딩 DB 저장 + 세션 완료 처리 — 스트림 블로킹 없음 */
export function saveReadingAsync(
  sessionId: string,
  serviceType: "tarot" | "saju" | "shinjeom",
  saves: Promise<unknown>[],
): void {
  const db = getDb();
  void Promise.all([
    ...saves,
    db.update("sessions", { id: sessionId }, {
      status: "completed",
      completed_at: new Date().toISOString(),
    }),
  ]).catch((e) => console.error(`${serviceType} DB 저장 실패:`, e));
}
