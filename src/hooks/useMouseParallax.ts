"use client";

import { useState, useEffect, useRef } from "react";

export interface ParallaxOffsets {
  far: { x: number; y: number };
  mid: { x: number; y: number };
  near: { x: number; y: number };
}

const ZERO: ParallaxOffsets = {
  far: { x: 0, y: 0 },
  mid: { x: 0, y: 0 },
  near: { x: 0, y: 0 },
};

const FAR_X = 12, FAR_Y = 8;
const MID_X = 32, MID_Y = 22;
const NEAR_X = 70, NEAR_Y = 48;
const LERP = 0.07;

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function useMouseParallax(enabled = true): ParallaxOffsets {
  const [offsets, setOffsets] = useState<ParallaxOffsets>(ZERO);
  const targetRef = useRef({ x: 0, y: 0 });
  const currentRef = useRef({
    far: { x: 0, y: 0 },
    mid: { x: 0, y: 0 },
    near: { x: 0, y: 0 },
  });
  const rafRef = useRef<number | null>(null);
  const mountedRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;
    mountedRef.current = true;

    const onMove = (e: MouseEvent) => {
      const nx = (e.clientX / window.innerWidth - 0.5) * 2;
      const ny = (e.clientY / window.innerHeight - 0.5) * 2;
      targetRef.current = { x: nx, y: ny };
    };

    const tick = () => {
      if (!mountedRef.current) return;
      const { x, y } = targetRef.current;
      const cur = currentRef.current;

      cur.far.x = lerp(cur.far.x, x * FAR_X, LERP);
      cur.far.y = lerp(cur.far.y, y * FAR_Y, LERP);
      cur.mid.x = lerp(cur.mid.x, x * MID_X, LERP);
      cur.mid.y = lerp(cur.mid.y, y * MID_Y, LERP);
      cur.near.x = lerp(cur.near.x, x * NEAR_X, LERP);
      cur.near.y = lerp(cur.near.y, y * NEAR_Y, LERP);

      setOffsets({
        far: { x: cur.far.x, y: cur.far.y },
        mid: { x: cur.mid.x, y: cur.mid.y },
        near: { x: cur.near.x, y: cur.near.y },
      });

      rafRef.current = requestAnimationFrame(tick);
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      mountedRef.current = false;
      window.removeEventListener("mousemove", onMove);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [enabled]);

  return enabled ? offsets : ZERO;
}
