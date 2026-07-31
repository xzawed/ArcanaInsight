"use client";

import { useSyncExternalStore } from "react";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(onStoreChange: () => void): () => void {
  const mql = window.matchMedia(REDUCED_MOTION_QUERY);
  mql.addEventListener("change", onStoreChange);
  return () => mql.removeEventListener("change", onStoreChange);
}

function getSnapshot(): boolean {
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

/** 서버는 미디어 쿼리를 알 수 없다. hydration 시점에는 이 값이 쓰인다. */
function getServerSnapshot(): boolean {
  return false;
}

/**
 * `prefers-reduced-motion`을 hydration 안전하게 읽는다.
 *
 * framer-motion의 `useReducedMotion()`은 첫 클라이언트 렌더에서 곧바로 실제 값을 돌려준다.
 * 그래서 이 값으로 **렌더 트리 모양을 가르면** "동작 줄이기"를 켠 사용자에게서 SSR HTML과
 * 첫 클라이언트 렌더가 어긋나 hydration이 깨진다(프로덕션 빌드에서 React error #418 실측).
 * React는 어긋난 트리를 버리고 클라이언트에서 다시 그리는데, 그 사이 들어온 클릭은
 * 핸들러가 없어 유실된다 — 실제 사용자 입력 유실이자 E2E 산발 실패의 원인이었다(#525).
 *
 * `useSyncExternalStore`는 hydration 동안 `getServerSnapshot()`을 써 첫 렌더를 서버와
 * 일치시키고, hydration이 끝난 뒤 실제 값으로 다시 렌더한다.
 *
 * `animate` prop 값만 바꾸는 자리라면 `useReducedMotion()`을 그대로 써도 된다 —
 * 이 훅은 **렌더 유무를 가르는 자리**에 쓴다.
 */
export function useReducedMotionSafe(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
