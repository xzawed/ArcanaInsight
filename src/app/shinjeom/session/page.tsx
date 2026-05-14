"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { useShinjeomSessionStore } from "@/hooks/useShinjeomSession";
import { CharacterDisplay } from "@/components/character/CharacterDisplay";
import { ParticleOverlay } from "@/components/effects/ParticleOverlay";
import { MysticBackground, ThemeAtmosphere } from "@/components/effects/MysticBackground";
import { ReadingText } from "@/components/common/ReadingText";
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
import { getServiceBackgroundUrl } from "@/lib/storage/card-style";
import { ShinjeomEnergyEffect } from "@/components/shinjeom/ShinjeomEnergyEffect";

function getErrorMsg(charId: string | null | undefined, type: "api" | "reading"): string {
  const wl = getWaitingLinesData(useLocaleStore.getState().locale);
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


export default function ShinjeomSessionPage() {
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
        if (data.session?.id) setSessionId(data.session.id);
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
      updateMessageContent(msgId, getErrorMsg(characterId, "api"));
      setMood("default");
      setLoading(false);
    }, 240_000);

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
        updateMessageContent(msgId, getErrorMsg(characterId, "reading"));
        setMood("default");
        setLoading(false);
      },
    }).then(() => {
      if (!finished) clearTimeout(timeoutId);
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
      updateMessageContent(msgId, getErrorMsg(characterId, "reading"));
      setMood("default");
      setLoading(false);
    }, 240_000);

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
          updateMessageContent(msgId, getErrorMsg(characterId, "reading"));
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
          updateMessageContent(msgId, getErrorMsg(characterId, "reading"));
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
        updateMessageContent(msgId, getErrorMsg(characterId, "reading"));
        setMood("default");
        setLoading(false);
      },
    }).then(() => {
      if (!finished) clearTimeout(timeoutId);
    });
  };

  const { activeTheme } = useThemeStore();
  if (!character) return null;

  return (
    <div className="relative h-[calc(100dvh-7rem)] md:h-[calc(100dvh-3.5rem)] flex flex-col overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <Image src={getServiceBackgroundUrl('shinjeom', activeTheme)} alt="" fill className="object-cover" priority sizes="100vw" unoptimized />
        <div className="absolute inset-0 bg-arcana-bg/50" />
      </div>
      <ParticleOverlay density="low" className="z-10" />
      <MysticBackground service="shinjeom" />
      <ThemeAtmosphere theme={activeTheme} intensity="ambient" className="z-[6] mix-blend-screen" testId="session-theme-atmosphere-shinjeom" />
      {showEnergyEffect && (
        <ShinjeomEnergyEffect onComplete={() => setShowEnergyEffect(false)} />
      )}

      <div className="relative flex-1 min-h-0 flex flex-col md:flex-row z-20">
        {/* 캐릭터 */}
        <div className="w-full h-[25%] md:h-auto md:w-[50%] md:flex-shrink-0 flex flex-col">
          {character && (
            <div className="flex-1 relative overflow-hidden">
              <CharacterDisplay character={character} mood={currentMood} className="w-full h-full" />
            </div>
          )}
        </div>

        {/* 대화 영역 */}
        <div className="flex-1 md:w-[50%] flex flex-col px-3 md:px-4 overflow-hidden">

          {phase === "result" && readingResult ? (
            /* 최종 결과 */
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }} className="flex-1 overflow-y-auto py-4 space-y-4">
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
                className="bg-arcana-purple/10 border border-arcana-purple/30 rounded-2xl p-4"
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">🔮</span>
                  <span className="text-arcana-purple font-serif font-bold">{t("shinjeom.result.overall")}</span>
                </div>
                <ReadingText text={readingResult.overallReading} />
              </motion.div>

              {readingResult.topicReading && (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.35, ease: "easeOut" }}
                  className="bg-arcana-gold/5 border border-arcana-gold/30 rounded-2xl p-4"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-lg">🔍</span>
                    <span className="text-arcana-gold font-serif font-bold">{t("shinjeom.result.topic")}</span>
                  </div>
                  <ReadingText text={readingResult.topicReading} />
                </motion.div>
              )}

              {readingResult.advice && (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.6, ease: "easeOut" }}
                  className="bg-arcana-card/70 border border-arcana-border rounded-2xl p-4"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-lg">✨</span>
                    <span className="text-arcana-gold font-serif font-bold">{t("shinjeom.result.advice")}</span>
                  </div>
                  <ReadingText text={readingResult.advice} />
                </motion.div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => { reset(); router.push("/shinjeom"); }}
                  className="flex-1 py-2.5 rounded-full border border-arcana-purple text-arcana-purple font-serif font-bold text-sm"
                >
                  {t("tarot.session.btn.new-session")}
                </button>
              </div>
            </motion.div>
          ) : (
            /* 대화 */
            <>
              <div ref={chatContainerRef} className="flex-1 overflow-y-auto py-3 space-y-3">
                <AnimatePresence>
                  {chatMessages.map((msg) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                        msg.role === "user"
                          ? "bg-arcana-purple/20 border border-arcana-purple/30"
                          : "bg-arcana-card/70 border border-arcana-border"
                      }`}>
                        {msg.role === "character" && (
                          <span className="text-arcana-purple text-[10px] font-serif font-bold block mb-1">{character.name}</span>
                        )}
                        <p className="text-arcana-text text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-arcana-card/70 border border-arcana-border rounded-2xl px-4 py-3">
                      <span className="text-arcana-muted text-sm animate-pulse">{getWaitingLinesData(locale).loadingText[characterId ?? ""] ?? getWaitingLinesData(locale).defaultLoadingText}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* 입력 */}
              <div className="flex-shrink-0 py-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.nativeEvent.isComposing) handleSend(); }}
                    placeholder={turnCount === 0 ? t("shinjeom.session.input.placeholder.first") : t("shinjeom.session.input.placeholder.followup")}
                    disabled={isLoading}
                    className="flex-1 px-4 py-2.5 rounded-full bg-arcana-card/70 border border-arcana-border text-arcana-text text-sm placeholder:text-arcana-muted/50 focus:outline-none focus:border-arcana-purple transition-colors"
                  />
                  <button
                    onClick={handleSend}
                    disabled={!inputText.trim() || isLoading}
                    className="px-5 py-2.5 rounded-full bg-gradient-to-r from-arcana-purple to-arcana-indigo text-white font-serif font-bold text-sm disabled:opacity-40 transition-opacity"
                  >
                    {t("shinjeom.session.btn.send")}
                  </button>
                </div>
                {turnCount >= 1 && (
                  <button
                    data-testid="shinjeom-get-result-btn"
                    onClick={handleEndConsultation}
                    disabled={isLoading}
                    className="w-full mt-2 py-2.5 rounded-full border border-arcana-gold/60 text-arcana-gold font-serif font-bold text-sm disabled:opacity-40 transition-opacity hover:bg-arcana-gold/10"
                  >
                    {t("shinjeom.session.btn.get-result")}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
