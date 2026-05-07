"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ReadingText } from "@/components/common/ReadingText";
import { fetchSSEStream } from "@/hooks/useSSEStream";
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
import { CHARACTER_RESULT_MOODS } from "@/data/characters/waiting-lines";
import { getWaitingLinesData } from "@/data/characters/waiting-lines-i18n";
import { useLocaleStore } from "@/hooks/useLocaleStore";
import { useT } from "@/i18n/useT";
import { t as translate } from "@/i18n/translations";
import type { Locale } from "@/i18n/config";

const SITE_NAME = "ArcanaInsight";

/** 사주 init 메시지 — name이 비어 있으면 locale별 prefix를 자동 제거 */
function buildSajuInitMsg(name: string, charId: string | null, locale: Locale): string {
  const key = charId === "miko" ? "saju.session.msg.init-formal" : "saju.session.msg.init-casual";
  const template = translate(key, locale);
  if (!name) {
    return template
      .replace(/\{name\}님의 /g, "")
      .replace(/\{name\}'s /g, "")
      .replace(/\{name\}様の /g, "")
      .replace("{name}", "");
  }
  return template.replace("{name}", name);
}

async function shareWithUrl(title: string, text: string, url: string, locale: Locale): Promise<void> {
  if (navigator.share) {
    try { await navigator.share({ title, text, url }); } catch { /* 사용자가 공유를 취소함 */ } // NOSONAR
  } else {
    try {
      await navigator.clipboard.writeText(`${text}\n${url}`);
      alert(translate("common.share.link-copied", locale));
    } catch (e) { console.warn("clipboard write failed:", e); }
  }
}

async function shareWithText(title: string, text: string, locale: Locale): Promise<void> {
  if (navigator.share) {
    try { await navigator.share({ title, text }); } catch { /* 사용자가 공유를 취소함 */ } // NOSONAR
  } else {
    try {
      await navigator.clipboard.writeText(text);
      alert(translate("common.share.text-copied", locale));
    } catch (e) { console.warn("clipboard write failed:", e); }
  }
}

async function handleSajuShare(r: { shareToken?: string | null; overallReading?: string | null } | null, locale: Locale): Promise<void> {
  const shareToken = r?.shareToken;
  const title = `${translate("saju.session.share.title", locale)} - ${SITE_NAME}`;
  if (shareToken) {
    const url = `${globalThis.location?.origin}/saju/result/${shareToken}`;
    const text = `☯ ${title}`;
    await shareWithUrl(title, text, url, locale);
  } else {
    const summary = r?.overallReading
      ? `☯ ${title}\n\n${r.overallReading.slice(0, 100)}...\n\n- ${SITE_NAME}`
      : `☯ ${title}\n\n- ${SITE_NAME}`;
    await shareWithText(title, summary, locale);
  }
}

export default function SajuSessionPage() {
  const router = useRouter();
  const locale = useLocaleStore((s) => s.locale);
  const { t } = useT();
  const { currentMood, setMood } = useCharacterStore();
  const {
    phase, topic, characterId, userInfo, timeRange, chatMessages, readingResult, sajuData, isLoading,
    setPhase, setSessionId, addChatMessage, setReadingResult, setSajuData, setLoading,
  } = useSajuSessionStore();

  const character = characterId ? getCharacterById(characterId) : null;
  const [readingError, setReadingError] = useState(false);
  const [readingErrorReason, setReadingErrorReason] = useState<"timeout" | "generic">("generic");
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
    const initMsg = buildSajuInitMsg(userInfo.name || "", characterId, locale);
    addChatMessage({ id: crypto.randomUUID(), role: "character",
      content: initMsg, mood: "default", timestamp: new Date(),
    });

    startReading();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // NOSONAR

  const startReading = () => {
    setLoading(true);
    setReadingError(false);
    setReadingErrorReason("generic");
    const state = useSajuSessionStore.getState();

    // 대기 대사
    const charId = state.characterId || "seonhwa";
    const wl = getWaitingLinesData(useLocaleStore.getState().locale);
    const lines = wl.sajuWaitingLines[charId] || wl.defaultSajuWaitingLines;
    const timers: ReturnType<typeof setTimeout>[] = [];
    // CLAUDE.md 규칙: 대기 대사 중 표정 변경 금지 — setMood 호출 제거
    lines.forEach((line, i) => {
      timers.push(setTimeout(() => {
        addChatMessage({ id: crypto.randomUUID(), role: "character", content: line.content, mood: line.mood, timestamp: new Date() });
      }, (i + 1) * 3000));
    });
    const stopTimers = () => timers.forEach(clearTimeout);

    // 클라이언트 hard timeout (180초). 서버 SSE가 hung되거나 done 이벤트가 도달 못 하는 경우 강제 종료.
    const abortController = new AbortController();
    let finished = false;
    const timeoutId = setTimeout(() => {
      if (finished) return;
      finished = true;
      abortController.abort();
      stopTimers();
      console.warn("[saju-session] 클라이언트 타임아웃 180s");
      setMood("default");
      setReadingErrorReason("timeout");
      setReadingError(true);
      setLoading(false);
    }, 180_000);

    void fetchSSEStream({
      url: "/api/saju/reading",
      signal: abortController.signal,
      body: {
        sessionId: state.sessionId, topic: state.topic,
        timeRange: state.timeRange, includeMonthly: state.includeMonthly,
        characterId: state.characterId, userInfo: state.userInfo,
        freeQuestion: state.freeQuestion,
      },
      onChunk: () => { /* 사주는 스트리밍 표시 불필요 — 대기 연출 사용 */ },
      onDone: (data) => {
        if (finished) return;
        finished = true;
        clearTimeout(timeoutId);
        stopTimers();
        const result = data.result as ReadingResult | undefined;
        if (!result) {
          setMood("default"); setReadingError(true); setLoading(false);
          return;
        }

        // 결과 표시 불가 — DB 저장도 차단된 상태이므로 사용자에게 재시도 안내
        if (result.parseError) {
          console.warn("[saju-session] 결과 표시 불가:", { parseError: result.parseError });
          const errLines = (charId && wl.characterErrorLines[charId]) ? wl.characterErrorLines[charId] : wl.defaultErrorLines;
          addChatMessage({ id: crypto.randomUUID(), role: "character",
            content: errLines.reading, mood: "default", timestamp: new Date() });
          setMood("default"); setReadingError(true); setLoading(false);
          return;
        }

        setReadingResult(result);
        if (data.sajuData) setSajuData(data.sajuData as SajuResult);
        setPhase("result"); setMood(CHARACTER_RESULT_MOODS[state.characterId ?? ""] ?? "smile");
        const doneMsg = state.characterId === "miko"
          ? translate("saju.session.msg.complete-formal", locale)
          : translate("saju.session.msg.complete-casual", locale);
        addChatMessage({ id: crypto.randomUUID(), role: "character",
          content: doneMsg, mood: "smile", timestamp: new Date() });
        setLoading(false);
      },
      onError: (msg) => {
        if (finished) return;
        finished = true;
        clearTimeout(timeoutId);
        stopTimers();
        console.error("사주 리딩 실패:", msg);
        const errLines = (charId && wl.characterErrorLines[charId]) ? wl.characterErrorLines[charId] : wl.defaultErrorLines;
        const errText = msg.includes("GROK_API_KEY") ? errLines.api : errLines.reading;
        addChatMessage({ id: crypto.randomUUID(), role: "character",
          content: errText, mood: "default", timestamp: new Date() });
        setMood("default"); setReadingError(true); setLoading(false);
      },
    }).then(() => {
      if (!finished) clearTimeout(timeoutId);
    });

    return () => { clearTimeout(timeoutId); abortController.abort(); };
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
      <ParticleOverlay density={phase === "reading" ? "medium" : "low"} className="z-10" />
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
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, ease: "easeOut" }}
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
                      <span className="text-arcana-purple font-serif font-bold text-base md:text-lg">{t("saju.result.overall")}</span>
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
                      <span className="text-arcana-gold font-serif font-bold text-base md:text-lg">{t("saju.result.topic")}</span>
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
                      <span className="text-arcana-gold font-serif font-bold text-base md:text-lg">{t("saju.result.advice")}</span>
                    </div>
                    <ReadingText text={readingResult.advice} />
                  </motion.div>
                )}
              </div>

              <div className="flex gap-3 pt-5 flex-shrink-0">
                <button onClick={() => { useSajuSessionStore.getState().reset(); router.push("/saju"); }}
                  className="flex-1 px-6 py-2.5 rounded-full border border-arcana-purple text-arcana-purple font-serif font-bold text-sm hover:bg-arcana-purple/10 transition-colors">
                  {t("tarot.session.btn.new-session")}
                </button>
                <button onClick={() => handleSajuShare(useSajuSessionStore.getState().readingResult, locale)}
                  className="flex-1 px-6 py-2.5 rounded-full bg-gradient-to-r from-arcana-purple to-arcana-indigo text-white font-serif font-bold text-sm hover:opacity-90 transition-opacity shadow-lg shadow-arcana-purple/20">
                  {t("tarot.session.btn.share")}
                </button>
              </div>
            </motion.div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              {readingError ? (
                <div className="flex flex-col items-center gap-3 px-5 py-5 rounded-2xl bg-arcana-card/90 border border-red-500/40 shadow-xl backdrop-blur-md max-w-sm" data-testid="reading-error">
                  <p className="text-arcana-text text-sm md:text-base font-serif font-bold text-center">
                    {t("tarot.session.error.title")}
                  </p>
                  <p className="text-arcana-muted text-xs md:text-sm font-sans text-center">
                    {readingErrorReason === "timeout" ? t("tarot.session.error.timeout") : t("tarot.session.error.reading")}
                  </p>
                  <div className="flex gap-3">
                    <button
                      data-testid="reading-retry"
                      onClick={() => { setReadingError(false); startReading(); }}
                      disabled={isLoading}
                      className="px-6 py-2 rounded-full bg-gradient-to-r from-arcana-purple to-arcana-indigo text-white font-serif font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed">
                      {t("tarot.session.btn.try-again")}
                    </button>
                    <button onClick={() => { useSajuSessionStore.getState().reset(); router.push("/saju"); }}
                      className="px-6 py-2 rounded-full border border-arcana-purple text-arcana-purple font-serif font-bold text-sm hover:bg-arcana-purple/10 transition-colors">
                      {t("tarot.session.btn.new-session")}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-10 h-10 border-2 border-arcana-purple/30 border-t-arcana-purple rounded-full animate-spin" />
                  <p className="text-arcana-muted text-xs font-serif">{getWaitingLinesData(locale).sajuAnalyzingText[characterId ?? ""] ?? getWaitingLinesData(locale).defaultSajuAnalyzingText}</p>
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
