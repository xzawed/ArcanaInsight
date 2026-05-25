"use client";

import React from "react";
import { useReducedMotion } from "framer-motion";
import { useMouseParallax } from "@/hooks/useMouseParallax";
import type { ParallaxOffsets } from "@/hooks/useMouseParallax";

type ServiceType = "tarot" | "saju" | "shinjeom";

interface ServiceIllustrationsProps {
  readonly service: ServiceType;
}

const TAROT_CARDS = [
  { sym: "☽", label: "Moon" },
  { sym: "☉", label: "Sun" },
  { sym: "★", label: "Star" },
  { sym: "♛", label: "Empress" },
  { sym: "✦", label: "Magician" },
  { sym: "⚔", label: "Tower" },
  { sym: "♡", label: "Lovers" },
  { sym: "⚘", label: "World" },
  { sym: "⚯", label: "Fool" },
] as const;

const SAJU_GLYPHS = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"] as const;
const SAJU_BRANCHES = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"] as const;

// Pre-computed 오행 positions (r=32, angles: -90°, -18°, 54°, 126°, 198°)
const OHAENG = [
  { sym: "火", x:  0.00, y: -32.00, color: "#ef4444" },
  { sym: "水", x: 30.43, y:  -9.89, color: "#0ea5e9" },
  { sym: "木", x: 18.81, y:  25.88, color: "#4ade80" },
  { sym: "金", x:-18.81, y:  25.88, color: "#fbbf24" },
  { sym: "土", x:-30.43, y:  -9.89, color: "#b45309" },
] as const;

const OHAENG_POINTS = OHAENG.map(o => `${o.x},${o.y}`).join(" ");

type LayerOffset = { x: number; y: number };
type LayerOffsets = Pick<ParallaxOffsets, "far" | "mid" | "near">;

// Parallax layer fills its parent and centers content, with a parallax offset
function parallaxLayerStyle(offset: LayerOffset): React.CSSProperties {
  return {
    position: "absolute",
    inset: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transform: `translate(${offset.x}px, ${offset.y}px)`,
    willChange: "transform",
  };
}

// Parallax layer that covers its parent but doesn't center (for particles with left/top)
function parallaxCoverStyle(offset: LayerOffset): React.CSSProperties {
  return {
    position: "absolute",
    inset: 0,
    transform: `translate(${offset.x}px, ${offset.y}px)`,
    willChange: "transform",
  };
}

// ─── TAROT SCENE ────────────────────────────────────────────────────────────

function TarotScene({ far, mid, near }: LayerOffsets) {
  return (
    <div className="service-scene tarot-scene" aria-hidden="true">
      {/* FAR: god rays */}
      <div style={parallaxLayerStyle(far)}>
        <div className="rays">
          {Array.from({ length: 12 }, (_, i) => (
            <span key={i} className="ray" style={{ transform: `rotate(${i * 30}deg)` }} />
          ))}
        </div>
      </div>

      {/* MID: card orbit + central orb — stacked at scene center */}
      <div style={parallaxLayerStyle(mid)}>
        <div className="scene-stack">
          <div className="tarot-orbit">
            <div className="tarot-orbit-inner">
              {TAROT_CARDS.map((c, i) => (
                <div
                  key={c.label}
                  className="tarot-mini"
                  style={{
                    transform: `rotate(${(i / TAROT_CARDS.length) * 360}deg) translate(0, -180px) rotate(${-(i / TAROT_CARDS.length) * 360}deg)`,
                    animationDelay: `${i * 0.4}s`,
                  }}
                >
                  <span className="tarot-mini-sym">{c.sym}</span>
                  <span className="tarot-mini-edge" />
                </div>
              ))}
            </div>
          </div>
          <div className="central-orb tarot-orb">
            <div className="orb-glow" />
            <div className="orb-ring" />
            <div className="orb-ring orb-ring-2" />
            <svg viewBox="0 0 100 100" className="sigil" aria-hidden="true">
              <circle cx="50" cy="50" r="32" fill="none" stroke="currentColor" strokeWidth="0.4" />
              <polygon
                points="50,18 80,38 70,72 30,72 20,38"
                fill="none" stroke="currentColor" strokeWidth="0.4" strokeOpacity="0.6"
              />
              <text
                x="50" y="55" textAnchor="middle" fontSize="14"
                fontFamily="Cormorant Garamond, serif"
                fill="currentColor" fillOpacity="0.7"
              >XXI</text>
            </svg>
          </div>
        </div>
      </div>

      {/* NEAR: floating sparks */}
      <div style={parallaxCoverStyle(near)}>
        {Array.from({ length: 14 }, (_, i) => (
          <span
            key={i}
            className="spark"
            style={{
              left: `${10 + (i * 6.3) % 80}%`,
              top: `${15 + (i * 11.7) % 70}%`,
              animationDelay: `${(i * 0.7) % 5}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ─── SAJU SCENE ─────────────────────────────────────────────────────────────

function SajuScene({ far, mid, near }: LayerOffsets) {
  return (
    <div className="service-scene saju-scene" aria-hidden="true">
      {/* FAR: warm rays */}
      <div style={parallaxLayerStyle(far)}>
        <div className="rays">
          {Array.from({ length: 8 }, (_, i) => (
            <span key={i} className="ray ray-warm" style={{ transform: `rotate(${i * 45}deg)` }} />
          ))}
        </div>
      </div>

      {/* MID: outer 지지 ring + inner 천간 ring + central 오행 orb */}
      <div style={parallaxLayerStyle(mid)}>
        <div className="scene-stack">
          <div className="saju-ring saju-ring-outer">
            {SAJU_BRANCHES.map((g, i) => (
              <span
                key={g}
                className="saju-glyph"
                style={{
                  transform: `rotate(${(i / 12) * 360}deg) translate(0, -210px) rotate(${-(i / 12) * 360}deg)`,
                }}
              >
                {g}
              </span>
            ))}
          </div>
          <div className="saju-ring saju-ring-inner">
            {SAJU_GLYPHS.map((g, i) => (
              <span
                key={g}
                className="saju-glyph saju-glyph-inner"
                style={{
                  transform: `rotate(${(i / 10) * 360}deg) translate(0, -140px) rotate(${-(i / 10) * 360}deg)`,
                }}
              >
                {g}
              </span>
            ))}
          </div>
          <div className="central-orb saju-orb">
            <div className="orb-glow" />
            <svg viewBox="-50 -50 100 100" className="sigil" aria-hidden="true">
              {OHAENG.map((o) => (
                <g key={o.sym} transform={`translate(${o.x} ${o.y})`}>
                  <circle r="10" fill="none" stroke={o.color} strokeOpacity="0.7" strokeWidth="0.5" />
                  <text
                    textAnchor="middle" dy="0.35em" fontSize="9"
                    fontFamily="Noto Serif KR, serif"
                    fill={o.color} fillOpacity="0.85"
                  >
                    {o.sym}
                  </text>
                </g>
              ))}
              <polygon
                points={OHAENG_POINTS}
                fill="none" stroke="currentColor" strokeOpacity="0.4" strokeWidth="0.4"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* NEAR: drifting embers */}
      <div style={parallaxCoverStyle(near)}>
        {Array.from({ length: 12 }, (_, i) => (
          <span
            key={i}
            className="ember"
            style={{
              left: `${5 + (i * 7.7) % 90}%`,
              top: `${20 + (i * 13.3) % 60}%`,
              animationDelay: `${(i * 0.5) % 4}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ─── SHINJEOM SCENE ──────────────────────────────────────────────────────────

function ShinjeomScene({ far, mid, near }: LayerOffsets) {
  return (
    <div className="service-scene shinjeom-scene" aria-hidden="true">
      {/* FAR: rising mist (covers full area, no flex centering) */}
      <div style={parallaxCoverStyle(far)}>
        <div className="mist">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className={`mist-wisp mist-${i}`} />
          ))}
        </div>
      </div>

      {/* MID: crystal orbit + central crystal ball */}
      <div style={parallaxLayerStyle(mid)}>
        <div className="scene-stack">
          <div className="crystal-orbit">
            {Array.from({ length: 6 }, (_, i) => (
              <div
                key={i}
                className="crystal-mini"
                style={{
                  transform: `rotate(${(i / 6) * 360}deg) translate(0, -200px) rotate(${-(i / 6) * 360}deg)`,
                  animationDelay: `${i * 0.6}s`,
                }}
              >
                <div className="crystal-mini-glow" />
              </div>
            ))}
          </div>
          <div className="central-orb shinjeom-orb">
            <div className="orb-glow" />
            <div className="crystal-body">
              <div className="crystal-shine" />
              <div className="crystal-galaxy">
                {Array.from({ length: 10 }, (_, i) => (
                  <span
                    key={i}
                    className="gx-dot"
                    style={{
                      left: `${20 + (i * 7.3) % 60}%`,
                      top: `${20 + (i * 11.1) % 60}%`,
                      animationDelay: `${i * 0.3}s`,
                    }}
                  />
                ))}
              </div>
              <div className="crystal-base" />
            </div>
          </div>
        </div>
      </div>

      {/* NEAR: floating mystic orbs */}
      <div style={parallaxCoverStyle(near)}>
        {Array.from({ length: 8 }, (_, i) => (
          <span
            key={i}
            className="mystic-orb"
            style={{
              left: `${5 + (i * 11.4) % 90}%`,
              top: `${10 + (i * 13.7) % 80}%`,
              animationDelay: `${(i * 0.5) % 3}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ─── PUBLIC API ──────────────────────────────────────────────────────────────

export function ServiceIllustrations({ service }: ServiceIllustrationsProps) {
  const shouldReduceMotion = Boolean(useReducedMotion());
  const offsets = useMouseParallax(!shouldReduceMotion);

  switch (service) {
    case "tarot":    return <TarotScene {...offsets} />;
    case "saju":     return <SajuScene {...offsets} />;
    case "shinjeom": return <ShinjeomScene {...offsets} />;
    default:         return null;
  }
}
