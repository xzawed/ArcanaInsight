"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { fetchSSEStream } from "@/hooks/useSSEStream";
import { ResultTextCard } from "@/components/session/ResultTextCard";
import { SessionActionButtons } from "@/components/session/SessionActionButtons";
import { ReadingErrorState } from "@/components/session/ReadingErrorState";
import { shareWithUrl, shareWithText } from "@/lib/share-utils";
import { ReadingResult } from "@/types/service";
import { SajuResult } from "@/services/saju/saju-types";
import { motion } from "framer-motion";
import { useSajuSessionStore } from "@/hooks/useSajuSession";
import { useCharacterStore } from "@/hooks/useCharacter";
import { CharacterDisplay } from "@/components/character/CharacterDisplay";
import { DialogueBox } from "@/components/chat/DialogueBox";
import { ParticleOverlay } from "@/components/effects/ParticleOverlay";
import { MysticBackground, ThemeAtmosphere } from "@/components/effects/MysticBackground";
import { SajuChart } from "@/components/saju/SajuChart";
import { OhaengGraph } from "@/components/saju/OhaengGraph";
import { DaeunTimeline } from "@/components/saju/DaeunTimeline";
import { SajuChartReveal } from "@/components/saju/SajuChartReveal";
import { getCharacterById } from "@/data/characters";
import { CHARACTER_RESULT_MOODS } from "@/data/characters/waiting-lines";
import { getWaitingLinesData } from "@/data/characters/waiting-lines-i18n";
import { useLocaleStore } from "@/hooks/useLocaleStore";
import { useT } from "@/i18n/useT";
import { t as translate } from "@/i18n/translations";
import type { Locale } from "@/i18n/config";
import { useThemeStore } from "@/hooks/useTheme";
import { getServiceBackgroundUrl } from "@/lib/storage/card-style";
import { ServiceIllustrations } from "@/components/effects/ServiceIllustrations";

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
  const readingAbortRef = useRef<AbortController | null>(null);

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

    // 클라이언트 hard timeout (240초). 서버 AI_TIMEOUT_MS와 동조 — full-fortune/includeMonthly(max_tokens
    // 17000~20000)는 reasoning 흡수까지 200~400s 소요 가능. 120s/180s에서는 본문 잘림 빈발.
    const abortController = new AbortController();
    readingAbortRef.current = abortController;
    let finished = false;
    const timeoutId = setTimeout(() => {
      if (finished) return;
      finished = true;
      abortController.abort();
      stopTimers();
      console.warn("[saju-session] 클라이언트 타임아웃 240s");
      setMood("default");
      setReadingErrorReason("timeout");
      setReadingError(true);
      setLoading(false);
    }, 240_000);

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

  useEffect(() => {
    return () => { readingAbortRef.current?.abort(); };
  }, []);

  const birthYear = userInfo ? parseInt(userInfo.birthDate.split("-")[0]) : 2000;
  const { activeTheme } = useThemeStore();

  return (
    <div className="relative h-[calc(100dvh-7rem)] md:h-[calc(100dvh-3.5rem)] flex flex-col overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <Image src={getServiceBackgroundUrl('saju', activeTheme)} alt="" fill className="object-cover" priority sizes="100vw" unoptimized />
        <div className="absolute inset-0 bg-arcana-bg/50" />
      </div>
      <ParticleOverlay density={phase === "reading" ? "medium" : "low"} className="z-10" />
      <MysticBackground service="saju" />
      <ThemeAtmosphere theme={activeTheme} intensity="ambient" className="z-[6] mix-blend-screen" testId="session-theme-atmosphere-saju" />

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

        <div className="flex-1 md:w-[50%] flex flex-col px-2 md:px-4 overflow-hidden relative">
          {/* 데스크탑 전용 서비스 일러스트 */}
          <div className="absolute inset-0 hidden md:block pointer-events-none">
            <ServiceIllustrations service="saju" />
          </div>
          {phase === "result" && readingResult && sajuData ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, ease: "easeOut" }}
              className="w-full flex-1 flex flex-col overflow-hidden py-4">
              <div ref={resultContainerRef} className="space-y-4 md:space-y-5 flex-1 overflow-y-auto pr-2">
                <SajuChartReveal index={0}>
                  <SajuChart pillars={sajuData.pillars} dayMaster={sajuData.dayMaster}
                    dayMasterElement={sajuData.dayMasterElement} isStrong={sajuData.isStrong} yongsin={sajuData.yongsin} />
                </SajuChartReveal>
                <SajuChartReveal index={1}>
                  <OhaengGraph elements={sajuData.elements} yongsinElement={sajuData.yongsin.element} />
                </SajuChartReveal>

                {readingResult.overallReading && (
                  <ResultTextCard text={readingResult.overallReading} emoji="☯" label={t("saju.result.overall")} delay={0.4} colorScheme="purple" />
                )}

                {readingResult.topicReading && (
                  <ResultTextCard text={readingResult.topicReading} emoji="🔍" label={t("saju.result.topic")} delay={0.55} colorScheme="card" />
                )}

                <SajuChartReveal index={4}>
                  <DaeunTimeline majorFortunes={sajuData.majorFortunes} yearlyFortune={sajuData.yearlyFortune} birthYear={birthYear} />
                </SajuChartReveal>

                {readingResult.advice && (
                  <ResultTextCard text={readingResult.advice} emoji="✨" label={t("saju.result.advice")} delay={0.85} colorScheme="gold" />
                )}
              </div>

              <SessionActionButtons
                onNewSession={() => { useSajuSessionStore.getState().reset(); router.push("/saju"); }}
                onShare={() => handleSajuShare(useSajuSessionStore.getState().readingResult, locale)}
                newSessionLabel={t("tarot.session.btn.new-session")}
                shareLabel={t("tarot.session.btn.share")}
              />
            </motion.div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              {readingError ? (
                <ReadingErrorState
                  titleText={t("tarot.session.error.title")}
                  errorText={readingErrorReason === "timeout" ? t("tarot.session.error.timeout") : t("tarot.session.error.reading")}
                  tryAgainText={t("tarot.session.btn.try-again")}
                  newSessionText={t("tarot.session.btn.new-session")}
                  onRetry={() => { setReadingError(false); startReading(); }}
                  onNewSession={() => { useSajuSessionStore.getState().reset(); router.push("/saju"); }}
                  isRetrying={isLoading}
                />
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
