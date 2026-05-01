"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ReadingText } from "@/components/common/ReadingText";
import { fetchSSEStream } from "@/hooks/useSSEStream";
import { ERROR_MESSAGES } from "@/data/error-messages";
import { ReadingResult } from "@/types/service";
import { SajuResult } from "@/services/saju/saju-types";
import { motion } from "framer-motion";
import { useSajuSessionStore } from "@/hooks/useSajuSession";
import { useCharacterStore } from "@/hooks/useCharacter";
import { CharacterDisplay } from "@/components/character/CharacterDisplay";
import { DialogueBox } from "@/components/chat/DialogueBox";
import { ParticleOverlay } from "@/components/effects/ParticleOverlay";
import { MysticBackground } from "@/components/effects/MysticBackground";
import { SajuChart } from "@/components/saju/SajuChart";
import { OhaengGraph } from "@/components/saju/OhaengGraph";
import { DaeunTimeline } from "@/components/saju/DaeunTimeline";
import { getCharacterById } from "@/data/characters";
import { sajuWaitingLines, sajuAnalyzingText, defaultSajuAnalyzingText } from "@/data/characters/waiting-lines";

const SITE_NAME = "ArcanaInsight";

async function shareWithUrl(title: string, text: string, url: string): Promise<void> {
  if (navigator.share) {
    try { await navigator.share({ title, text, url }); } catch { /* 사용자가 공유를 취소함 */ } // NOSONAR
  } else {
    try {
      await navigator.clipboard.writeText(`${text}\n${url}`);
      alert("링크가 복사되었습니다!");
    } catch (e) { console.warn("클립보드 복사 실패:", e); }
  }
}

async function shareWithText(title: string, text: string): Promise<void> {
  if (navigator.share) {
    try { await navigator.share({ title, text }); } catch { /* 사용자가 공유를 취소함 */ } // NOSONAR
  } else {
    try {
      await navigator.clipboard.writeText(text);
      alert("결과가 복사되었습니다!");
    } catch (e) { console.warn("클립보드 복사 실패:", e); }
  }
}

async function handleSajuShare(r: { shareToken?: string | null; overallReading?: string | null } | null): Promise<void> {
  const shareToken = r?.shareToken;
  const title = `사주 분석 결과 - ${SITE_NAME}`;
  if (shareToken) {
    const url = `${globalThis.location.origin}/saju/result/${shareToken}`;
    const text = `☯ 사주 분석 결과를 확인해보세요!\n\n- ${SITE_NAME}`;
    await shareWithUrl(title, text, url);
  } else {
    const summary = r?.overallReading
      ? `☯ 사주 분석 결과\n\n${r.overallReading.slice(0, 100)}...\n\n- ${SITE_NAME}`
      : `☯ 사주 분석을 받아보세요!\n\n- ${SITE_NAME}`;
    await shareWithText(title, summary);
  }
}

export default function SajuSessionPage() {
  const router = useRouter();
  const { currentMood, setMood } = useCharacterStore();
  const {
    phase, topic, characterId, userInfo, timeRange, chatMessages, readingResult, sajuData,
    setPhase, setSessionId, addChatMessage, setReadingResult, setSajuData, setLoading,
  } = useSajuSessionStore();

  const character = characterId ? getCharacterById(characterId) : null;
  const [readingError, setReadingError] = useState(false);
  const resultContainerRef = useRef<HTMLDivElement>(null);
  const redirectedRef = useRef(false);

  useEffect(() => {
    if (!topic || !character || !userInfo || !timeRange) {
      if (!redirectedRef.current) { redirectedRef.current = true; router.push("/saju"); }
      return;
    }

    // 세션 생성
    fetch("/api/saju/session", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic, characterId }),
    }).then(async (res) => {
      if (!res.ok) return;
      const data = await res.json();
      if (data.session?.id) setSessionId(data.session.id);
    }).catch((e) => console.warn("사주 세션 생성 실패 (리딩은 계속 진행):", e));

    setMood("default");
    const namePrefix = userInfo.name ? `${userInfo.name}님의` : "";
    const initMsg = characterId === "miko"
      ? `${namePrefix} 사주팔자를 읽어보겠습니다. 조용히 기다려주십시오.`
      : `${namePrefix} 사주를 살펴보고 있어요~ 잠시만 기다려주세요.`;
    addChatMessage({ id: crypto.randomUUID(), role: "character",
      content: initMsg, mood: "default", timestamp: new Date(),
    });

    startReading();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // NOSONAR

  const startReading = async () => {
    setLoading(true);
    setReadingError(false);
    const state = useSajuSessionStore.getState();

    // 대기 대사
    const charId = state.characterId || "seonhwa";
    const lines = sajuWaitingLines[charId] || sajuWaitingLines["seonhwa"];
    const timers: ReturnType<typeof setTimeout>[] = [];
    lines.forEach((line, i) => {
      timers.push(setTimeout(() => {
        setMood("mystical");
        addChatMessage({ id: crypto.randomUUID(), role: "character", content: line.content, mood: "mystical", timestamp: new Date() });
      }, (i + 1) * 3000));
    });
    const stopTimers = () => timers.forEach(clearTimeout);

    await fetchSSEStream({
      url: "/api/saju/reading",
      body: {
        sessionId: state.sessionId, topic: state.topic,
        timeRange: state.timeRange, includeMonthly: state.includeMonthly,
        characterId: state.characterId, userInfo: state.userInfo,
      },
      onChunk: () => { /* 사주는 스트리밍 표시 불필요 — 대기 연출 사용 */ },
      onDone: (data) => {
        stopTimers();
        if (data.result) {
          setReadingResult(data.result as ReadingResult);
          if (data.sajuData) setSajuData(data.sajuData as SajuResult);
          setPhase("result"); setMood("smile");
          const doneMsg = state.characterId === "miko"
            ? "사주팔자의 해석이 완료되었습니다. 결과를 확인해주십시오."
            : "사주 분석이 완료되었어요! 결과를 확인해보세요~";
          addChatMessage({ id: crypto.randomUUID(), role: "character",
            content: doneMsg, mood: "smile", timestamp: new Date() });
        }
      },
      onError: (msg) => {
        stopTimers();
        console.error("사주 리딩 실패:", msg);
        addChatMessage({ id: crypto.randomUUID(), role: "character",
          content: ERROR_MESSAGES.READING_FAIL, mood: "default", timestamp: new Date() });
        setMood("default"); setReadingError(true);
      },
    });
    setLoading(false);
  };

  useEffect(() => {
    // 결과 스트리밍 시 컨테이너 내부만 하단 스크롤 (윈도우 스크롤 방지)
    if (phase === "result") {
      const container = resultContainerRef.current;
      if (container) container.scrollTop = container.scrollHeight;
    }
  }, [chatMessages, phase]);

  const birthYear = userInfo ? parseInt(userInfo.birthDate.split("-")[0]) : 2000;

  return (
    <div className="relative h-[calc(100dvh-7rem)] md:h-[calc(100dvh-3.5rem)] flex flex-col overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <Image src="/images/backgrounds/session-bg.jpg" alt="" fill className="object-cover" priority  sizes="100vw" />
        <div className="absolute inset-0 bg-arcana-bg/50" />
      </div>
      <ParticleOverlay density={phase === "reading" ? "high" : "low"} className="z-10" />
      <MysticBackground service="saju" />

      <div className="relative flex-1 min-h-0 flex flex-col md:flex-row z-20">
        {/* 좌측 컬럼: 캐릭터 + 대사 */}
        <div className="w-full h-[25%] md:h-auto md:w-[50%] md:flex-shrink-0 flex flex-col transition-all duration-500">
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
              <DialogueBox messages={chatMessages} characterName={character?.name ?? ""} isTyping={false} />
            </div>
          )}
        </div>

        <div className="flex-1 md:w-[50%] flex flex-col px-2 md:px-4 overflow-hidden">
          {phase === "result" && readingResult && sajuData ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}
              className="w-full flex-1 flex flex-col overflow-hidden py-4">
              <div ref={resultContainerRef} className="space-y-4 md:space-y-5 flex-1 overflow-y-auto pr-2">
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}>
                  <SajuChart pillars={sajuData.pillars} dayMaster={sajuData.dayMaster}
                    dayMasterElement={sajuData.dayMasterElement} isStrong={sajuData.isStrong} yongsin={sajuData.yongsin} />
                </motion.div>
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.25, ease: "easeOut" }}>
                  <OhaengGraph elements={sajuData.elements} yongsinElement={sajuData.yongsin.element} />
                </motion.div>

                {readingResult.overallReading && (
                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.4, ease: "easeOut" }}
                    className="bg-arcana-purple/10 backdrop-blur-sm border border-arcana-purple/30 rounded-2xl p-4 md:p-5"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-lg">☯</span>
                      <span className="text-arcana-purple font-serif font-bold text-base md:text-lg">종합 해석</span>
                    </div>
                    <ReadingText text={readingResult.overallReading} />
                  </motion.div>
                )}

                {readingResult.topicReading && (
                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.55, ease: "easeOut" }}
                    className="bg-arcana-card/70 backdrop-blur-sm border border-arcana-border rounded-2xl p-4 md:p-5"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-lg">🔍</span>
                      <span className="text-arcana-gold font-serif font-bold text-base md:text-lg">주제별 해석</span>
                    </div>
                    <ReadingText text={readingResult.topicReading || ""} />
                  </motion.div>
                )}

                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.7, ease: "easeOut" }}>
                  <DaeunTimeline majorFortunes={sajuData.majorFortunes} yearlyFortune={sajuData.yearlyFortune} birthYear={birthYear} />
                </motion.div>

                {readingResult.advice && (
                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.85, ease: "easeOut" }}
                    className="bg-arcana-gold/5 backdrop-blur-sm border border-arcana-gold/30 rounded-2xl p-4 md:p-5"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-lg">✨</span>
                      <span className="text-arcana-gold font-serif font-bold text-base md:text-lg">조언</span>
                    </div>
                    <ReadingText text={readingResult.advice} />
                  </motion.div>
                )}
              </div>

              <div className="flex gap-3 pt-5 flex-shrink-0">
                <button onClick={() => { useSajuSessionStore.getState().reset(); router.push("/saju"); }}
                  className="flex-1 px-6 py-2.5 rounded-full border border-arcana-purple text-arcana-purple font-serif font-bold text-sm hover:bg-arcana-purple/10 transition-colors">
                  새로운 상담
                </button>
                <button onClick={() => handleSajuShare(useSajuSessionStore.getState().readingResult)}
                  className="flex-1 px-6 py-2.5 rounded-full bg-gradient-to-r from-arcana-purple to-arcana-indigo text-white font-serif font-bold text-sm hover:opacity-90 transition-opacity shadow-lg shadow-arcana-purple/20">
                  결과 공유하기
                </button>
              </div>
            </motion.div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              {readingError ? (
                <div className="flex flex-col items-center gap-3">
                  <p className="text-arcana-muted text-sm font-serif">해석에 문제가 발생했어요</p>
                  <div className="flex gap-3">
                    <button onClick={() => { setReadingError(false); startReading(); }}
                      className="px-6 py-2 rounded-full bg-gradient-to-r from-arcana-purple to-arcana-indigo text-white font-serif font-bold text-sm">
                      다시 시도
                    </button>
                    <button onClick={() => { useSajuSessionStore.getState().reset(); router.push("/saju"); }}
                      className="px-6 py-2 rounded-full border border-arcana-purple text-arcana-purple font-serif font-bold text-sm">
                      새로운 상담
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-10 h-10 border-2 border-arcana-purple/30 border-t-arcana-purple rounded-full animate-spin" />
                  <p className="text-arcana-muted text-xs font-serif">{sajuAnalyzingText[characterId ?? ""] ?? defaultSajuAnalyzingText}</p>
                </div>
              )}
            </div>
          )}

          {/* 대사창 — 모바일에서만 (데스크탑은 캐릭터 하단에 표시) */}
          {phase !== "result" && (
            <div className="md:hidden flex-shrink-0 z-30">
              <DialogueBox messages={chatMessages} characterName={character?.name ?? ""} isTyping={false} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
