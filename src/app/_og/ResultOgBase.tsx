import { ImageResponse } from "next/og";
import type { ReactNode } from "react";

export const OG_SIZE = { width: 1200, height: 630 };

interface ResultOgConfig {
  background: string;
  decorationLayer: ReactNode;
  accentColor: string;
  iconEmoji: string;
  iconGlow: string;
  title: string;
  titleColor: string;
  subtitle: string;
}

export function makeResultOgResponse(config: ResultOgConfig) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: config.background,
          fontFamily: "sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {config.decorationLayer}

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 32 }}>
          <div style={{ fontSize: 16, color: config.accentColor, letterSpacing: "0.2em", textTransform: "uppercase" }}>
            ArcanaInsight
          </div>
        </div>

        <div style={{ fontSize: 80, marginBottom: 24, filter: `drop-shadow(${config.iconGlow})` }}>
          {config.iconEmoji}
        </div>

        <div style={{ fontSize: 52, fontWeight: 700, color: config.titleColor, marginBottom: 16, letterSpacing: "-0.01em" }}>
          {config.title}
        </div>

        <div style={{ fontSize: 22, color: config.accentColor, letterSpacing: "0.05em" }}>
          {config.subtitle}
        </div>

        <div style={{
          position: "absolute",
          bottom: 40,
          display: "flex",
          alignItems: "center",
          gap: 16,
          color: "rgba(148,163,184,0.6)",
          fontSize: 16,
        }}>
          <div style={{ width: 40, height: 1, background: "rgba(148,163,184,0.3)" }} />
          arcana-insight.com
          <div style={{ width: 40, height: 1, background: "rgba(148,163,184,0.3)" }} />
        </div>
      </div>
    ),
    { ...OG_SIZE }
  );
}
