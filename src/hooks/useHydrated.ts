"use client";

import { useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};

/**
 * hydration이 끝났는지 알려준다. 서버와 hydration 중에는 `false`, 그 이후 `true`.
 *
 * `persist` 미들웨어를 쓰는 Zustand 스토어는 클라이언트에서 localStorage 값을 곧바로 읽으므로,
 * 그 값으로 **렌더 트리 모양을 가르면** SSR 결과와 첫 클라이언트 렌더가 어긋나 hydration이
 * 깨진다(React error #418 → 트리 폐기·재렌더 → 그 사이 입력 유실). 이 훅으로 감싸 첫 렌더를
 * 서버와 일치시킨 뒤 실제 값을 반영한다.
 *
 * 같은 문제를 미디어 쿼리 쪽에서 다루는 것은 [[useReducedMotionSafe]]다.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}
