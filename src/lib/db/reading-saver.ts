import type { DbClient } from "./types";

/** 최대 3회 재시도, 실패 간격 200ms * (시도 횟수) */
async function withRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      if (i < attempts - 1) await new Promise((r) => setTimeout(r, 200 * (i + 1)));
    }
  }
  throw lastErr;
}

/** 타로 리딩 결과 + 세션 완료 + 카드 목록 저장 (3회 retry) */
export async function saveTarotReading(
  db: DbClient,
  sessionId: string,
  reading: { cardInterpretations?: unknown; overallReading: string; advice: string },
  cards: { cardId: string; position: number; isReversed: boolean }[]
): Promise<void> {
  await withRetry(() =>
    Promise.all([
      db.insert("readings", {
        session_id: sessionId,
        card_interpretation: reading.cardInterpretations,
        overall_reading: reading.overallReading,
        advice: reading.advice,
      }),
      db.update("sessions", { id: sessionId }, {
        status: "completed",
        completed_at: new Date().toISOString(),
      }),
      db.insertMany("session_cards",
        cards.map((c) => ({
          session_id: sessionId,
          card_id: c.cardId,
          position: c.position,
          is_reversed: c.isReversed,
        }))
      ),
    ])
  );
}

/** 사주 리딩 결과 + 세션 완료 저장 (3회 retry) */
export async function saveSajuReading(
  db: DbClient,
  sessionId: string,
  sajuReadingData: Record<string, unknown>
): Promise<void> {
  await withRetry(() =>
    Promise.all([
      db.insert("saju_readings", sajuReadingData),
      db.update("sessions", { id: sessionId }, {
        status: "completed",
        completed_at: new Date().toISOString(),
      }),
    ])
  );
}

/** 신점 최종 리딩 결과 + 세션 완료 저장 (3회 retry) */
export async function saveShinjeomFinalReading(
  db: DbClient,
  sessionId: string,
  result: { overallReading: string; topicReading?: string; advice: string }
): Promise<void> {
  await withRetry(() =>
    Promise.all([
      db.insert("shinjeom_readings", {
        session_id: sessionId,
        overall_reading: result.overallReading,
        topic_reading: result.topicReading || "",
        advice: result.advice,
      }),
      db.update("sessions", { id: sessionId }, {
        status: "completed",
        completed_at: new Date().toISOString(),
      }),
    ])
  );
}

/** 신점 중간 대화 메시지 쌍 저장 (3회 retry) */
export async function saveShinjeomMessages(
  db: DbClient,
  sessionId: string,
  currentMessage: string,
  fullResponse: string,
  messageIndex: number
): Promise<void> {
  await withRetry(() =>
    db.insertMany("shinjeom_messages", [
      { session_id: sessionId, role: "user", content: currentMessage, message_index: messageIndex },
      { session_id: sessionId, role: "character", content: fullResponse, message_index: messageIndex + 1 },
    ])
  );
}
