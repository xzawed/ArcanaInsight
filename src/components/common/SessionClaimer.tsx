"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { getGuestSessions, clearGuestSessions } from "@/lib/guest-sessions";

/**
 * 로그인 시 클라이언트에 보관된 익명 sessionId를 서버로 보내 계정에 연결(claim)한다.
 * 게스트/만료 세션 상태에서 만든 리딩이 로그인 후 mypage 이력에 노출되도록 복구한다.
 *
 * Supabase auth 상태 변화(INITIAL_SESSION: 이미 로그인 / SIGNED_IN: 방금 로그인)에서
 * 세션이 존재하고 보관된 익명 id가 있을 때만 1회 claim 호출(in-flight 가드).
 * 실패 시 localStorage를 유지해 다음 로그인에 재시도한다.
 * (DB_PROVIDER=postgres 모드는 Supabase auth 이벤트가 없어 동작하지 않음 — 기본 supabase 모드 전용.)
 */
export function SessionClaimer() {
  const inFlightRef = useRef(false);

  useEffect(() => {
    const supabase = createClient();

    const claim = async () => {
      if (inFlightRef.current) return;
      const ids = getGuestSessions();
      if (ids.length === 0) return;
      inFlightRef.current = true;
      try {
        const res = await fetch("/api/sessions/claim", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionIds: ids }),
        });
        if (res.ok) clearGuestSessions(ids);
      } catch {
        // 네트워크 실패 — localStorage 유지, 다음 로그인 재시도
      } finally {
        inFlightRef.current = false;
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user && (event === "SIGNED_IN" || event === "INITIAL_SESSION")) {
        void claim();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return null;
}
