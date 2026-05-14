"use client";

import React, { useEffect, useCallback, useState, useRef } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ReadingText } from "@/components/common/ReadingText";
import { motion, AnimatePresence } from "framer-motion";
import { useSessionStore } from "@/hooks/useSession";
import { useCharacterStore } from "@/hooks/useCharacter";
import { useCardAnimationStore } from "@/hooks/useCardAnimation";
import { CharacterDisplay } from "@/components/character/CharacterDisplay";
import { DialogueBox } from "@/components/chat/DialogueBox";

const ShuffleCeremony = dynamic(
  () => import("@/components/tarot/ShuffleCeremony").then((m) => ({ default: m.ShuffleCeremony })),
  { ssr: false, loading: () => null },
);
const CardDeck = dynamic(
  () => import("@/components/card/CardDeck").then((m) => ({ default: m.CardDeck })),
  { loading: () => <div className="w-full flex-1 min-h-[160px] md:min-h-[280px]" /> },
);
const CardSpread = dynamic(
  () => import("@/components/card/CardSpread").then((m) => ({ default: m.CardSpread })),
  { loading: () => <div className="w-full flex-1 min-h-[200px] md:min-h-[360px]" /> },
);
const ReadingProgressIndicator = dynamic(
  () => import("@/components/tarot/ReadingProgressIndicator").then((m) => ({ default: m.ReadingProgressIndicator })),
  { loading: () => null },
);
import { ParticleOverlay } from "@/components/effects/ParticleOverlay";
import { MysticBackground, ThemeAtmosphere } from "@/components/effects/MysticBackground";
import { getCharacterById } from "@/data/characters";
import { CHARACTER_RESULT_MOODS } from "@/data/characters/waiting-lines";
import { getWaitingLinesData } from "@/data/characters/waiting-lines-i18n";
import { getCardName } from "@/data/cards/locale-helpers";
import { getCharacterGreeting } from "@/data/characters/locale-helpers";
import { useLocaleStore } from "@/hooks/useLocaleStore";
import { DeckManager } from "@/services/tarot/deck-manager";
import { spreads, getPositionLabel } from "@/data/spreads";
import { TarotCard, SelectedCard } from "@/types/card";
import { ReadingResult } from "@/types/service";
import { SpreadDefinition, ChatMessage } from "@/types/session";
import { fetchSSEStream } from "@/hooks/useSSEStream";
import { useT } from "@/i18n/useT";
import { useThemeStore } from "@/hooks/useTheme";
import { getServiceBackgroundUrl } from "@/lib/storage/card-style";
import { t as translate } from "@/i18n/translations";
import type { Locale } from "@/i18n/config";
import { useReadingRevealStore } from "@/hooks/useReadingReveal";

/** "위치 N" / "Position N" / "位置 N" — locale별 fallback 라벨 */
function fallbackPosLabel(position: number, locale: Locale): string {
  return translate("tarot.session.position-fallback", locale).replace("{n}", String(position + 1));
}


const deckManager = new DeckManager();

/** startWaitingSequence 내부 setTimeout 콜백 — 중첩 5단계 초과 해소용 헬퍼 */
function buildRevealStep(
  sc: SelectedCard,
  currentSpread: SpreadDefinition | null,
  charId: string,
  locale: Locale,
  revealPos: React.Dispatch<React.SetStateAction<number[]>>,
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

/** 타로 결과 공유 버튼 핸들러 — CC 22 → 모듈 레벨 추출 */
async function shareTarotResult(locale: Locale): Promise<void> {
  const result = useSessionStore.getState().readingResult;
  const shareToken = result?.shareToken;
  const siteName = "ArcanaInsight";
  const shareTitle = `${translate("tarot.session.share.title", locale)} - ${siteName}`;
  const linkCopied = translate("common.share.link-copied", locale);
  const textCopied = translate("common.share.text-copied", locale);

  if (shareToken) {
    const url = `${globalThis.location?.origin}/tarot/result/${shareToken}`;
    const text = `🔮 ${shareTitle}`;
    if (navigator.share) {
      try { await navigator.share({ title: shareTitle, text, url }); } catch { /* 사용자가 공유를 취소함 */ } // NOSONAR
    } else {
      try {
        await navigator.clipboard.writeText(`${text}\n${url}`);
        alert(linkCopied);
      } catch (e) { console.warn("clipboard write failed:", e); }
    }
  } else {
    const summary = result?.overallReading
      ? `🔮 ${shareTitle}\n\n${result.overallReading}\n\n- ${siteName}`
      : `🔮 ${shareTitle}\n\n- ${siteName}`;
    if (navigator.share) {
      try { await navigator.share({ title: shareTitle, text: summary }); } catch { /* 사용자가 공유를 취소함 */ } // NOSONAR
    } else {
      try {
        await navigator.clipboard.writeText(summary);
        alert(textCopied);
      } catch (e) { console.warn("clipboard write failed:", e); }
    }
  }
}

/** SSE 에러 메시지에서 캐릭터 말투의 사용자 표시 텍스트를 결정한다 */
function getReadingErrorText(msg: string, charId: string | null | undefined): string {
  const wl = getWaitingLinesData(useLocaleStore.getState().locale);
  const lines = (charId && wl.characterErrorLines[charId]) ? wl.characterErrorLines[charId] : wl.defaultErrorLines;
  if (msg.includes("GROK_API_KEY")) return lines.api;
  return lines.reading;
}

/** 정상 리딩 결과를 채팅 메시지로 변환하여 addChatMessage를 호출한다 */
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

export default function TarotSessionPage() {
  const router = useRouter();
  const locale = useLocaleStore((s) => s.locale);
  const { t } = useT();
  const { currentMood, setMood } = useCharacterStore();
  const { animationPhase, setAnimationPhase } = useCardAnimationStore();
  const {
    phase, topic, characterId, spreadType, requiredCards, selectedCards, chatMessages, readingResult, isLoading,
    setPhase, setSessionId, setAvailableCards,
    selectCard, addChatMessage, setReadingResult, setLoading,
  } = useSessionStore();

  const character = characterId ? getCharacterById(characterId) : null;

  const { isRevealComplete, revealAll: revealAllCards, reset: resetReveal } = useReadingRevealStore();

  const [shuffledDeck, setShuffledDeck] = useState<TarotCard[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [revealedPositions, setRevealedPositions] = useState<number[]>([]);
  const [readingError, setReadingError] = useState(false);
  const [readingErrorReason, setReadingErrorReason] = useState<"timeout" | "generic">("generic");
  const [readingStartedAt, setReadingStartedAt] = useState<number | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const readingAbortRef = useRef<AbortController | null>(null);
  const [pendingConfirm, _setPendingConfirm] = useState(false);
  const pendingConfirmRef = useRef(false);
  const setPendingConfirm = (v: boolean) => { pendingConfirmRef.current = v; _setPendingConfirm(v); };
  const [confirmEachCard, setConfirmEachCard] = useState(false);
  const resultContainerRef = useRef<HTMLDivElement>(null);
  const redirectedRef = useRef(false);
  // 빠른 연속 터치 race 차단: 동기 ref-lock (RAF로 다음 frame에 unlock)
  const selectionLockRef = useRef(false);
  // 마지막 카드 자동 시작 setTimeout 이중 큐잉 차단
  const autoStartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 자동 시작 타이머와 확인 버튼이 동시에 startReading을 호출하는 race 차단
  const readingInFlightRef = useRef(false);

  const toggleConfirmMode = () => {
    setConfirmEachCard((prev) => {
      const next = !prev;
      localStorage.setItem("arcana-confirm-each-card", String(next));
      return next;
    });
  };

  useEffect(() => {
    const t = setTimeout(() => {
      setConfirmEachCard(localStorage.getItem("arcana-confirm-each-card") === "true");
    }, 0);
    return () => clearTimeout(t);
  }, []);

  // unmount cleanup: 진행 중인 SSE abort + 자동 시작 타이머 clear (saju/shinjeom과 동일 패턴)
  useEffect(() => {
    return () => {
      readingAbortRef.current?.abort();
      if (autoStartTimerRef.current) {
        clearTimeout(autoStartTimerRef.current);
        autoStartTimerRef.current = null;
      }
    };
  }, []);

  // phase가 초기화되면 reveal 상태도 리셋
  useEffect(() => {
    if (phase === "card-shuffle" || phase === "card-select") {
      resetReveal();
    }
  }, [phase, resetReveal]);

  useEffect(() => {
    if (!topic || !character || !spreadType) {
      if (!redirectedRef.current) { redirectedRef.current = true; router.push("/tarot"); }
      return;
    }
    const allCards = deckManager.getAllCards();
    const shuffled = [...allCards];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    setShuffledDeck(shuffled);
    setAvailableCards(shuffled);

    // 세션 생성을 await하여 sessionId 확보 후 카드 선택 시작
    const initSession = async () => {
      try {
        const res = await fetch("/api/tarot/session", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ topic, characterId, spreadType }),
        });
        if (!res.ok) throw new Error(`세션 생성 실패: ${res.status}`);
        const data = await res.json();
        if (data.session?.id) setSessionId(data.session.id);
      } catch (err) {
        console.warn("세션 생성 실패 (리딩은 계속 진행):", err);
      }
    };
    initSession();

    setMood("default");
    addChatMessage({ id: crypto.randomUUID(), role: "character", content: getCharacterGreeting(character, locale), mood: "default", timestamp: new Date() });

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topic]); // NOSONAR

  const handleCeremonyComplete = useCallback(() => {
    const { requiredCards: required } = useSessionStore.getState();
    setAnimationPhase("spreading");
    setPhase("card-select");
    addChatMessage({
      id: crypto.randomUUID(), role: "character",
      content: t("tarot.session.msg.pick-cards-prompt").replace("{n}", String(required)),
      mood: "default", timestamp: new Date(),
    });
  }, [addChatMessage, setAnimationPhase, setPhase, t]);

  const handleCardSelect = useCallback((index: number) => {
    // 빠른 연속 터치 race 차단:
    // 1. selectionLockRef 동기 ref-lock (state 반영 전 두 번째 click 차단)
    // 2. pendingConfirmRef (확인 대기 중 추가 선택 차단)
    if (selectionLockRef.current || pendingConfirmRef.current) return;
    // TOCTOU 방지: lock을 fresh getState 호출 직전에 즉시 set (다른 click handler가 동일 frame에 진입해도 차단)
    selectionLockRef.current = true;
    requestAnimationFrame(() => { selectionLockRef.current = false; });
    // 항상 fresh 상태를 읽어 stale closure 방지
    const { selectedCards: currentCards, requiredCards: required } = useSessionStore.getState();
    if (currentCards.length >= required) return;
    // 같은 deck index 중복 클릭 방어 (CardDeck isSelected prop의 stale 보완)
    if (currentCards.some((c) => c.card.id === shuffledDeck[index]?.id)) return;

    const card = shuffledDeck[index];
    if (!card) return;
    const isReversed = Math.random() > 0.5;
    const position = currentCards.length;
    const selected: SelectedCard = { card, position, isReversed, selectedAt: new Date() };
    if (!selectCard(selected)) return;
    setSelectedIndices((prev) => prev.includes(index) ? prev : [...prev, index]);
    setRevealedPositions((prev) => prev.includes(position) ? prev : [...prev, position]);
    setMood("surprised");

    const currentCount = currentCards.length + 1;
    const isLast = currentCount >= required;

    if (isLast && !confirmEachCard) {
      // 확인 모드 OFF + 마지막 카드 → 자동으로 리딩 시작 (즉시 잠금으로 중복 방지)
      setPendingConfirm(true);
      // setTimeout 이중 큐잉 차단: 이미 예약된 타이머가 있으면 재예약 안 함
      if (autoStartTimerRef.current) return;
      autoStartTimerRef.current = setTimeout(() => {
        autoStartTimerRef.current = null;
        const { selectedCards: allCards, requiredCards: req } = useSessionStore.getState();
        // 800ms 동안 cancel·race로 카드 수가 줄었으면 startReading 차단 (서버에 부족한 cards 전달 방지)
        if (allCards.length < req) {
          console.warn("[tarot-session] auto-start aborted: insufficient cards", allCards.length, "/", req);
          setPendingConfirm(false);
          return;
        }
        startReading(allCards);
      }, 800);
    } else if (confirmEachCard || isLast) {
      // 확인 모드 ON 또는 마지막 카드(확인 모드 ON) → 확인 요청
      setPendingConfirm(true);
      setTimeout(() => {
        addChatMessage({
          id: crypto.randomUUID(), role: "character",
          content: isLast
            ? t("tarot.session.msg.confirm-final").replace("{n}", String(required))
            : t("tarot.session.msg.confirm-card")
                .replace(/\{current\}/g, String(currentCount))
                .replace(/\{total\}/g, String(required)),
          mood: "mystical", timestamp: new Date(),
        });
      }, 500);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shuffledDeck, confirmEachCard, selectCard, setMood, addChatMessage]); // NOSONAR

  /** 확인 → 마지막 카드면 리딩 시작, 아니면 다음 카드 선택 계속 */
  const handleConfirmCard = useCallback(() => {
    // 빠른 더블클릭으로 startReading 이중 호출 차단
    if (!pendingConfirmRef.current) return;
    if (autoStartTimerRef.current) {
      clearTimeout(autoStartTimerRef.current);
      autoStartTimerRef.current = null;
    }
    setPendingConfirm(false);
    const { selectedCards: currentCards } = useSessionStore.getState();
    if (currentCards.length >= requiredCards) {
      startReading(currentCards);
    } else {
      const nextCardMsg = translate("tarot.session.msg.next-card", locale)
        .replace("{current}", String(currentCards.length))
        .replace("{total}", String(requiredCards));
      addChatMessage({
        id: crypto.randomUUID(), role: "character",
        content: nextCardMsg,
        mood: "default", timestamp: new Date(),
      });
      setMood("default");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requiredCards, addChatMessage, setMood]); // NOSONAR

  /** 취소 → 마지막 카드 제거, 다시 선택 가능 */
  const handleCancelLastCard = useCallback(() => {
    // 자동 시작 타이머가 예약돼 있으면 cancel — store가 줄어든 상태로 startReading 발화 방지
    if (autoStartTimerRef.current) {
      clearTimeout(autoStartTimerRef.current);
      autoStartTimerRef.current = null;
    }
    setPendingConfirm(false);
    const currentCards = useSessionStore.getState().selectedCards;
    if (currentCards.length === 0) return;
    const lastCard = currentCards[currentCards.length - 1];
    const remaining = currentCards.slice(0, -1);
    useSessionStore.setState({ selectedCards: remaining });
    setSelectedIndices((prev) => prev.slice(0, -1));
    setRevealedPositions((prev) => prev.filter((p) => p !== lastCard.position));
    addChatMessage({
      id: crypto.randomUUID(), role: "character",
      content: translate("tarot.session.msg.different-card", locale),
      mood: "default", timestamp: new Date(),
    });
    setMood("default");
  }, [addChatMessage, setMood, locale]);

  // 대기 연출: 카드 순차 뒤집기 + 캐릭터 대사 + 카드 미리보기
  const startWaitingSequence = useCallback((cards: SelectedCard[], charId: string) => {
    const wl = getWaitingLinesData(locale);
    const timers: ReturnType<typeof setTimeout>[] = [];
    const currentSpread = spreadType ? spreads[spreadType] : null;
    const lines = wl.waitingLines[charId] || wl.defaultWaitingLines;

    // 1단계: 카드 순차 뒤집기 (2초 간격) + 카드 정보 미리보기
    cards.forEach((sc, i) => {
      timers.push(setTimeout(
        buildRevealStep(sc, currentSpread, charId, locale, setRevealedPositions, addChatMessage),
        (i + 1) * 2000,
      ));
    });

    // 2단계: 캐릭터 대기 대사 (카드 뒤집기 끝난 후 3초 간격)
    // CLAUDE.md 규칙: 대기 대사 중 표정 변경 금지 — setMood 호출 제거
    const baseDelay = (cards.length + 1) * 2000;
    lines.forEach((line, i) => {
      timers.push(setTimeout(() => {
        addChatMessage({ id: crypto.randomUUID(), role: "character", content: line.content, mood: line.mood, timestamp: new Date() });
      }, baseDelay + i * 3000));
    });

    return () => timers.forEach(clearTimeout);
  }, [locale, spreadType, addChatMessage]);

  const startReading = async (cards: SelectedCard[]) => {
    if (readingInFlightRef.current) return;
    const { requiredCards: required } = useSessionStore.getState();
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
    // 카드 뒤집기 초기화 (reading 시작 시 전부 뒷면으로)
    setRevealedPositions([]);
    addChatMessage({ id: crypto.randomUUID(), role: "character", content: translate("tarot.session.msg.cards-gathered", locale), mood: "mystical", timestamp: new Date() });

    // 대기 연출 시작 (API 호출과 동시 실행)
    const stopSequence = startWaitingSequence(cards, characterId || "arcana");

    // sessionId 확보 대기 (최대 3초) — race condition 방지
    let sessionId = useSessionStore.getState().sessionId;
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

        // 결과 표시 불가 — fallback_text는 정제된 본문이 있으므로 세션 화면에서는 표시한다.
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

        // 부분/대체 파싱 — 받은 해석은 그대로 표시하고 안내 메시지 추가
        if (result.parseError === "truncated" || result.parseError === "fallback_text") {
          console.warn("[tarot-session] 부분 파싱 응답:", { expected: result.expectedCardCount, got: result.cardInterpretations?.length ?? 0 });
          addChatMessage({ id: crypto.randomUUID(), role: "character", content: translate("tarot.session.msg.partial-result", locale), mood: "default", timestamp: new Date() });
        }

        // 정상 흐름 (또는 부분 결과) — 카드 뒤집기 완료 + 결과 phase 진입
        setRevealedPositions(cards.map((c) => c.position));
        setReadingResult(result);
        revealAllCards(cards.map((c) => c.card.id)); // 리딩 완료 → 카드 텍스트 공개
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
    setLoading(false);
    setReadingStartedAt(null);
    readingInFlightRef.current = false;
  };

  // elapsed 카운터 — phase=reading + isLoading 동안 1초 단위로 갱신.
  // CLAUDE.md SSR 패턴: 초기값 0, useEffect 안에서만 setInterval, cleanup 필수.
  useEffect(() => {
    if (phase !== "reading" || !isLoading || readingStartedAt === null) return undefined;
    const interval = setInterval(() => {
      setElapsedSec(Math.floor((Date.now() - readingStartedAt) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [phase, isLoading, readingStartedAt]);

  // 결과 스트리밍 시 컨테이너 내부만 하단 스크롤 (윈도우 스크롤 방지)
  useEffect(() => {
    if (phase === "result") {
      const container = resultContainerRef.current;
      if (container) container.scrollTop = container.scrollHeight;
    }
  }, [chatMessages, phase]);

  const spread = spreadType ? spreads[spreadType] : null;
  // showLabel: AI 리딩 완료(result phase + reveal complete) 시에만 카드 텍스트 공개
  const showCardLabel = phase === "result" && isRevealComplete;
  const particleDensityMap: Record<string, "low" | "medium" | "high"> = { reading: "medium", result: "low" };
  const particleDensity = particleDensityMap[phase] ?? "medium";
  const effectTheme = character?.effectTheme;
  const { activeTheme } = useThemeStore();

  return (
    <div className="relative h-[calc(100dvh-7rem)] md:h-[calc(100dvh-3.5rem)] flex flex-col overflow-hidden">
      {/* 배경 */}
      <div className="absolute inset-0 -z-10">
        <Image src={getServiceBackgroundUrl('tarot', activeTheme)} alt="" fill className="object-cover" priority sizes="100vw" unoptimized />
        <div className="absolute inset-0 bg-arcana-bg/50" />
        <div className="absolute inset-0" style={{
          background: "radial-gradient(ellipse at center, transparent 40%, rgba(10,10,26,0.7) 100%)",
        }} />
      </div>

      {/* 파티클 */}
      <ParticleOverlay
        density={particleDensity}
        colorScheme={effectTheme ? { primary: effectTheme.primary, secondary: effectTheme.secondary, accent: effectTheme.accent } : undefined}
        particleStyle={effectTheme?.particleStyle}
        className="z-10"
      />
      <MysticBackground service="tarot" />
      <ThemeAtmosphere theme={activeTheme} intensity="ambient" className="z-[6] mix-blend-screen" testId="session-theme-atmosphere-tarot" />

      {/* 무대: 모바일 세로 / 데스크탑 가로 5:5 */}
      <div className="relative flex-1 min-h-0 flex flex-col md:flex-row z-20">
        {/* 좌측 컬럼: 캐릭터 + 대사 */}
        <div className="w-full h-[25%] md:h-auto md:w-[50%] md:flex-shrink-0 flex flex-col transition-all duration-500">
          {/* 캐릭터 */}
          {character && (
            <div className="flex-1 relative overflow-hidden">
              <CharacterDisplay character={character} mood={currentMood} className="w-full h-full" />
              {/* 데스크탑: 하단 그라디언트 — 대사창과 자연스럽게 연결 */}
              <div className="hidden md:block absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-arcana-bg/80 to-transparent pointer-events-none" />
            </div>
          )}
          {/* 대사창 — 데스크탑에서 캐릭터 하단에 표시 */}
          {phase !== "result" && (
            <div className="hidden md:block flex-shrink-0 px-4 pb-4">
              <DialogueBox
                messages={chatMessages}
                characterName={character?.name ?? ""}
                isTyping={false}
              />
            </div>
          )}
        </div>

        {/* 우측: 모바일 하단 / 데스크탑 우측 50% */}
        <div className="flex-1 md:w-[50%] flex flex-col px-2 md:px-4 overflow-hidden">
          {phase === "card-shuffle" && (
            <ShuffleCeremony
              characterId={characterId ?? "arcana"}
              onComplete={handleCeremonyComplete}
              primaryColor={character?.effectTheme?.primary}
            />
          )}
          {phase === "card-select" && (
            <div className="flex items-center justify-between mb-2">
              <button
                onClick={() => { useSessionStore.getState().reset(); useCardAnimationStore.getState().reset(); router.push("/tarot"); }}
                className="text-arcana-muted text-xs hover:text-arcana-purple transition-colors"
                type="button"
              >
                {t("tarot.session.btn.back-to-character")}
              </button>
              <button
                onClick={toggleConfirmMode}
                className={`flex items-center gap-2 text-xs font-serif px-3 py-1.5 rounded-full border transition-all ${
                  confirmEachCard
                    ? "border-arcana-purple bg-arcana-purple/20 text-arcana-purple shadow-sm shadow-arcana-purple/10"
                    : "border-arcana-border/50 text-arcana-muted/60 hover:border-arcana-border hover:text-arcana-muted"
                }`}
                type="button"
              >
                <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${
                  confirmEachCard ? "border-arcana-purple bg-arcana-purple" : "border-arcana-muted/40"
                }`}>
                  {confirmEachCard && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                </span>
                {t("settings.card-confirm.label")}
              </button>
            </div>
          )}
          <AnimatePresence mode="wait">
            {phase === "card-select" && (
              <motion.div
                key="deck"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="w-full flex-1 flex flex-col items-center justify-center overflow-hidden"
              >
                <CardDeck
                  cards={shuffledDeck}
                  isSpread={animationPhase === "spreading"}
                  selectedIndices={selectedIndices}
                  onCardSelect={handleCardSelect}
                />
                {/* 카드 확인/취소 버튼 */}
                {pendingConfirm && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex gap-3 mt-3"
                  >
                    <button
                      onClick={handleCancelLastCard}
                      className="px-5 py-2 rounded-full border border-arcana-border text-arcana-muted text-xs font-serif font-bold hover:border-arcana-purple hover:text-arcana-purple transition-colors"
                    >
                      {t("tarot.session.btn.pick-again")}
                    </button>
                    <button
                      onClick={handleConfirmCard}
                      className="px-5 py-2 rounded-full bg-gradient-to-r from-arcana-purple to-arcana-indigo text-white text-xs font-serif font-bold hover:opacity-90 transition-opacity shadow-lg shadow-arcana-purple/20"
                    >
                      {selectedCards.length >= requiredCards ? t("tarot.session.btn.proceed") : t("tarot.session.btn.confirm")}
                    </button>
                  </motion.div>
                )}
              </motion.div>
            )}
            {phase === "reading" && spread && (
              <motion.div
                key="spread"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-md md:max-w-2xl flex-1 flex items-center justify-center mx-auto relative pt-2"
              >
                <CardSpread
                  selectedCards={selectedCards}
                  spread={spread}
                  revealedPositions={revealedPositions}
                  glowColor={effectTheme?.primary}
                  showLabel={showCardLabel}
                />
                {/* 카드 뒤집기 연출 + 진행 인디케이터 동시 노출. 인디케이터는 화면 하단 fixed 미니 배너. */}
                {phase === "reading" && isLoading && !readingError && (
                  <ReadingProgressIndicator
                    elapsedSec={elapsedSec}
                    isConnecting={isConnecting}
                    primaryColor={effectTheme?.primary}
                  />
                )}
                {readingError && !isLoading && (
                  <div className="absolute inset-0 flex items-center justify-center z-10" data-testid="reading-error">
                    <div className="flex flex-col items-center gap-3 px-5 py-5 rounded-2xl bg-arcana-card/90 border border-red-500/40 shadow-xl backdrop-blur-md max-w-sm">
                      <p className="text-arcana-text text-sm md:text-base font-serif font-bold text-center">
                        {t("tarot.session.error.title")}
                      </p>
                      <p className="text-arcana-muted text-xs md:text-sm font-sans text-center">
                        {readingErrorReason === "timeout" ? t("tarot.session.error.timeout") : t("tarot.session.error.reading")}
                      </p>
                      <div className="flex gap-3">
                        <button
                          data-testid="reading-retry"
                          onClick={() => { setReadingError(false); startReading(selectedCards); }}
                          disabled={isLoading}
                          className="px-6 py-2 rounded-full bg-gradient-to-r from-arcana-purple to-arcana-indigo text-white font-serif font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {t("tarot.session.btn.try-again")}
                        </button>
                        <button
                          onClick={() => { useSessionStore.getState().reset(); useCardAnimationStore.getState().reset(); router.push("/tarot"); }}
                          className="px-6 py-2 rounded-full border border-arcana-purple text-arcana-purple font-serif font-bold text-sm hover:bg-arcana-purple/10 transition-colors"
                        >
                          {t("tarot.session.btn.new-session")}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
            {phase === "result" && readingResult && (
              <motion.div
                key="result"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="w-full flex-1 flex flex-col overflow-hidden py-4"
              >
                {/* 리딩 결과만 표시 (캐릭터 대사 제외) */}
                <div ref={resultContainerRef} data-testid="reading-content" className="space-y-4 md:space-y-5 flex-1 overflow-y-auto pr-2">
                  {/* 카드별 해석 — 순차 공개 */}
                  {readingResult.cardInterpretations?.map((interp, i) => {
                    const card = selectedCards.find(c => c.card.id === interp.cardId);
                    const fallbackCard = !card && interp.position < selectedCards.length
                      ? selectedCards[interp.position] : null;
                    const displayName = card?.card ? getCardName(card.card, locale) : fallbackCard?.card ? getCardName(fallbackCard.card, locale) : "";
                    const pos = spread?.positions[interp.position];
                    const posLabel = pos ? getPositionLabel(pos, locale) : fallbackPosLabel(interp.position, locale);
                    return (
                      <motion.div
                        key={`card-${i}`}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.1 + Math.min(i * 0.2, 0.8), ease: "easeOut" }}
                        className="bg-arcana-card/70 backdrop-blur-sm border border-arcana-border rounded-2xl p-4 md:p-5"
                      >
                        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-arcana-border/50">
                          <span className="text-arcana-gold text-xs md:text-sm font-serif font-bold px-2 py-0.5 bg-arcana-gold/10 rounded-full">{posLabel}</span>
                          <span className="text-arcana-text font-bold text-sm md:text-base">{displayName}</span>
                        </div>
                        <ReadingText text={interp.interpretation} />
                      </motion.div>
                    );
                  })}

                  {/* 종합 해석 */}
                  {readingResult.overallReading && (
                    <motion.div
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 1, ease: "easeOut" }}
                      className="bg-arcana-purple/10 backdrop-blur-sm border border-arcana-purple/30 rounded-2xl p-4 md:p-5"
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-lg">🔮</span>
                        <span className="text-arcana-purple font-serif font-bold text-base md:text-lg">{t("tarot.result.overall")}</span>
                      </div>
                      <ReadingText text={readingResult.overallReading} />
                    </motion.div>
                  )}

                  {/* 조언 */}
                  {readingResult.advice && (
                    <motion.div
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 1.4, ease: "easeOut" }}
                      className="bg-arcana-gold/5 backdrop-blur-sm border border-arcana-gold/30 rounded-2xl p-4 md:p-5"
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-lg">✨</span>
                        <span className="text-arcana-gold font-serif font-bold text-base md:text-lg">{t("tarot.result.advice")}</span>
                      </div>
                      <ReadingText text={readingResult.advice} />
                    </motion.div>
                  )}

                </div>

                {/* 액션 버튼 */}
                <div className="flex gap-3 pt-5 flex-shrink-0">
                  <button
                    onClick={() => {
                      useSessionStore.getState().reset();
                      useCardAnimationStore.getState().reset();
                      router.push("/tarot");
                    }}
                    className="flex-1 px-6 py-2.5 rounded-full border border-arcana-purple text-arcana-purple font-serif font-bold text-sm hover:bg-arcana-purple/10 transition-colors"
                  >
                    {t("tarot.session.btn.new-session")}
                  </button>
                  <button
                    onClick={() => shareTarotResult(locale)}
                    className="flex-1 px-6 py-2.5 rounded-full bg-gradient-to-r from-arcana-purple to-arcana-indigo text-white font-serif font-bold text-sm hover:opacity-90 transition-opacity shadow-lg shadow-arcana-purple/20"
                  >
                    {t("tarot.session.btn.share")}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 대사창 — 모바일에서만 (데스크탑은 캐릭터 하단에 표시) */}
          {phase !== "result" && (
            <div className="md:hidden flex-shrink-0 z-30">
              <DialogueBox
                messages={chatMessages}
                characterName={character?.name ?? ""}
                isTyping={false}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
