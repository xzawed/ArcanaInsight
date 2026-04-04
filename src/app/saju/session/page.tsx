"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion } from "framer-motion";
import { useSajuSessionStore } from "@/hooks/useSajuSession";
import { useCharacterStore } from "@/hooks/useCharacter";
import { CharacterDisplay } from "@/components/character/CharacterDisplay";
import { DialogueBox } from "@/components/chat/DialogueBox";
import { ParticleOverlay } from "@/components/effects/ParticleOverlay";
import { SajuChart } from "@/components/saju/SajuChart";
import { OhaengGraph } from "@/components/saju/OhaengGraph";
import { DaeunTimeline } from "@/components/saju/DaeunTimeline";
import { getCharacterById } from "@/data/characters";
import { sajuWaitingLines } from "@/data/characters/waiting-lines";

export default function SajuSessionPage() {
  const router = useRouter();
  const { currentMood, setMood } = useCharacterStore();
  const {
    phase, topic, characterId, userInfo, timeRange, chatMessages, readingResult, sajuData,
    setPhase, setSessionId, addChatMessage, setReadingResult, setSajuData, setLoading,
  } = useSajuSessionStore();

  const character = characterId ? getCharacterById(characterId) : null;
  const [readingError, setReadingError] = useState(false);
  const resultBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!topic || !character || !userInfo || !timeRange) { router.push("/saju"); return; }

    // 세션 생성
    fetch("/api/saju/session", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic, characterId }),
    }).then(async (res) => {
      if (!res.ok) return;
      const data = await res.json();
      if (data.session?.id) setSessionId(data.session.id);
    }).catch(() => {});

    setMood("mystical");
    const namePrefix = userInfo.name ? `${userInfo.name}님의` : "";
    const initMsg = characterId === "miko"
      ? `${namePrefix} 사주팔자를 읽어보겠습니다. 조용히 기다려주십시오.`
      : `${namePrefix} 사주를 살펴보고 있어요~ 잠시만 기다려주세요.`;
    addChatMessage({ id: crypto.randomUUID(), role: "character",
      content: initMsg, mood: "mystical", timestamp: new Date(),
    });

    startReading();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        setMood(line.mood);
        addChatMessage({ id: crypto.randomUUID(), role: "character", content: line.content, mood: line.mood, timestamp: new Date() });
      }, (i + 1) * 3000));
    });
    const stopTimers = () => timers.forEach(clearTimeout);

    try {
      const response = await fetch("/api/saju/reading", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: state.sessionId, topic: state.topic,
          timeRange: state.timeRange, includeMonthly: state.includeMonthly,
          characterId: state.characterId, userInfo: state.userInfo,
        }),
      });

      if (!response.ok || !response.body) {
        stopTimers();
        addChatMessage({ id: crypto.randomUUID(), role: "character",
          content: "서버에 문제가 있어요. 잠시 후 다시 시도해주세요.", mood: "surprised", timestamp: new Date() });
        setMood("surprised"); setReadingError(true); setLoading(false);
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let sseBuffer = "";
      let streamDone = false;

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        sseBuffer += decoder.decode(value, { stream: true });
        const sseLines = sseBuffer.split("\n");
        sseBuffer = sseLines.pop() || "";
        for (const line of sseLines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.error) {
              stopTimers();
              addChatMessage({ id: crypto.randomUUID(), role: "character",
                content: "사주 해석 중 문제가 발생했어요. 다시 시도해주세요.", mood: "surprised", timestamp: new Date() });
              setMood("surprised"); setReadingError(true); setLoading(false);
              streamDone = true; break;
            }
            if (data.done && data.result) {
              stopTimers();
              setReadingResult(data.result);
              if (data.sajuData) setSajuData(data.sajuData);
              setPhase("result"); setMood("smile");
              const doneMsg = state.characterId === "miko"
                ? "사주팔자의 해석이 완료되었습니다. 결과를 확인해주십시오."
                : "사주 분석이 완료되었어요! 결과를 확인해보세요~";
              addChatMessage({ id: crypto.randomUUID(), role: "character",
                content: doneMsg, mood: "smile", timestamp: new Date() });
              streamDone = true; break;
            }
          } catch (e) { console.warn("SSE 파싱 실패:", e); }
        }
      }
    } catch (e) {
      console.error("사주 리딩 요청 실패:", e);
      stopTimers();
      addChatMessage({ id: crypto.randomUUID(), role: "character",
        content: "네트워크 문제가 발생했어요. 다시 시도해주세요.", mood: "surprised", timestamp: new Date() });
      setMood("surprised"); setReadingError(true);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (phase === "result") resultBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, phase]);

  const birthYear = userInfo ? parseInt(userInfo.birthDate.split("-")[0]) : 2000;

  return (
    <div className="relative h-[calc(100dvh-7rem)] md:h-[calc(100dvh-3.5rem)] flex flex-col overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <Image src="/images/backgrounds/session-bg.jpg" alt="" fill className="object-cover" priority />
        <div className="absolute inset-0 bg-arcana-bg/50" />
      </div>
      <ParticleOverlay density={phase === "reading" ? "high" : "low"} className="z-10" />

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
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="w-full flex-1 flex flex-col overflow-hidden py-4">
              <div className="space-y-4 md:space-y-5 flex-1 overflow-y-auto pr-2">
                <SajuChart pillars={sajuData.pillars} dayMaster={sajuData.dayMaster}
                  dayMasterElement={sajuData.dayMasterElement} isStrong={sajuData.isStrong} yongsin={sajuData.yongsin} />
                <OhaengGraph elements={sajuData.elements} yongsinElement={sajuData.yongsin.element} />

                {readingResult.overallReading && (
                  <div className="bg-arcana-purple/10 backdrop-blur-sm border border-arcana-purple/30 rounded-2xl p-4 md:p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-lg">☯</span>
                      <span className="text-arcana-purple font-serif font-bold text-base md:text-lg">종합 해석</span>
                    </div>
                    <p className="text-arcana-text reading-text">{readingResult.overallReading}</p>
                  </div>
                )}

                {readingResult.topicReading && (
                  <div className="bg-arcana-card/70 backdrop-blur-sm border border-arcana-border rounded-2xl p-4 md:p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-lg">🔍</span>
                      <span className="text-arcana-gold font-serif font-bold text-base md:text-lg">주제별 해석</span>
                    </div>
                    <p className="text-arcana-text reading-text">{readingResult.topicReading}</p>
                  </div>
                )}

                <DaeunTimeline majorFortunes={sajuData.majorFortunes} yearlyFortune={sajuData.yearlyFortune} birthYear={birthYear} />

                {readingResult.advice && (
                  <div className="bg-arcana-gold/5 backdrop-blur-sm border border-arcana-gold/30 rounded-2xl p-4 md:p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-lg">✨</span>
                      <span className="text-arcana-gold font-serif font-bold text-base md:text-lg">조언</span>
                    </div>
                    <p className="text-arcana-text reading-text">{readingResult.advice}</p>
                  </div>
                )}
                <div ref={resultBottomRef} />
              </div>

              <div className="flex gap-3 pt-5 flex-shrink-0">
                <button onClick={() => { useSajuSessionStore.getState().reset(); router.push("/saju"); }}
                  className="flex-1 px-6 py-2.5 rounded-full border border-arcana-purple text-arcana-purple font-serif font-bold text-sm hover:bg-arcana-purple/10 transition-colors">
                  새로운 상담
                </button>
                <button onClick={async () => {
                  const r = useSajuSessionStore.getState().readingResult;
                  const shareToken = r?.shareToken;
                  const siteName = "ArcanaInsight";

                  if (shareToken) {
                    const url = `${window.location.origin}/saju/result/${shareToken}`;
                    const text = `☯ 사주 분석 결과를 확인해보세요!\n\n- ${siteName}`;
                    if (navigator.share) {
                      try { await navigator.share({ title: `사주 분석 결과 - ${siteName}`, text, url }); } catch { /* 취소 */ }
                    } else {
                      try {
                        await navigator.clipboard.writeText(`${text}\n${url}`);
                        alert("링크가 복사되었습니다!");
                      } catch { /* 실패 */ }
                    }
                  } else {
                    const summary = r?.overallReading
                      ? `☯ 사주 분석 결과\n\n${r.overallReading.slice(0, 100)}...\n\n- ${siteName}`
                      : `☯ 사주 분석을 받아보세요!\n\n- ${siteName}`;
                    if (navigator.share) {
                      try { await navigator.share({ title: `사주 분석 결과 - ${siteName}`, text: summary }); } catch { /* 취소 */ }
                    } else {
                      try {
                        await navigator.clipboard.writeText(summary);
                        alert("결과가 복사되었습니다!");
                      } catch { /* 실패 */ }
                    }
                  }
                }}
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
                  <p className="text-arcana-muted text-xs font-serif">사주를 분석하고 있어요...</p>
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
