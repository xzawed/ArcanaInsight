"use client";

import type { Dispatch, SetStateAction } from "react";
import { useState, useRef, useEffect, useCallback } from "react";
import type { SelectedCard } from "@/types/card";
import type { SpreadDefinition, ChatMessage } from "@/types/session";
import type { ReadingResult } from "@/types/service";
import type { Locale } from "@/i18n/config";
import { fetchSSEStream } from "@/hooks/useSSEStream";
import { useSessionStore } from "@/hooks/useSession";
import { useCharacterStore } from "@/hooks/useCharacter";
import { useReadingRevealStore } from "@/hooks/useReadingReveal";
import { useLocaleStore } from "@/hooks/useLocaleStore";
import { spreads, getPositionLabel, fallbackPosLabel } from "@/data/spreads";
import { CHARACTER_RESULT_MOODS } from "@/data/characters/waiting-lines";
import { getWaitingLinesData } from "@/data/characters/waiting-lines-i18n";
import { getCardName } from "@/data/cards/locale-helpers";
import { t as translate } from "@/i18n/translations";

function buildRevealStep(
  sc: SelectedCard,
  currentSpread: SpreadDefinition | null,
  charId: string,
  locale: Locale,
  revealPos: Dispatch<SetStateAction<number[]>>,
  addMsg: (msg: ChatMessage) => void,
): () => void {
  return () => {
    revealPos((prev) => [...prev, sc.position]);
    const pos = currentSpread?.positions[sc.position];
    const posLabel = pos ? getPositionLabel(pos, locale) : fallbackPosLabel(sc.position, locale);
    const keywords = sc.isReversed ? sc.card.reversed.keywords : sc.card.upright.keywords;
    const wl = getWaitingLinesData(locale);
    const cardName = getCardName(sc.card, locale);
    const preview = wl.buildCardPreviewLine(charId, cardName, keywords, posLabel);
    addMsg({ id: crypto.randomUUID(), role: "character", content: preview, mood: "mystical", timestamp: new Date() });
  };
}

function getReadingErrorText(msg: string, charId: string | null | undefined): string {
  const wl = getWaitingLinesData(useLocaleStore.getState().locale);
  const lines = (charId && wl.characterErrorLines[charId]) ? wl.characterErrorLines[charId] : wl.defaultErrorLines;
  if (msg.includes("GROK_API_KEY")) return lines.api;
  return lines.reading;
}

function addReadingResultMessages(
  result: ReadingResult,
  cards: SelectedCard[],
  currentSpread: SpreadDefinition | null,
  addChatMessage: (msg: ChatMessage) => void,
  locale: Locale,
): void {
  if (Array.isArray(result.cardInterpretations) && result.cardInterpretations.length > 0) {
    for (const interp of result.cardInterpretations) {
      const card = cards.find((c) => c.card.id === interp.cardId);
      const pos = currentSpread?.positions[interp.position];
      const posLabel = pos ? getPositionLabel(pos, locale) : fallbackPosLabel(interp.position, locale);
      addChatMessage({
        id: crypto.randomUUID(), role: "character",
        content: `[${posLabel}] ${card?.card ? getCardName(card.card, locale) : ""}\n\n${interp.interpretation}`,
        mood: "smile", timestamp: new Date(),
      });
    }
  }
  if (result.overallReading) {
    const header = translate("tarot.session.msg.overall-header", locale);
    addChatMessage({ id: crypto.randomUUID(), role: "character", content: `${header}\n\n${result.overallReading}`, mood: "smile", timestamp: new Date() });
  }
  if (result.advice) {
    const header = translate("tarot.session.msg.advice-header", locale);
    addChatMessage({ id: crypto.randomUUID(), role: "character", content: `${header}\n\n${result.advice}`, mood: "smile", timestamp: new Date() });
  }
}

interface UseTarotReadingOptions {
  setRevealedPositions: Dispatch<SetStateAction<number[]>>;
  setPendingConfirm: (v: boolean) => void;
}

export interface UseTarotReadingReturn {
  readingError: boolean;
  readingErrorReason: "timeout" | "generic";
  isConnecting: boolean;
  elapsedSec: number;
  readingAbortRef: React.MutableRefObject<AbortController | null>;
  startReading: (cards: SelectedCard[]) => Promise<void>;
  setReadingError: Dispatch<SetStateAction<boolean>>;
}

export function useTarotReading({ setRevealedPositions, setPendingConfirm }: UseTarotReadingOptions): UseTarotReadingReturn {
  const [readingError, setReadingError] = useState(false);
  const [readingErrorReason, setReadingErrorReason] = useState<"timeout" | "generic">("generic");
  const [readingStartedAt, setReadingStartedAt] = useState<number | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const readingAbortRef = useRef<AbortController | null>(null);
  const readingInFlightRef = useRef(false);

  const phase = useSessionStore((s) => s.phase);
  const isLoading = useSessionStore((s) => s.isLoading);

  // elapsed counter — phase=reading + isLoading 동안 1초 단위로 갱신
  useEffect(() => {
    if (phase !== "reading" || !isLoading || readingStartedAt === null) return undefined;
    const interval = setInterval(() => {
      setElapsedSec(Math.floor((Date.now() - readingStartedAt) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [phase, isLoading, readingStartedAt]);

  const startWaitingSequence = useCallback((cards: SelectedCard[], charId: string) => {
    const { locale } = useLocaleStore.getState();
    const { spreadType, addChatMessage } = useSessionStore.getState();
    const wl = getWaitingLinesData(locale);
    const timers: ReturnType<typeof setTimeout>[] = [];
    const currentSpread = spreadType ? spreads[spreadType] : null;
    const lines = wl.waitingLines[charId] || wl.defaultWaitingLines;

    cards.forEach((sc, i) => {
      timers.push(setTimeout(
        buildRevealStep(sc, currentSpread, charId, locale, setRevealedPositions, addChatMessage),
        (i + 1) * 2000,
      ));
    });

    const baseDelay = (cards.length + 1) * 2000;
    lines.forEach((line, i) => {
      timers.push(setTimeout(() => {
        addChatMessage({ id: crypto.randomUUID(), role: "character", content: line.content, mood: line.mood, timestamp: new Date() });
      }, baseDelay + i * 3000));
    });

    return () => timers.forEach(clearTimeout);
  }, [setRevealedPositions]);

  const startReading = useCallback(async (cards: SelectedCard[]) => {
    if (readingInFlightRef.current) return;
    const {
      requiredCards: required, topic, spreadType, characterId,
      sessionId: storeSessionId, setPhase, setLoading, setReadingResult, addChatMessage,
    } = useSessionStore.getState();
    const { setMood } = useCharacterStore.getState();
    const { revealAll: revealAllCards } = useReadingRevealStore.getState();
    const { locale } = useLocaleStore.getState();

    if (!cards || cards.length !== required) {
      console.warn("[tarot-session] startReading aborted: card count mismatch", cards?.length ?? 0, "/", required);
      setPendingConfirm(false);
      setLoading(false);
      return;
    }
    readingInFlightRef.current = true;
    setPendingConfirm(false);
    setPhase("reading"); setLoading(true); setMood("mystical"); setReadingError(false);
    setReadingErrorReason("generic");
    setIsConnecting(true);
    setElapsedSec(0);
    setReadingStartedAt(Date.now());
    setRevealedPositions([]);
    addChatMessage({ id: crypto.randomUUID(), role: "character", content: translate("tarot.session.msg.cards-gathered", locale), mood: "mystical", timestamp: new Date() });

    const stopSequence = startWaitingSequence(cards, characterId || "arcana");

    // sessionId 확보 대기 (최대 3초) — race condition 방지
    let sessionId = storeSessionId;
    if (!sessionId) {
      for (let i = 0; i < 6; i++) {
        await new Promise((r) => setTimeout(r, 500));
        sessionId = useSessionStore.getState().sessionId;
        if (sessionId) break;
      }
    }

    if (!sessionId) {
      stopSequence();
      addChatMessage({
        id: crypto.randomUUID(), role: "character",
        content: getReadingErrorText(translate("tarot.session.msg.connection-failed", locale), characterId ?? "arcana"),
        mood: "default", timestamp: new Date(),
      });
      setMood("default");
      setReadingError(true);
      setLoading(false);
      setReadingStartedAt(null);
      setIsConnecting(false);
      readingInFlightRef.current = false;
      return;
    }

    setIsConnecting(false);

    // 클라이언트 hard timeout (240초). 서버 AI_TIMEOUT_MS와 동조 — 10장+ 카드 리딩(max_tokens 24500+)은
    // reasoning 흡수 + 한국어 비효율 + JSON stream으로 200~400s 소요 가능. 120s/180s에서는 본문 잘림 빈발.
    const abortController = new AbortController();
    readingAbortRef.current = abortController;
    let finished = false;
    const timeoutId = setTimeout(() => {
      if (finished) return;
      finished = true;
      abortController.abort();
      stopSequence();
      console.warn("[tarot-session] 클라이언트 타임아웃 (240s)");
      setMood("default");
      setReadingErrorReason("timeout");
      setReadingError(true);
      setLoading(false);
      setReadingStartedAt(null);
      readingInFlightRef.current = false;
    }, 240_000);

    await fetchSSEStream({
      url: "/api/tarot/reading",
      signal: abortController.signal,
      body: {
        sessionId, topic, spreadType, characterId,
        userInfo: useSessionStore.getState().userInfo,
        freeQuestion: useSessionStore.getState().freeQuestion,
        cards: cards.map((c) => ({ cardId: c.card.id, position: c.position, isReversed: c.isReversed })),
      },
      onChunk: () => { /* 청크별 화면 표시 없음 — 대기 연출 + 인디케이터 사용 */ },
      onDone: (data) => {
        if (finished) return;
        finished = true;
        clearTimeout(timeoutId);
        stopSequence();
        const result = data.result as ReadingResult | undefined;
        if (!result) {
          addChatMessage({ id: crypto.randomUUID(), role: "character", content: translate("tarot.session.msg.no-result", locale), mood: "default", timestamp: new Date() });
          setMood("default"); setReadingError(true);
          readingInFlightRef.current = false;
          return;
        }

        if (
          result.parseError === "invalid_json" ||
          result.parseError === "missing_fields"
        ) {
          console.warn("[tarot-session] 결과 표시 불가:", { parseError: result.parseError, expected: result.expectedCardCount });
          addChatMessage({ id: crypto.randomUUID(), role: "character", content: translate("tarot.session.msg.no-result", locale), mood: "default", timestamp: new Date() });
          setMood("default"); setReadingError(true);
          readingInFlightRef.current = false;
          return;
        }

        if (result.parseError === "truncated" || result.parseError === "fallback_text") {
          console.warn("[tarot-session] 부분 파싱 응답:", { expected: result.expectedCardCount, got: result.cardInterpretations?.length ?? 0 });
          addChatMessage({ id: crypto.randomUUID(), role: "character", content: translate("tarot.session.msg.partial-result", locale), mood: "default", timestamp: new Date() });
        }

        setRevealedPositions(cards.map((c) => c.position));
        setReadingResult(result);
        revealAllCards(cards.map((c) => c.card.id));
        const currentSpread = spreadType ? spreads[spreadType] : null;
        addReadingResultMessages(result, cards, currentSpread, addChatMessage, locale);
        setPhase("result"); setMood(CHARACTER_RESULT_MOODS[characterId ?? ""] ?? "smile");
        readingInFlightRef.current = false;
      },
      onError: (msg) => {
        if (finished) return;
        finished = true;
        clearTimeout(timeoutId);
        stopSequence();
        console.error("리딩 SSE 에러:", msg);
        addChatMessage({
          id: crypto.randomUUID(), role: "character",
          content: getReadingErrorText(msg, characterId),
          mood: "default", timestamp: new Date(),
        });
        setMood("default"); setReadingError(true);
        readingInFlightRef.current = false;
      },
    });
    if (!finished) clearTimeout(timeoutId);
    useSessionStore.getState().setLoading(false);
    setReadingStartedAt(null);
    readingInFlightRef.current = false;
  }, [setPendingConfirm, setRevealedPositions, startWaitingSequence]);

  return { readingError, readingErrorReason, isConnecting, elapsedSec, readingAbortRef, startReading, setReadingError };
}
