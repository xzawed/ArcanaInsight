import { NextRequest } from "next/server";
import { getAdminDb } from "@/lib/db";
import { getDlqRetrySecret } from "@/lib/env";
import { dispatchFailedReadingSave } from "@/lib/db/reading-saver";
import { jsonError } from "@/lib/request-utils";

// 한 번에 재처리할 pending 상한 — cron 주기적으로 호출되며 누적분을 점진 소진
const BATCH_LIMIT = 20;
// 재시도 상한 — 초과 시 abandoned로 전환해 무한 재시도 방지
const MAX_ATTEMPTS = 5;

interface FailedReadingRow {
  id: string;
  service: string;
  session_id: string;
  payload: Record<string, unknown>;
  attempts: number;
}

/**
 * 리딩 dead-letter 큐 재처리 엔드포인트.
 * Secret 헤더(`x-dlq-secret` === env DLQ_RETRY_SECRET)로 가드. env 미설정 시 비활성(404).
 * pending failed_readings를 service별로 원본 save 함수에 재투입 → 성공 resolved / 실패 attempts++ / MAX 초과 abandoned.
 * Railway cron 또는 수동 curl로 트리거.
 */
export async function POST(request: NextRequest) {
  const secret = getDlqRetrySecret();
  // 시크릿 미설정 시 엔드포인트 존재를 숨김 (404)
  if (!secret) return jsonError("Not found", 404);
  if (request.headers.get("x-dlq-secret") !== secret) return jsonError("Unauthorized", 401);

  const db = getAdminDb();
  const pending = await db.findMany<FailedReadingRow>(
    "failed_readings",
    { status: "pending" },
    { limit: BATCH_LIMIT, orderBy: "created_at", orderDir: "asc" },
  );

  let resolved = 0;
  let failed = 0;
  let abandoned = 0;

  for (const row of pending) {
    const nowIso = new Date().toISOString();
    try {
      await dispatchFailedReadingSave(db, row.service, row.session_id, row.payload);
      await db.update("failed_readings", { id: row.id }, { status: "resolved", last_attempt_at: nowIso });
      resolved++;
    } catch (e) {
      const nextAttempts = row.attempts + 1;
      const status = nextAttempts >= MAX_ATTEMPTS ? "abandoned" : "pending";
      await db.update("failed_readings", { id: row.id }, {
        attempts: nextAttempts,
        last_attempt_at: nowIso,
        status,
        error_message: (e instanceof Error ? e.message : String(e)).slice(0, 500),
      });
      if (status === "abandoned") abandoned++; else failed++;
    }
  }

  return new Response(
    JSON.stringify({ processed: pending.length, resolved, failed, abandoned }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}
