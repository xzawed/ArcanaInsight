"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { useShinjeomSessionStore } from "@/hooks/useShinjeomSession";
import { CharacterDisplay } from "@/components/character/CharacterDisplay";
import { ParticleOverlay } from "@/components/effects/ParticleOverlay";
import { ReadingText } from "@/components/common/ReadingText";
import { getCharacterById } from "@/data/characters";
import { useCharacterStore } from "@/hooks/useCharacter";
import { MAX_TURNS } from "@/services/shinjeom/shinjeom-service";

export default function ShinjeomSessionPage() {
  const router = useRouter();
  const {
    phase, topic, characterId, chatMessages, turnCount, readingResult, isLoading,
    addChatMessage, incrementTurn, setReadingResult, setLoading, setPhase, setSessionId, reset,
  } = useShinjeomSessionStore();
  const { setMood } = useCharacterStore();

  const character = characterId ? getCharacterById(characterId) : null;
  const [inputText, setInputText] = useState("");
  const [sessionCreated, setSessionCreated] = useState(false);

  // 세션 생성
  useEffect(() => {
    if (!topic || !character) { router.push("/shinjeom"); return; }
    if (sessionCreated) return;
    setSessionCreated(true);

    const initSession = async () => {
      try {
        const res = await fetch("/api/shinjeom/session", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ topic, characterId }),
        });
        const data = await res.json();
        if (data.session?.id) setSessionId(data.session.id);
      } catch { /* 계속 진행 */ }
    };
    initSession();

    setMood("default");
    addChatMessage({
      id: crypto.randomUUID(), role: "character",
      content: character.greeting + "\n\n어떤 고민이 있으신가요? 편하게 말씀해 주세요.",
      mood: "default", timestamp: new Date(),
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topic]);

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

  const handleSend = async () => {
    const message = inputText.trim();
    if (!message || isLoading) return;

    const newTurn = turnCount + 1;
    setInputText("");
    setLoading(true);
    setMood("mystical");

    // 사용자 메시지 추가
    addChatMessage({
      id: crypto.randomUUID(), role: "user",
      content: message, timestamp: new Date(),
    });
    incrementTurn();

    try {
      const response = await fetch("/api/shinjeom/message", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: useShinjeomSessionStore.getState().sessionId,
          topic, characterId,
          currentMessage: message,
          chatHistory: useShinjeomSessionStore.getState().chatMessages,
          turnNumber: newTurn,
        }),
      });

      if (!response.ok || !response.body) {
        addChatMessage({
          id: crypto.randomUUID(), role: "character",
          content: "죄송해요, 연결에 문제가 있어요. 다시 시도해주세요.",
          mood: "default", timestamp: new Date(),
        });
        setMood("default");
        setLoading(false);
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let sseBuffer = "";
      let fullText = "";

      // 스트리밍 메시지를 위한 임시 ID
      const msgId = crypto.randomUUID();
      addChatMessage({
        id: msgId, role: "character",
        content: "", mood: "mystical", timestamp: new Date(),
      });

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        sseBuffer += decoder.decode(value, { stream: true });
        const lines = sseBuffer.split("\n");
        sseBuffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.error) {
              useShinjeomSessionStore.setState((state) => ({
                chatMessages: state.chatMessages.map((m) =>
                  m.id === msgId ? { ...m, content: "문제가 발생했어요. 다시 시도해주세요." } : m
                ),
              }));
              break;
            }
            if (data.chunk) {
              fullText += data.chunk;
              useShinjeomSessionStore.setState((state) => ({
                chatMessages: state.chatMessages.map((m) =>
                  m.id === msgId ? { ...m, content: fullText } : m
                ),
              }));
            }
            if (data.done) {
              if (data.isFinal && data.result) {
                setReadingResult(data.result);
                setPhase("result");
                setMood("smile");
              }
            }
          } catch { /* 파싱 실패 */ }
        }
      }
    } catch {
      addChatMessage({
        id: crypto.randomUUID(), role: "character",
        content: "네트워크 문제가 발생했어요. 다시 시도해주세요.",
        mood: "default", timestamp: new Date(),
      });
      setMood("default");
    }
    setLoading(false);
  };

  if (!character) return null;

  return (
    <div className="relative h-[calc(100dvh-7rem)] md:h-[calc(100dvh-3.5rem)] flex flex-col overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <Image src="/images/backgrounds/session-bg.jpg" alt="" fill className="object-cover" priority />
        <div className="absolute inset-0 bg-arcana-bg/50" />
      </div>
      <ParticleOverlay density="low" className="z-10" />

      <div className="relative flex-1 min-h-0 flex flex-col md:flex-row z-20">
        {/* 캐릭터 */}
        <div className="w-full h-[25%] md:h-auto md:w-[50%] md:flex-shrink-0 flex flex-col">
          {character && (
            <div className="flex-1 relative overflow-hidden">
              <CharacterDisplay character={character} mood={useCharacterStore.getState().currentMood} className="w-full h-full" />
            </div>
          )}
        </div>

        {/* 대화 영역 */}
        <div className="flex-1 md:w-[50%] flex flex-col px-3 md:px-4 overflow-hidden">

          {phase === "result" && readingResult ? (
            /* 최종 결과 */
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex-1 overflow-y-auto py-4 space-y-4">
              <div className="bg-arcana-purple/10 border border-arcana-purple/30 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">🔮</span>
                  <span className="text-arcana-purple font-serif font-bold">종합 신점</span>
                </div>
                <ReadingText text={readingResult.overallReading} />
              </div>

              {readingResult.topicReading && (
                <div className="bg-arcana-gold/5 border border-arcana-gold/30 rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-lg">🔍</span>
                    <span className="text-arcana-gold font-serif font-bold">상세 해석</span>
                  </div>
                  <ReadingText text={readingResult.topicReading} />
                </div>
              )}

              {readingResult.advice && (
                <div className="bg-arcana-card/70 border border-arcana-border rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-lg">✨</span>
                    <span className="text-arcana-gold font-serif font-bold">조언</span>
                  </div>
                  <ReadingText text={readingResult.advice} />
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => { reset(); router.push("/shinjeom"); }}
                  className="flex-1 py-2.5 rounded-full border border-arcana-purple text-arcana-purple font-serif font-bold text-sm"
                >
                  새로운 상담
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
                      <span className="text-arcana-muted text-sm animate-pulse">답변을 준비하고 있어요...</span>
                    </div>
                  </div>
                )}
              </div>

              {/* 입력 */}
              {turnCount < MAX_TURNS && (
                <div className="flex-shrink-0 py-3">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter" && !e.nativeEvent.isComposing) handleSend(); }}
                      placeholder={turnCount === 0 ? "고민을 말씀해주세요..." : "답변을 입력하세요..."}
                      disabled={isLoading}
                      className="flex-1 px-4 py-2.5 rounded-full bg-arcana-card/70 border border-arcana-border text-arcana-text text-sm placeholder:text-arcana-muted/50 focus:outline-none focus:border-arcana-purple transition-colors"
                    />
                    <button
                      onClick={handleSend}
                      disabled={!inputText.trim() || isLoading}
                      className="px-5 py-2.5 rounded-full bg-gradient-to-r from-arcana-purple to-arcana-indigo text-white font-serif font-bold text-sm disabled:opacity-40 transition-opacity"
                    >
                      전송
                    </button>
                  </div>
                  <p className="text-arcana-muted text-[10px] text-center mt-1.5">
                    {turnCount}/{MAX_TURNS}회 대화 · {MAX_TURNS - turnCount}회 남음
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
