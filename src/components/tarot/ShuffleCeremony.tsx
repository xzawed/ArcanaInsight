"use client";

import { useEffect, useRef } from "react";
import { shuffleCeremonyText } from "@/data/characters/waiting-lines";

interface ShuffleCeremonyProps {
  characterId: string;
  onComplete: () => void;
  primaryColor?: string;
}

const N = 9;
const TOTAL_S = 2.2;

function hexToRgbStr(hex: string): string {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!r) return "139,92,246";
  return `${parseInt(r[1], 16)},${parseInt(r[2], 16)},${parseInt(r[3], 16)}`;
}

function easeInOut(t: number) { return t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2, 3)/2; }
function easeOut(t: number)   { return 1 - Math.pow(1-t, 3); }
function springFn(t: number)  { return 1 - Math.cos(t * Math.PI * 2.5) * Math.pow(1-t, 2.5); }
function lerp(a: number, b: number, t: number) { return a + (b-a)*t; }

function drawCard(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  angle: number, alpha: number, glowStrength: number,
  rgb: string,
) {
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
  ctx.translate(x, y);
  ctx.rotate(angle);
  if (glowStrength > 0) {
    ctx.shadowColor = `rgba(${rgb},${glowStrength})`;
    ctx.shadowBlur = 20 * glowStrength;
  }
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(-w/2, -h/2, w, h, 4);
  else ctx.rect(-w/2, -h/2, w, h);
  const g = ctx.createLinearGradient(-w/2, -h/2, w/2, h/2);
  g.addColorStop(0, "#2d1b69");
  g.addColorStop(1, "#1a0a3e");
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = `rgba(${rgb},0.6)`;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
}

export function ShuffleCeremony({ characterId, onComplete, primaryColor = "#8b5cf6" }: ShuffleCeremonyProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const calledRef = useRef(false);
  const doneRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    function safeComplete() {
      if (!calledRef.current) {
        calledRef.current = true;
        onCompleteRef.current();
      }
    }

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      safeComplete();
      return;
    }

    if (!canvasRef.current) return;
    if (!canvasRef.current.getContext("2d")) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d")!;

    const setSize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
    };
    setSize();
    const observer = new ResizeObserver(setSize);
    observer.observe(canvas);

    const charText = shuffleCeremonyText[characterId] ?? "카드를 선택하세요";
    const textChars = [...charText];
    const rgb = hexToRgbStr(primaryColor);
    let rafId: number;
    let startMs: number | null = null;
    const cw = 34, ch = 54;

    function drawFinal() {
      const W = canvas.width, H = canvas.height;
      const cx = W/2, cy = H/2;
      ctx.clearRect(0, 0, W, H);
      for (let i = 0; i < N; i++) {
        const f = i/(N-1) - 0.5;
        drawCard(ctx, cx + f*120, cy + Math.pow(f*2, 2)*15, cw, ch, f*0.4, 1, 0, rgb);
      }
      ctx.fillStyle = "rgba(196,181,253,0.95)";
      ctx.font = "14px serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(charText, cx, H - 24);
    }

    function frame(ts: number) {
      if (doneRef.current) {
        drawFinal();
        safeComplete();
        return;
      }

      if (!startMs) startMs = ts;
      const t = (ts - startMs) / 1000;
      const W = canvas.width, H = canvas.height;
      const cx = W/2, cy = H/2;
      ctx.clearRect(0, 0, W, H);

      if (t >= TOTAL_S) {
        drawFinal();
        doneRef.current = true;
        safeComplete();
        return;
      }

      if (t < 0.5) {
        // ① 덱 컷
        const p = easeInOut(Math.min(t / 0.35, 1));
        const ret = t > 0.35 ? easeInOut((t - 0.35) / 0.15) : 0;
        const upY = cy - lerp(0, 26, p) + lerp(0, 26, ret);
        const dnY = cy + lerp(0, 20, p) - lerp(0, 20, ret);
        const glow = p > 0.4 ? Math.min((p - 0.4) / 0.6, 1) * (1 - ret) * 0.8 : 0;
        for (let i = 2; i >= 0; i--) drawCard(ctx, cx, upY - i*2.5, cw, ch, 0, 1, glow*0.4, rgb);
        for (let i = 2; i >= 0; i--) drawCard(ctx, cx, dnY + i*2.5, cw, ch, 0, 1, glow*0.4, rgb);
      } else if (t < 0.7) {
        // ② 글로우 폭발
        const p = easeOut((t - 0.5) / 0.2);
        const fade = 1 - p;
        const rr = ctx.createRadialGradient(cx, cy, 0, cx, cy, 120*p + 10);
        rr.addColorStop(0, `rgba(${rgb},${0.55*fade})`);
        rr.addColorStop(1, `rgba(${rgb},0)`);
        ctx.fillStyle = rr;
        ctx.fillRect(0, 0, W, H);
        for (let i = 3; i >= 0; i--) drawCard(ctx, cx, cy - i*2, cw, ch, 0, 1, fade*0.9, rgb);
      } else if (t < 1.4) {
        // ③ 타이프라이터
        for (let i = 3; i >= 0; i--) drawCard(ctx, cx, cy - i*2, cw, ch, 0, 1, 0, rgb);
        const count = Math.floor((t - 0.7) / 0.058);
        if (count > 0) {
          ctx.fillStyle = "rgba(196,181,253,0.95)";
          ctx.font = "14px serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(textChars.slice(0, Math.min(count, textChars.length)).join(""), cx, H - 24);
        }
      } else {
        // ④ 부채꼴 펼침
        const p = springFn(Math.min((t - 1.4) / 0.6, 1));
        for (let i = 0; i < N; i++) {
          const f = i/(N-1) - 0.5;
          drawCard(ctx, cx + f*120*p, cy + Math.pow(f*2, 2)*15*p, cw, ch, f*0.4*p, 1, 0, rgb);
        }
        ctx.fillStyle = "rgba(196,181,253,0.95)";
        ctx.font = "14px serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(charText, cx, H - 24);
      }

      rafId = requestAnimationFrame(frame);
    }

    rafId = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(rafId);
      observer.disconnect();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // NOSONAR — intentional: run once on mount, refs handle callbacks

  return (
    <div
      className="w-full h-full flex items-center justify-center cursor-pointer select-none"
      onClick={() => { doneRef.current = true; }}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") doneRef.current = true; }}
      role="button"
      tabIndex={0}
      aria-label="카드 셔플 의식 스킵"
    >
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  );
}
