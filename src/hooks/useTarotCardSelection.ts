"use client";

import { useEffect, useCallback, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSessionStore } from "@/hooks/useSession";
import { useCharacterStore } from "@/hooks/useCharacter";
import { useCardAnimationStore } from "@/hooks/useCardAnimation";
import { getCharacterById } from "@/data/characters";
import { getCharacterGreeting } from "@/data/characters/locale-helpers";
import { useLocaleStore } from "@/hooks/useLocaleStore";
import { DeckManager } from "@/services/tarot/deck-manager";
import { spreads } from "@/data/spreads";
import { TarotCard, SelectedCard } from "@/types/card";
import { useT } from "@/i18n/useT";
import { useThemeStore } from "@/hooks/useTheme";
import { t as translate } from "@/i18n/translations";
import { useReadingRevealStore } from "@/hooks/useReadingReveal";
import { useTarotReading } from "@/hooks/useTarotReading";
import { rememberGuestSession } from "@/lib/guest-sessions";

const deckManager = new DeckManager();

/**
 * 타로 세션 페이지의 카드 선택·리딩 진행 로직을 캡슐화한 컨트롤러 훅.
 * (이전에는 page.tsx 인라인이었으나 view/controller 분리를 위해 추출 — 동작은 verbatim 유지.)
 * 레이스 컨디션 가드(ref-lock·타이머 중복 차단·TOCTOU)는 원본 그대로 보존한다.
 */
export function useTarotCardSelection() {
  const router = useRouter();
  const locale = useLocaleStore((s) => s.locale);
  const { t } = useT();
  const { currentMood, setMood } = useCharacterStore();
  const { animationPhase, setAnimationPhase } = useCardAnimationStore();
  const {
    phase, topic, characterId, spreadType, requiredCards, selectedCards, chatMessages, readingResult, isLoading,
    setPhase, setSessionId, setAvailableCards,
    selectCard, addChatMessage,
  } = useSessionStore();

  const character = characterId ? getCharacterById(characterId) : null;

  const { isRevealComplete, reset: resetReveal } = useReadingRevealStore();

  const [shuffledDeck, setShuffledDeck] = useState<TarotCard[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [revealedPositions, setRevealedPositions] = useState<number[]>([]);
  const [pendingConfirm, _setPendingConfirm] = useState(false);
  const pendingConfirmRef = useRef(false);
  const setPendingConfirm = (v: boolean) => { pendingConfirmRef.current = v; _setPendingConfirm(v); };

  const { readingError, readingErrorReason, isConnecting, elapsedSec, readingAbortRef, startReading, setReadingError } =
    useTarotReading({ setRevealedPositions, setPendingConfirm });

  const [confirmEachCard, setConfirmEachCard] = useState(false);
  const resultContainerRef = useRef<HTMLDivElement>(null);
  const redirectedRef = useRef(false);
  // 빠른 연속 터치 race 차단: 동기 ref-lock (RAF로 다음 frame에 unlock)
  const selectionLockRef = useRef(false);
  // 마지막 카드 자동 시작 setTimeout 이중 큐잉 차단
  const autoStartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
  // readingAbortRef는 useTarotReading가 소유한 stable ref이므로 deps에 명시(재구독 없음).
  useEffect(() => {
    return () => {
      // 의도된 패턴: cleanup 시점의 최신 AbortController를 abort (in-flight SSE 중단)
      // eslint-disable-next-line react-hooks/exhaustive-deps
      readingAbortRef.current?.abort();
      if (autoStartTimerRef.current) {
        clearTimeout(autoStartTimerRef.current);
        autoStartTimerRef.current = null;
      }
    };
  }, [readingAbortRef]);

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
      const j = Math.floor(Math.random() * (i + 1)); // NOSONAR S2245 — 타로 카드 셔플(비보안 엔터테인먼트 용도)
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
        if (data.session?.id) { setSessionId(data.session.id); rememberGuestSession(data.session.id); }
      } catch (err) {
        console.warn("세션 생성 실패 (리딩은 계속 진행):", err);
      }
    };
    initSession();

    setMood("default");
    addChatMessage({ id: crypto.randomUUID(), role: "character", content: getCharacterGreeting(character, locale), mood: "default", timestamp: new Date() });

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topic]); // NOSONAR

  // ShuffleCeremony 제거 — card-shuffle 페이즈 진입 즉시 card-select로 전환
  useEffect(() => {
    if (phase === "card-shuffle") {
      handleCeremonyComplete();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]); // NOSONAR

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
    const isReversed = Math.random() > 0.5; // NOSONAR S2245 — 카드 정/역방향 무작위(비보안 용도)
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
                .replaceAll("{current}", String(currentCount))
                .replaceAll("{total}", String(required)),
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
    const lastCard = currentCards.at(-1)!;
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

  /** 카드 스프레드 단계에서 '뒤로' → 진행 상태만 비우고 스프레드 선택 단계로 복귀 (캐릭터/주제/스프레드 유지) */
  const handleBackToSpread = useCallback(() => {
    readingAbortRef.current?.abort();
    if (autoStartTimerRef.current) {
      clearTimeout(autoStartTimerRef.current);
      autoStartTimerRef.current = null;
    }
    const cid = useSessionStore.getState().characterId;
    // 진행 상태만 초기화 — characterId/topic/spreadType/userInfo/freeQuestion은 보존
    useSessionStore.setState({
      selectedCards: [],
      chatMessages: [],
      readingResult: null,
      sessionId: null,
      availableCards: [],
      isLoading: false,
    });
    useCardAnimationStore.getState().reset();
    router.push(cid ? `/tarot?character=${cid}&step=spread` : "/tarot");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]); // NOSONAR — ref/store 접근은 stable

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

  return {
    // i18n / router
    locale, t, router,
    // 세션 store 파생 (렌더용)
    phase, character, currentMood, chatMessages, selectedCards, requiredCards, readingResult, isLoading, animationPhase,
    // 선택 상태
    shuffledDeck, selectedIndices, revealedPositions, pendingConfirm, confirmEachCard,
    // 핸들러
    toggleConfirmMode, handleCardSelect, handleConfirmCard, handleCancelLastCard, handleBackToSpread,
    // 리딩 상태
    readingError, readingErrorReason, isConnecting, elapsedSec, startReading, setReadingError,
    // 파생 / refs
    spread, showCardLabel, particleDensity, effectTheme, activeTheme, resultContainerRef,
  };
}
