"use client";

import { useEffect, useRef } from "react";
import { useLocaleStore } from "@/hooks/useLocaleStore";
import { getWaitingLinesData } from "@/data/characters/waiting-lines-i18n";
import { hexToRgbComponents } from "@/lib/color-utils";
import { t as translate } from "@/i18n/translations";
import { useT } from "@/i18n/useT";
import { useSkinStore } from "@/hooks/useSkinStore";
import { useCardStyleStore } from "@/hooks/useCardStyleStore";
import { useThemeStore } from "@/hooks/useTheme";
import { getCardBackUrl } from "@/lib/storage";
import { getCardStyleBackUrl } from "@/lib/storage/card-style";

interface ShuffleCeremonyProps {
  readonly characterId: string;
  readonly onComplete: () => void;
  readonly primaryColor?: string;
}

const N = 9;
const TOTAL_S = 2.2;

function easeInOut(t: number) { return t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2, 3)/2; }
function easeOut(t: number)   { return 1 - Math.pow(1-t, 3); }
function springFn(t: number)  { return 1 - Math.cos(t * Math.PI * 2.5) * Math.pow(1-t, 2.5); }
function lerp(a: number, b: number, t: number) { return a + (b-a)*t; }

/** 카드 이동 경로 잔상: 이전 위치를 투명도 감쇠로 그린다 */
function drawTrail(
  ctx: CanvasRenderingContext2D,
  trail: Array<{ x: number; y: number; angle: number }>,
  w: number, h: number,
  rgb: string,
) {
  trail.forEach((pt, i) => {
    const alpha = (i / trail.length) * 0.18;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(pt.x, pt.y);
    ctx.rotate(pt.angle);
    ctx.shadowBlur = 8;
    ctx.shadowColor = `rgba(${rgb},0.5)`;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(-w / 2, -h / 2, w, h, 4);
    else ctx.rect(-w / 2, -h / 2, w, h);
    ctx.fillStyle = `rgba(${rgb},0.25)`;
    ctx.fill();
    ctx.restore();
  });
}

function computeCardSize(W: number) {
  const cw = Math.max(30, Math.min(Math.round(W * 0.09), 90));
  const ch = Math.round(cw * 1.5);
  const fanSpread = Math.min(W * 0.65, 480);
  return { cw, ch, fanSpread };
}

function drawCard(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  angle: number, alpha: number, glowStrength: number,
  rgb: string,
  img?: HTMLImageElement | null,
) {
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.shadowBlur = glowStrength > 0 ? 20 * glowStrength : 0;
  ctx.shadowColor = glowStrength > 0 ? `rgba(${rgb},${glowStrength})` : "rgba(0,0,0,0)";
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(-w/2, -h/2, w, h, 4);
  else ctx.rect(-w/2, -h/2, w, h);
  if (img) {
    ctx.save();
    ctx.clip();
    ctx.drawImage(img, -w/2, -h/2, w, h);
    ctx.restore();
  } else {
    const g = ctx.createLinearGradient(-w/2, -h/2, w/2, h/2);
    g.addColorStop(0, "#2d1b69");
    g.addColorStop(1, "#1a0a3e");
    ctx.fillStyle = g;
    ctx.fill();
  }
  ctx.strokeStyle = `rgba(${rgb},0.6)`;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
}

export function ShuffleCeremony({ characterId, onComplete, primaryColor = "#8b5cf6" }: ShuffleCeremonyProps) {
  const { t } = useT();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const calledRef = useRef(false);
  const doneRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const cardImgRef = useRef<HTMLImageElement | null>(null);
  const { selectedSkinId } = useSkinStore();
  const { activeTheme } = useThemeStore();
  const { resolvedStyle } = useCardStyleStore();
  const styleId = resolvedStyle(activeTheme);

  useEffect(() => {
    let cancelled = false;
    const url = styleId ? getCardStyleBackUrl(styleId) : getCardBackUrl(selectedSkinId);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => { if (!cancelled) cardImgRef.current = img; };
    img.onerror = () => {
      if (!cancelled) {
        const fallbackUrl = getCardBackUrl(selectedSkinId);
        if (fallbackUrl !== url) {
          const fallbackImg = new Image();
          fallbackImg.crossOrigin = "anonymous";
          fallbackImg.onload = () => { if (!cancelled) cardImgRef.current = fallbackImg; };
          fallbackImg.onerror = () => { if (!cancelled) cardImgRef.current = null; };
          fallbackImg.src = fallbackUrl;
        } else {
          cardImgRef.current = null;
        }
      }
    };
    img.src = url;
    return () => { cancelled = true; };
  }, [styleId, selectedSkinId]);

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

    let cssW = 0, cssH = 0;
    const setSize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      cssW = rect.width;
      cssH = rect.height;
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    setSize();
    const observer = new ResizeObserver(setSize);
    observer.observe(canvas);

    const locale = useLocaleStore.getState().locale;
    const wl = getWaitingLinesData(locale);
    const charText = wl.shuffleCeremonyText[characterId] ?? translate("tarot.session.shuffle.fallback-text", locale);
    const textChars = [...charText];
    const rgb = hexToRgbComponents(primaryColor);
    let rafId: number;
    let startMs: number | null = null;
    // 부채꼴 펼침 단계 trail 버퍼 (카드당 최대 6 포지션)
    const cardTrails: Array<Array<{ x: number; y: number; angle: number }>> = Array.from({ length: N }, () => []);

    function drawFinal() {
      const W = cssW, H = cssH;
      const cx = W/2, cy = H/2;
      const { cw, ch, fanSpread } = computeCardSize(W);
      ctx.clearRect(0, 0, W, H);
      for (let i = 0; i < N; i++) {
        const f = i/(N-1) - 0.5;
        drawCard(ctx, cx + f*fanSpread, cy + Math.pow(f*2, 2)*ch*0.28, cw, ch, f*0.4, 1, 0, rgb, cardImgRef.current);
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
      const W = cssW, H = cssH;
      const cx = W/2, cy = H/2;
      const { cw, ch, fanSpread } = computeCardSize(W);
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
        const upY = cy - lerp(0, ch * 0.5, p) + lerp(0, ch * 0.5, ret);
        const dnY = cy + lerp(0, ch * 0.37, p) - lerp(0, ch * 0.37, ret);
        const glow = p > 0.4 ? Math.min((p - 0.4) / 0.6, 1) * (1 - ret) * 0.8 : 0;
        for (let i = 2; i >= 0; i--) drawCard(ctx, cx, upY - i*Math.round(cw * 0.07), cw, ch, 0, 1, glow*0.4, rgb, cardImgRef.current);
        for (let i = 2; i >= 0; i--) drawCard(ctx, cx, dnY + i*Math.round(cw * 0.07), cw, ch, 0, 1, glow*0.4, rgb, cardImgRef.current);
      } else if (t < 0.7) {
        // ② 글로우 폭발
        const p = easeOut((t - 0.5) / 0.2);
        const fade = 1 - p;
        const rr = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.min(W * 0.35, 200) * p + 10);
        rr.addColorStop(0, `rgba(${rgb},${0.55*fade})`);
        rr.addColorStop(1, `rgba(${rgb},0)`);
        ctx.fillStyle = rr;
        ctx.fillRect(0, 0, W, H);
        for (let i = 3; i >= 0; i--) drawCard(ctx, cx, cy - i*Math.round(cw * 0.06), cw, ch, 0, 1, fade*0.9, rgb, cardImgRef.current);
      } else if (t < 1.4) {
        // ③ 타이프라이터
        for (let i = 3; i >= 0; i--) drawCard(ctx, cx, cy - i*Math.round(cw * 0.06), cw, ch, 0, 1, 0, rgb, cardImgRef.current);
        const count = Math.floor((t - 0.7) / 0.058);
        if (count > 0) {
          ctx.fillStyle = "rgba(196,181,253,0.95)";
          ctx.font = "14px serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(textChars.slice(0, Math.min(count, textChars.length)).join(""), cx, H - 24);
        }
      } else {
        // ④ 부채꼴 펼침 (trail 잔상 포함)
        const rawP = Math.min((t - 1.4) / 0.6, 1);
        const p = springFn(rawP);
        // burst: TOTAL_S 직전 0.3초 동안 glow 최대 → 완료 직전 시각적 강조
        const burstT = Math.max(0, (t - (TOTAL_S - 0.3)) / 0.3);
        const burstGlow = rawP >= 1 ? Math.max(0, 1 - burstT) * 0.8 : 0;
        for (let i = 0; i < N; i++) {
          const f = i/(N-1) - 0.5;
          const cx_ = cx + f*fanSpread*p;
          const cy_ = cy + Math.pow(f*2, 2)*ch*0.28*p;
          const angle_ = f*0.4*p;
          // trail 버퍼 갱신 (직전 위치 push, 최대 6개)
          if (rawP > 0 && rawP < 1) {
            cardTrails[i].push({ x: cx_, y: cy_, angle: angle_ });
            if (cardTrails[i].length > 6) cardTrails[i].shift();
          }
          drawTrail(ctx, cardTrails[i], cw, ch, rgb);
          drawCard(ctx, cx_, cy_, cw, ch, angle_, 1, burstGlow, rgb, cardImgRef.current);
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
      aria-label={t("tarot.session.shuffle.skip-aria")}
    >
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  );
}
