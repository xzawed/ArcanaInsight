"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { fetchSSEStream } from "@/hooks/useSSEStream";
import { ReadingResult } from "@/types/service";
import { SajuResult } from "@/services/saju/saju-types";
import { useSajuSessionStore } from "@/hooks/useSajuSession";
import { useCharacterStore } from "@/hooks/useCharacter";
import { getCharacterById } from "@/data/characters";
import { CHARACTER_RESULT_MOODS } from "@/data/characters/waiting-lines";
import { getWaitingLinesData } from "@/data/characters/waiting-lines-i18n";
import { useLocaleStore } from "@/hooks/useLocaleStore";
import { useT } from "@/i18n/useT";
import { t as translate } from "@/i18n/translations";
import type { Locale } from "@/i18n/config";
import { useThemeStore } from "@/hooks/useTheme";
import { rememberGuestSession } from "@/lib/guest-sessions";

/** 사주 init 메시지 — name이 비어 있으면 locale별 prefix를 자동 제거 */
function buildSajuInitMsg(name: string, charId: string | null, locale: Locale): string {
  const key = charId === "miko" ? "saju.session.msg.init-formal" : "saju.session.msg.init-casual";
  const template = translate(key, locale);
  if (!name) {
    return template
      .replaceAll("{name}님의 ", "")
      .replaceAll("{name}'s ", "")
      .replaceAll("{name}様の ", "")
      .replace("{name}", "");
  }
  return template.replace("{name}", name);
}

/**
 * 사주 세션 페이지의 리딩 진행 로직을 캡슐화한 컨트롤러 훅.
 * (이전에는 page.tsx 인라인이었으나 view/controller 분리를 위해 추출 — 동작은 verbatim 유지.)
 */
export function useSajuReading() {
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
      if (data.session?.id) { setSessionId(data.session.id); rememberGuestSession(data.session.id); }
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

    // 클라이언트 hard timeout (280초). 서버 AI_TIMEOUT_MS(240s)보다 크게 잡아 양의 마진 확보 —
    // 서버가 240s 근처에서 done을 보내도 클라가 먼저 abort하지 않도록 한다(마진 0 회귀 방지).
    const abortController = new AbortController();
    readingAbortRef.current = abortController;
    let finished = false;
    const timeoutId = setTimeout(() => {
      if (finished) return;
      finished = true;
      abortController.abort();
      stopTimers();
      console.warn("[saju-session] 클라이언트 타임아웃 280s");
      setMood("default");
      setReadingErrorReason("timeout");
      setReadingError(true);
      setLoading(false);
    }, 280_000);

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

        // 표시 불가 — 본문 salvage조차 없는 경우만 무결과 처리 (타로·신점과 동일 계약).
        // truncated/fallback_text는 overallReading에 정제 본문이 있으므로 아래에서 부분 표시한다.
        if (result.parseError === "invalid_json" || result.parseError === "missing_fields") {
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
      // 스트림이 종단 이벤트(done/error) 없이 종료된 경우(프록시 idle-drop·배포 재시작 등)
      // 워치독만 해제하면 무한 스피너로 영구 정지 → 명시적 에러로 전환해 복구 가능하게 한다.
      if (finished) return;
      finished = true;
      clearTimeout(timeoutId);
      stopTimers();
      console.warn("[saju-session] 스트림이 종단 이벤트 없이 종료됨");
      const errLines = (charId && wl.characterErrorLines[charId]) ? wl.characterErrorLines[charId] : wl.defaultErrorLines;
      addChatMessage({ id: crypto.randomUUID(), role: "character",
        content: errLines.reading, mood: "default", timestamp: new Date() });
      setMood("default"); setReadingError(true); setLoading(false);
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

  const birthYear = userInfo ? Number.parseInt(userInfo.birthDate.split("-")[0]) : 2000;
  const { activeTheme } = useThemeStore();

  return {
    locale, t, router,
    phase, character, characterId, currentMood, chatMessages, readingResult, sajuData, isLoading,
    readingError, readingErrorReason, setReadingError,
    startReading, resultContainerRef, birthYear, activeTheme,
  };
}
