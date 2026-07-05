"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useShinjeomSessionStore } from "@/hooks/useShinjeomSession";
import { getCharacterById } from "@/data/characters";
import { useCharacterStore } from "@/hooks/useCharacter";
import { CHARACTER_RESULT_MOODS } from "@/data/characters/waiting-lines";
import { getWaitingLinesData } from "@/data/characters/waiting-lines-i18n";
import { getCharacterGreeting } from "@/data/characters/locale-helpers";
import { useLocaleStore } from "@/hooks/useLocaleStore";
import { useT } from "@/i18n/useT";
import { t as translate } from "@/i18n/translations";
import { fetchSSEStream } from "@/hooks/useSSEStream";
import { useThemeStore } from "@/hooks/useTheme";
import { rememberGuestSession } from "@/lib/guest-sessions";

function getErrorMsg(charId: string | null | undefined, type: "api" | "reading", locale: string): string {
  const wl = getWaitingLinesData(locale);
  const lines = (charId && wl.characterErrorLines[charId]) || wl.defaultErrorLines;
  return lines[type];
}

function updateMessageContent(msgId: string, content: string) {
  useShinjeomSessionStore.setState((state) => ({
    chatMessages: state.chatMessages.map((m) =>
      m.id === msgId ? { ...m, content } : m
    ),
  }));
}

function removeMessage(msgId: string) {
  useShinjeomSessionStore.setState((state) => ({
    chatMessages: state.chatMessages.filter((m) => m.id !== msgId),
  }));
}

/**
 * 신점 세션 페이지의 대화·최종리딩 진행 로직을 캡슐화한 컨트롤러 훅.
 * (이전에는 page.tsx 인라인이었으나 view/controller 분리를 위해 추출 — 동작은 verbatim 유지.)
 */
export function useShinjeomChat() {
  const router = useRouter();
  const locale = useLocaleStore((s) => s.locale);
  const { t } = useT();
  const {
    phase, topic, characterId, chatMessages, turnCount, readingResult, isLoading,
    addChatMessage, incrementTurn, setReadingResult, setLoading, setPhase, setSessionId, reset,
  } = useShinjeomSessionStore();
  const { setMood, currentMood } = useCharacterStore();

  const character = characterId ? getCharacterById(characterId) : null;
  const [inputText, setInputText] = useState("");
  const [sessionCreated, setSessionCreated] = useState(false);
  const [showEnergyEffect, setShowEnergyEffect] = useState(true);
  const redirectedRef = useRef(false);
  const readingAbortRef = useRef<AbortController | null>(null);

  // 세션 생성
  useEffect(() => {
    if (!topic || !character) {
      if (!redirectedRef.current) { redirectedRef.current = true; router.push("/shinjeom"); }
      return;
    }
    if (sessionCreated) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSessionCreated(true);

    const initSession = async () => {
      try {
        const res = await fetch("/api/shinjeom/session", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ topic, characterId }),
        });
        const data = await res.json();
        if (data.session?.id) { setSessionId(data.session.id); rememberGuestSession(data.session.id); }
      } catch (e) { console.warn("신점 세션 생성 실패 (상담은 계속 진행):", e); }
    };
    initSession();

    setMood("default");
    addChatMessage({
      id: crypto.randomUUID(), role: "character",
      content: getCharacterGreeting(character, useLocaleStore.getState().locale) + "\n\n" + getWaitingLinesData(useLocaleStore.getState().locale).shinjeomInitialPrompt,
      mood: "default", timestamp: new Date(),
    });
  }, [topic, characterId, character, router, sessionCreated, setSessionId, setMood, addChatMessage]);

  // 새 메시지 추가 시에만 컨테이너 내부 스크롤 (윈도우 스크롤 방지)
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const messageCountRef = useRef(0);
  useEffect(() => {
    if (chatMessages.length !== messageCountRef.current) {
      messageCountRef.current = chatMessages.length;
      const container = chatContainerRef.current;
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    }
  }, [chatMessages.length]);

  useEffect(() => {
    return () => { readingAbortRef.current?.abort(); };
  }, []);

  const handleSend = () => {
    const message = inputText.trim();
    if (!message || isLoading) return;

    setInputText("");
    setLoading(true);
    setMood("mystical");

    const messageIndex = useShinjeomSessionStore.getState().chatMessages.length;
    addChatMessage({ id: crypto.randomUUID(), role: "user", content: message, timestamp: new Date() });
    incrementTurn();

    const msgId = crypto.randomUUID();
    addChatMessage({ id: msgId, role: "character", content: "", mood: "mystical", timestamp: new Date() });

    const abortController = new AbortController();
    readingAbortRef.current?.abort();
    readingAbortRef.current = abortController;
    let finished = false;

    const timeoutId = setTimeout(() => {
      if (finished) return;
      finished = true;
      abortController.abort();
      updateMessageContent(msgId, getErrorMsg(characterId, "api", locale));
      setMood("default");
      setLoading(false);
    }, 280_000);

    void fetchSSEStream({
      url: "/api/shinjeom/message",
      signal: abortController.signal,
      body: {
        sessionId: useShinjeomSessionStore.getState().sessionId,
        topic, characterId,
        userInfo: useShinjeomSessionStore.getState().userInfo,
        currentMessage: message,
        chatHistory: useShinjeomSessionStore.getState().chatMessages,
        isFinalTurn: false,
        messageIndex,
      },
      onChunk: (_chunk, fullText) => {
        updateMessageContent(msgId, fullText);
      },
      onDone: () => {
        if (finished) return;
        finished = true;
        clearTimeout(timeoutId);
        setLoading(false);
      },
      onError: () => {
        if (finished) return;
        finished = true;
        clearTimeout(timeoutId);
        updateMessageContent(msgId, getErrorMsg(characterId, "reading", locale));
        setMood("default");
        setLoading(false);
      },
    }).then(() => {
      // 스트림이 종단 이벤트(done/error) 없이 종료된 경우 → 무한 스피너 방지, 명시적 에러로 전환
      if (finished) return;
      finished = true;
      clearTimeout(timeoutId);
      updateMessageContent(msgId, getErrorMsg(characterId, "reading", locale));
      setMood("default");
      setLoading(false);
    });
  };

  const handleEndConsultation = () => {
    if (turnCount < 1 || isLoading) return;

    setLoading(true);
    setMood("mystical");

    const currentChatMessages = useShinjeomSessionStore.getState().chatMessages;
    const msgId = crypto.randomUUID();
    addChatMessage({
      id: msgId, role: "character",
      content: translate("shinjeom.session.msg.preparing-result", locale),
      mood: "mystical", timestamp: new Date(),
    });

    const abortController = new AbortController();
    readingAbortRef.current?.abort();
    readingAbortRef.current = abortController;
    let finished = false;

    const timeoutId = setTimeout(() => {
      if (finished) return;
      finished = true;
      abortController.abort();
      updateMessageContent(msgId, getErrorMsg(characterId, "reading", locale));
      setMood("default");
      setLoading(false);
    }, 280_000);

    void fetchSSEStream({
      url: "/api/shinjeom/message",
      signal: abortController.signal,
      body: {
        sessionId: useShinjeomSessionStore.getState().sessionId,
        topic, characterId,
        userInfo: useShinjeomSessionStore.getState().userInfo,
        currentMessage: undefined,
        chatHistory: currentChatMessages,
        isFinalTurn: true,
        messageIndex: currentChatMessages.length,
      },
      onChunk: () => { /* 신점 최종 결과는 done 이벤트로 수신 */ },
      onDone: (data) => {
        if (finished) return;
        finished = true;
        clearTimeout(timeoutId);
        const result = data.result as { parseError?: string } | undefined;
        if (!result) {
          updateMessageContent(msgId, getErrorMsg(characterId, "reading", locale));
          setMood("default");
          setLoading(false);
          return;
        }
        // fallback_text — overallReading에 정제된 본문이 있으므로 결과 표시
        if (
          result.parseError === "invalid_json" ||
          result.parseError === "missing_fields"
        ) {
          console.warn("[shinjeom-session] 결과 표시 불가:", { parseError: result.parseError });
          updateMessageContent(msgId, getErrorMsg(characterId, "reading", locale));
          setMood("default");
          setLoading(false);
          return;
        }
        removeMessage(msgId);
        setReadingResult(data.result as Parameters<typeof setReadingResult>[0]);
        setPhase("result");
        setMood(CHARACTER_RESULT_MOODS[characterId ?? ""] ?? "smile");
        setLoading(false);
      },
      onError: () => {
        if (finished) return;
        finished = true;
        clearTimeout(timeoutId);
        updateMessageContent(msgId, getErrorMsg(characterId, "reading", locale));
        setMood("default");
        setLoading(false);
      },
    }).then(() => {
      // 스트림이 종단 이벤트(done/error) 없이 종료된 경우 → 무한 스피너 방지, 명시적 에러로 전환
      if (finished) return;
      finished = true;
      clearTimeout(timeoutId);
      updateMessageContent(msgId, getErrorMsg(characterId, "reading", locale));
      setMood("default");
      setLoading(false);
    });
  };

  const { activeTheme } = useThemeStore();

  return {
    locale, t, router,
    phase, character, characterId, currentMood, chatMessages, turnCount, readingResult, isLoading, reset,
    inputText, setInputText, showEnergyEffect, setShowEnergyEffect,
    handleSend, handleEndConsultation, chatContainerRef, activeTheme,
  };
}
