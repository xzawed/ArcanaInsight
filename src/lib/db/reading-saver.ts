import type { DbClient } from "./types";
import { isLocale, DEFAULT_LOCALE } from "@/i18n/config";

/** 016 마이그레이션 CHECK 제약(locale IN ('ko','en','ja'))과 동기화 — 빈 문자열·잘못된 값 차단 */
function safeLocale(locale: string): string {
  return isLocale(locale) ? locale : DEFAULT_LOCALE;
}

/** PostgreSQL 23xxx (무결성 제약 위반) 등 재시도해도 동일하게 실패하는 영구 에러 판별 */
function isPermanentError(e: unknown): boolean {
  if (!(e instanceof Error)) return false;
  const code = (e as Error & { code?: string }).code;
  if (code && /^(22|23|42)/.test(code)) return true; // data exception / constraint / syntax
  return /duplicate key|violates|unique constraint/i.test(e.message);
}

/** 최대 3회 재시도, 실패 간격 200ms * (시도 횟수). 영구 에러는 즉시 throw. */
async function withRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      if (isPermanentError(e)) throw e;
      lastErr = e;
      if (i < attempts - 1) await new Promise((r) => setTimeout(r, 200 * (i + 1)));
    }
  }
  throw lastErr;
}

/** 리딩 저장 실패를 단일 grep 가능 마커로 구조적 로깅한다.
 *  운영 로그에서 `[reading-save-failed]` 마커로 지속 장애를 추적·알림하기 위한 관측성 헬퍼. */
export function logReadingSaveFailure(
  service: "tarot" | "saju" | "shinjeom" | "shinjeom-message",
  sessionId: string | null,
  error: unknown,
): void {
  const code = (error as { code?: string } | null)?.code ?? "none";
  const message = error instanceof Error ? error.message : String(error);
  console.error(
    `[reading-save-failed] service=${service} session=${sessionId ?? "null"} code=${code} msg=${message}`,
  );
}

/** 타로 리딩 결과 + 세션 완료 + 카드 목록 저장 (3회 retry).
 *  locale 인자는 readings 테이블에 작성 시점 locale을 기록 (sessions.locale과 별도 — 결과 텍스트 언어 추적용). */
export async function saveTarotReading(
  db: DbClient,
  sessionId: string,
  reading: { cardInterpretations?: unknown; overallReading: string; advice: string },
  cards: { cardId: string; position: number; isReversed: boolean; selectedAt?: Date }[],
  locale: string = "ko"
): Promise<void> {
  const lc = safeLocale(locale);
  await withRetry(() =>
    Promise.all([
      db.insert("readings", {
        session_id: sessionId,
        card_interpretation: reading.cardInterpretations,
        overall_reading: reading.overallReading,
        advice: reading.advice,
        locale: lc,
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
          ...(c.selectedAt ? { selected_at: c.selectedAt.toISOString() } : {}),
        }))
      ),
    ])
  );
}

/** 사주 리딩 결과 + 세션 완료 저장 (3회 retry). locale은 saju_readings 테이블 컬럼. */
export async function saveSajuReading(
  db: DbClient,
  sessionId: string,
  sajuReadingData: Record<string, unknown>,
  locale: string = "ko"
): Promise<void> {
  const lc = safeLocale(locale);
  await withRetry(() =>
    Promise.all([
      db.insert("saju_readings", { ...sajuReadingData, locale: lc }),
      db.update("sessions", { id: sessionId }, {
        status: "completed",
        completed_at: new Date().toISOString(),
      }),
    ])
  );
}

/** 신점 최종 리딩 결과 + 세션 완료 저장 (3회 retry). locale은 shinjeom_readings 테이블 컬럼.
 *  저장된 행의 share_token을 반환한다 (공유 URL 생성에 사용). */
export async function saveShinjeomFinalReading(
  db: DbClient,
  sessionId: string,
  result: { overallReading: string; topicReading?: string; advice: string },
  locale: string = "ko"
): Promise<{ shareToken: string | null }> {
  const lc = safeLocale(locale);
  const [reading] = await withRetry(() =>
    Promise.all([
      db.insert<{ share_token?: string | null }>("shinjeom_readings", {
        session_id: sessionId,
        overall_reading: result.overallReading,
        topic_reading: result.topicReading || "",
        advice: result.advice,
        locale: lc,
      }),
      db.update("sessions", { id: sessionId }, {
        status: "completed",
        completed_at: new Date().toISOString(),
      }),
    ])
  );
  return { shareToken: reading?.share_token ?? null };
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

/** dead-letter 대상 서비스 (최종 리딩 저장만 — 신점 중간 메시지는 대화 이력이라 제외) */
export type DlqService = "tarot" | "saju" | "shinjeom";

/** 영구 저장 실패한 리딩을 dead-letter 큐(`failed_readings`)에 영속화한다 (재처리 대상).
 *  best-effort — 이 insert 자체가 실패해도 throw하지 않고 로깅만 한다 (스트림 가용성 보호).
 *  payload는 재저장에 필요한 서비스별 인자(JSON 직렬화 형태). */
export async function recordFailedReading(
  db: DbClient,
  service: DlqService,
  sessionId: string,
  payload: Record<string, unknown>,
  error: unknown,
): Promise<void> {
  try {
    const code = (error as { code?: string } | null)?.code ?? null;
    const message = error instanceof Error ? error.message : String(error);
    await db.insert("failed_readings", {
      service,
      session_id: sessionId,
      payload,
      error_code: code,
      error_message: message.slice(0, 500),
      status: "pending",
      attempts: 0,
    });
  } catch (e) {
    // dead-letter 기록 자체 실패는 무음 흡수 — 원 저장 실패는 이미 logReadingSaveFailure로 기록됨
    logReadingSaveFailure(service, sessionId, e);
  }
}

/** dead-letter payload로 원본 save 함수를 재호출한다 (재처리 엔드포인트가 사용).
 *  성공 시 정상 반환, 실패 시 throw → 호출자가 attempts 증가/abandoned 처리. */
export async function dispatchFailedReadingSave(
  db: DbClient,
  service: string,
  sessionId: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const locale = typeof payload.locale === "string" ? payload.locale : DEFAULT_LOCALE;
  if (service === "tarot") {
    const rawCards = Array.isArray(payload.cards)
      ? (payload.cards as { cardId: string; position: number; isReversed: boolean; selectedAt?: string }[])
      : [];
    // jsonb 직렬화로 Date → ISO 문자열이 되므로 selectedAt을 Date로 복원
    const cards = rawCards.map((c) => ({
      cardId: c.cardId, position: c.position, isReversed: c.isReversed,
      selectedAt: c.selectedAt ? new Date(c.selectedAt) : undefined,
    }));
    await saveTarotReading(db, sessionId, payload.reading as { cardInterpretations?: unknown; overallReading: string; advice: string }, cards, locale);
  } else if (service === "saju") {
    await saveSajuReading(db, sessionId, payload.sajuReadingData as Record<string, unknown>, locale);
  } else if (service === "shinjeom") {
    await saveShinjeomFinalReading(db, sessionId, payload.result as { overallReading: string; topicReading?: string; advice: string }, locale);
  } else {
    throw new Error(`unknown DLQ service: ${service}`);
  }
}
