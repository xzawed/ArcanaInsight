import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// 오방색 (청·적·황·흑·백)
const OBANGSAEK = [
  { color: "rgba(30,58,138,0.5)", angle: 135 },
  { color: "rgba(153,27,27,0.45)", angle: 225 },
  { color: "rgba(146,64,14,0.35)", angle: 315 },
  { color: "rgba(28,25,23,0.4)", angle: 45 },
  { color: "rgba(209,213,219,0.2)", angle: 180 },
];

export default function Image() {
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
          background: "#120A18",
          fontFamily: "sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* 오방색 레이어 */}
        {OBANGSAEK.map((layer, i) => (
          <div
            key={i}
            style={{
              position: "absolute", inset: 0,
              background: `linear-gradient(${layer.angle}deg, ${layer.color} 0%, transparent 55%)`,
            }}
          />
        ))}

        {/* 중앙 영적 글로우 */}
        <div style={{
          position: "absolute", inset: 0,
          background: "radial-gradient(ellipse 50% 40% at 50% 50%, rgba(139,92,246,0.2) 0%, transparent 60%)",
        }} />

        {/* 상단 브랜드 */}
        <div style={{
          display: "flex", alignItems: "center", gap: 12,
          marginBottom: 32,
        }}>
          <div style={{
            fontSize: 16, color: "rgba(167,139,250,0.7)",
            letterSpacing: "0.2em", textTransform: "uppercase",
          }}>
            ArcanaInsight
          </div>
        </div>

        {/* 메인 아이콘 */}
        <div style={{
          fontSize: 80, marginBottom: 24,
          filter: "drop-shadow(0 0 20px rgba(153,27,27,0.8))",
        }}>
          🔮
        </div>

        {/* 서비스 타이틀 */}
        <div style={{
          fontSize: 52, fontWeight: 700, color: "#f5e6ff",
          marginBottom: 16, letterSpacing: "-0.01em",
        }}>
          신점 결과
        </div>

        {/* 서브타이틀 */}
        <div style={{
          fontSize: 22, color: "rgba(209,213,219,0.8)",
          letterSpacing: "0.05em",
        }}>
          신령의 기운으로 읽는 오늘의 운세
        </div>

        {/* 하단 구분선 + 브랜드 */}
        <div style={{
          position: "absolute", bottom: 40,
          display: "flex", alignItems: "center", gap: 16,
          color: "rgba(148,163,184,0.6)", fontSize: 16,
        }}>
          <div style={{ width: 40, height: 1, background: "rgba(148,163,184,0.3)" }} />
          arcana-insight.com
          <div style={{ width: 40, height: 1, background: "rgba(148,163,184,0.3)" }} />
        </div>
      </div>
    ),
    { ...size }
  );
}
