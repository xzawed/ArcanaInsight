// Canvas 2D 파티클 엔진 — Phase 3+ 자연 이펙트에서 사용
// 순수 함수: React·부수효과 없음

export type ParticleShape =
  | "sparkle" | "petal" | "star" | "bubble" | "snowflake"
  | "flame" | "rune" | "lightning" | "streak" | "dot" | "leaf";

export type ParticleMotion =
  | "fall" | "fall-rotate" | "rise" | "drift" | "twinkle"
  | "firefly" | "wind" | "streak" | "orbit" | "swirl";

export type ThemeIdForParticle =
  | "midnight" | "dawn" | "sunset" | "spring" | "summer" | "autumn" | "winter";

export interface ParticleEmitterSpec {
  shape: ParticleShape;
  colors: string[];
  color2?: string;
  size: [min: number, max: number];
  speed: [min: number, max: number];
  frac: number;
  motion: ParticleMotion;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  color2?: string;
  alpha: number;
  rot: number;
  vrot: number;
  t: number;
  speed: number;
  shape: ParticleShape;
  motion: ParticleMotion;
  cx?: number;
  cy?: number;
  r?: number;
  angle?: number;
  aSpeed?: number;
  glyphIndex?: number;
}

export const RUNE_GLYPHS = ["ᚱ", "ᚦ", "ᚨ", "ᚷ", "ᚹ", "ᛟ", "ᛏ", "ᛇ", "ᛞ", "ᛗ"] as const;

// 파티클 위치/속도는 보안 무관 시각 효과용 — 암호학적 무작위성 불필요
function rand(min: number, max: number): number {
  return min + Math.random() * (max - min); // NOSONAR
}

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]; // NOSONAR
}

function randBool(): boolean {
  return Math.random() > 0.5; // NOSONAR
}

export const THEME_EFFECTS: Record<ThemeIdForParticle, ParticleEmitterSpec[]> = {
  midnight: [
    { shape: "sparkle", colors: ["#a78bfa", "#c4b5fd", "#ddd6fe"], size: [2, 5], speed: [20, 50], frac: 0.0015, motion: "twinkle" },
    { shape: "star", colors: ["#f59e0b", "#fbbf24"], size: [1, 3], speed: [15, 35], frac: 0.001, motion: "drift" },
  ],
  dawn: [
    { shape: "petal", colors: ["#f0abfc", "#e879f9", "#fdf4ff"], color2: "#fbbf24", size: [4, 9], speed: [25, 55], frac: 0.0012, motion: "fall-rotate" },
    { shape: "sparkle", colors: ["#fcd34d", "#fde68a"], size: [2, 4], speed: [20, 40], frac: 0.0008, motion: "twinkle" },
  ],
  sunset: [
    { shape: "flame", colors: ["#fb923c", "#f97316", "#fcd34d"], size: [4, 10], speed: [40, 80], frac: 0.002, motion: "rise" },
    { shape: "streak", colors: ["#fb923c", "#fcd34d"], size: [2, 4], speed: [80, 160], frac: 0.0008, motion: "streak" },
  ],
  spring: [
    { shape: "petal", colors: ["#f9a8d4", "#fbcfe8", "#fce7f3"], color2: "#a7f3d0", size: [5, 12], speed: [20, 45], frac: 0.002, motion: "fall-rotate" },
    { shape: "dot", colors: ["#bbf7d0", "#6ee7b7"], size: [2, 4], speed: [15, 30], frac: 0.0008, motion: "rise" },
  ],
  summer: [
    { shape: "bubble", colors: ["#38bdf8", "#7dd3fc", "#bae6fd"], size: [4, 10], speed: [20, 50], frac: 0.0012, motion: "rise" },
    { shape: "sparkle", colors: ["#fbbf24", "#fde68a"], size: [2, 4], speed: [25, 45], frac: 0.001, motion: "twinkle" },
  ],
  autumn: [
    { shape: "leaf", colors: ["#d97706", "#b45309", "#dc2626", "#92400e"], size: [5, 11], speed: [25, 55], frac: 0.0015, motion: "fall-rotate" },
    { shape: "sparkle", colors: ["#fbbf24", "#fde68a"], size: [2, 4], speed: [15, 35], frac: 0.0008, motion: "twinkle" },
  ],
  winter: [
    { shape: "snowflake", colors: ["#93c5fd", "#bfdbfe", "#e0f2fe", "#f0f9ff"], size: [3, 8], speed: [15, 35], frac: 0.0018, motion: "fall" },
    { shape: "dot", colors: ["#e2e8f0", "#f8fafc"], size: [1, 3], speed: [10, 25], frac: 0.001, motion: "drift" },
  ],
};

export function createParticle(spec: ParticleEmitterSpec, w: number, h: number): Particle {
  const { shape, colors, color2, size, speed, motion } = spec;
  const sz = rand(size[0], size[1]);
  const sp = rand(speed[0], speed[1]);
  const color = pick(colors);

  const base: Particle = {
    x: rand(0, w),
    y: motion === "rise" ? rand(h * 0.6, h) : rand(-sz * 2, -sz),
    vx: rand(-0.5, 0.5),
    vy: motion === "rise" ? -sp / 60 : sp / 60,
    size: sz,
    color,
    color2,
    alpha: rand(0.4, 0.9),
    rot: rand(0, Math.PI * 2),
    vrot: rand(-0.02, 0.02),
    t: 0,
    speed: sp,
    shape,
    motion,
    glyphIndex: shape === "rune" ? Math.floor(rand(0, RUNE_GLYPHS.length)) : undefined,
  };

  if (motion === "orbit") {
    base.cx = rand(w * 0.2, w * 0.8);
    base.cy = rand(h * 0.2, h * 0.8);
    base.r = rand(30, 90);
    base.angle = rand(0, Math.PI * 2);
    base.aSpeed = rand(0.003, 0.012) * (randBool() ? 1 : -1);
    base.x = base.cx + Math.cos(base.angle) * base.r;
    base.y = base.cy + Math.sin(base.angle) * base.r;
  }

  return base;
}

export function stepParticle(p: Particle, w: number, h: number): void {
  p.t += 0.008;
  p.rot += p.vrot;

  switch (p.motion) {
    case "fall":
    case "fall-rotate":
      p.x += p.vx + Math.sin(p.t * 1.2) * 0.4;
      p.y += p.vy;
      if (p.y > h + p.size * 2) { p.y = -p.size * 2; p.x = rand(0, w); p.t = 0; }
      break;

    case "rise":
      p.x += p.vx + Math.sin(p.t * 0.9) * 0.3;
      p.y += p.vy;
      if (p.y < -p.size * 2) { p.y = h + p.size; p.x = rand(0, w); p.t = 0; }
      break;

    case "drift":
      p.x += Math.sin(p.t * 0.7) * 0.6 + p.vx * 0.3;
      p.y += p.vy * 0.4 + Math.cos(p.t * 0.5) * 0.3;
      p.alpha = 0.3 + 0.5 * Math.abs(Math.sin(p.t * 0.8));
      if (p.y > h + p.size) { p.y = -p.size; p.x = rand(0, w); p.t = 0; }
      if (p.y < -p.size) { p.y = h + p.size; p.t = 0; }
      break;

    case "twinkle":
      p.x += Math.sin(p.t * 1.5) * 0.2;
      p.y += Math.cos(p.t * 1.1) * 0.15;
      p.alpha = 0.2 + 0.7 * Math.abs(Math.sin(p.t * 1.8));
      break;

    case "firefly":
      p.x += Math.sin(p.t * 2) * 1.2 + p.vx * 0.5;
      p.y += Math.cos(p.t * 1.5) * 0.9 + p.vy * 0.5;
      p.alpha = 0.1 + 0.8 * Math.abs(Math.sin(p.t * 2.5));
      if (p.x < -20) { p.x = w + 20; }
      if (p.x > w + 20) { p.x = -20; }
      if (p.y < -20) { p.y = h + 20; }
      if (p.y > h + 20) { p.y = -20; }
      break;

    case "wind":
      p.x += p.vy * 1.5 + Math.sin(p.t * 1.2) * 0.8;
      p.y += p.vx * 0.3 + Math.cos(p.t * 0.8) * 0.5;
      p.alpha = 0.3 + 0.5 * Math.abs(Math.sin(p.t * 1.2));
      if (p.x > w + p.size) { p.x = -p.size; p.y = rand(0, h); p.t = 0; }
      break;

    case "streak":
      p.x += p.vy * 2;
      p.y += p.vy * 1.5;
      p.alpha *= 0.985;
      if (p.alpha < 0.02 || p.y > h + 20) {
        p.x = rand(0, w); p.y = -10; p.alpha = rand(0.5, 0.9); p.t = 0;
      }
      break;

    case "orbit":
      if (
        p.angle !== undefined && p.aSpeed !== undefined &&
        p.cx !== undefined && p.cy !== undefined && p.r !== undefined
      ) {
        p.angle += p.aSpeed;
        p.x = p.cx + Math.cos(p.angle) * p.r;
        p.y = p.cy + Math.sin(p.angle) * p.r;
        p.alpha = 0.4 + 0.5 * Math.abs(Math.sin(p.t * 2));
      }
      break;

    case "swirl":
      p.x += Math.cos(p.t * 1.3 + p.rot) * 1.2;
      p.y += Math.sin(p.t * 1.1 + p.rot) * 0.9 + p.vy * 0.2;
      p.alpha = 0.3 + 0.5 * Math.abs(Math.sin(p.t * 1.5));
      if (p.y > h + p.size) { p.y = -p.size; p.t = 0; }
      break;
  }
}

export function drawParticle(ctx: CanvasRenderingContext2D, p: Particle): void {
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, p.alpha));
  ctx.translate(p.x, p.y);
  ctx.rotate(p.rot);

  switch (p.shape) {
    case "dot":
      ctx.beginPath();
      ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();
      break;

    case "sparkle": {
      const s = p.size / 2;
      ctx.strokeStyle = p.color;
      ctx.lineWidth = Math.max(0.5, s * 0.3);
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * s * 0.4, Math.sin(a) * s * 0.4);
        ctx.lineTo(Math.cos(a) * s, Math.sin(a) * s);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.25, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();
      break;
    }

    case "star": {
      const s = p.size / 2;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
        const b = a + Math.PI / 5;
        if (i === 0) ctx.moveTo(Math.cos(a) * s, Math.sin(a) * s);
        else ctx.lineTo(Math.cos(a) * s, Math.sin(a) * s);
        ctx.lineTo(Math.cos(b) * s * 0.4, Math.sin(b) * s * 0.4);
      }
      ctx.closePath();
      ctx.fill();
      break;
    }

    case "petal": {
      const s = p.size / 2;
      const grad = ctx.createRadialGradient(0, -s * 0.3, 0, 0, 0, s);
      grad.addColorStop(0, p.color);
      grad.addColorStop(1, p.color2 ?? "transparent");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(0, 0, s * 0.5, s, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case "leaf": {
      const s = p.size / 2;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.moveTo(0, -s);
      ctx.bezierCurveTo(s * 0.7, -s * 0.5, s * 0.7, s * 0.5, 0, s);
      ctx.bezierCurveTo(-s * 0.7, s * 0.5, -s * 0.7, -s * 0.5, 0, -s);
      ctx.fill();
      break;
    }

    case "bubble": {
      const s = p.size / 2;
      ctx.strokeStyle = p.color;
      ctx.lineWidth = Math.max(0.5, s * 0.15);
      ctx.beginPath();
      ctx.arc(0, 0, s, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = p.color.replace(")", ",0.08)").replace("rgb(", "rgba(").replace("#", "rgba(").replace(/^rgba\(#/, "rgba(");
      ctx.globalAlpha = Math.max(0, Math.min(1, p.alpha * 0.15));
      ctx.fill();
      ctx.globalAlpha = Math.max(0, Math.min(1, p.alpha));
      break;
    }

    case "snowflake": {
      const s = p.size / 2;
      ctx.strokeStyle = p.color;
      ctx.lineWidth = Math.max(0.5, s * 0.2);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(a) * s, Math.sin(a) * s);
        ctx.stroke();
        const bx = Math.cos(a) * s * 0.6;
        const by = Math.sin(a) * s * 0.6;
        const ba = a + Math.PI / 6;
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.lineTo(bx + Math.cos(ba) * s * 0.25, by + Math.sin(ba) * s * 0.25);
        ctx.stroke();
      }
      break;
    }

    case "flame": {
      const s = p.size / 2;
      const grad = ctx.createRadialGradient(0, s * 0.3, 0, 0, 0, s);
      grad.addColorStop(0, "rgba(255,255,255,0.5)");
      grad.addColorStop(0.3, p.color);
      grad.addColorStop(1, "transparent");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(0, -s);
      ctx.bezierCurveTo(s * 0.6, -s * 0.2, s * 0.4, s * 0.5, 0, s);
      ctx.bezierCurveTo(-s * 0.4, s * 0.5, -s * 0.6, -s * 0.2, 0, -s);
      ctx.fill();
      break;
    }

    case "rune": {
      if (p.glyphIndex !== undefined) {
        ctx.fillStyle = p.color;
        ctx.font = `${p.size}px monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(RUNE_GLYPHS[p.glyphIndex], 0, 0);
      }
      break;
    }

    case "lightning": {
      const s = p.size;
      ctx.strokeStyle = p.color;
      ctx.lineWidth = Math.max(0.5, s * 0.15);
      ctx.shadowColor = p.color;
      ctx.shadowBlur = s;
      ctx.beginPath();
      ctx.moveTo(s * 0.2, -s);
      ctx.lineTo(-s * 0.1, -s * 0.1);
      ctx.lineTo(s * 0.3, -s * 0.1);
      ctx.lineTo(-s * 0.2, s);
      ctx.stroke();
      ctx.shadowBlur = 0;
      break;
    }

    case "streak": {
      const len = p.size * 3;
      const grad = ctx.createLinearGradient(0, -len, 0, 0);
      grad.addColorStop(0, "transparent");
      grad.addColorStop(1, p.color);
      ctx.strokeStyle = grad;
      ctx.lineWidth = Math.max(0.5, p.size * 0.2);
      ctx.beginPath();
      ctx.moveTo(0, -len);
      ctx.lineTo(0, 0);
      ctx.stroke();
      break;
    }
  }

  ctx.restore();
}

export function createAuraParticle(
  shape: ParticleShape,
  color1: string,
  color2: string,
  cx: number,
  cy: number,
  maxR: number,
): Particle {
  const angle = rand(0, Math.PI * 2);
  const r = rand(maxR * 0.3, maxR);
  return {
    x: cx + Math.cos(angle) * r,
    y: cy + Math.sin(angle) * r,
    vx: 0,
    vy: 0,
    size: rand(2, 6),
    color: color1,
    color2,
    alpha: rand(0.3, 0.7),
    rot: angle,
    vrot: rand(-0.01, 0.01),
    t: rand(0, Math.PI * 2),
    speed: rand(10, 30),
    shape,
    motion: "orbit",
    cx,
    cy,
    r,
    angle,
    aSpeed: rand(0.005, 0.02) * (randBool() ? 1 : -1),
  };
}
