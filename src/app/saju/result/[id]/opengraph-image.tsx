import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

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
          background: "linear-gradient(160deg, #1A1209 0%, #231708 50%, #0d0b04 100%)",
          fontFamily: "sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* 앰버 하단 글로우 */}
        <div style={{
          position: "absolute", inset: 0,
          background: "radial-gradient(ellipse 70% 40% at 50% 95%, rgba(217,119,6,0.4) 0%, transparent 65%)",
        }} />
        {/* 상단 녹색 미묘한 글로우 */}
        <div style={{
          position: "absolute", inset: 0,
          background: "radial-gradient(ellipse 40% 25% at 50% 5%, rgba(6,95,70,0.25) 0%, transparent 60%)",
        }} />

        {/* 팔괘 장식 (희미한 워터마크) */}
        {["☰", "☱", "☲", "☳", "☴", "☵", "☶", "☷"].map((trigram, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              top: "50%", left: "50%",
              fontSize: 20,
              color: "rgba(217,119,6,0.12)",
              transform: `rotate(${i * 45}deg) translateY(-260px) rotate(-${i * 45}deg)`,
            }}
          >
            {trigram}
          </div>
        ))}

        {/* 상단 브랜드 */}
        <div style={{
          display: "flex", alignItems: "center", gap: 12,
          marginBottom: 32,
        }}>
          <div style={{
            fontSize: 16, color: "rgba(217,119,6,0.7)",
            letterSpacing: "0.2em", textTransform: "uppercase",
          }}>
            ArcanaInsight
          </div>
        </div>

        {/* 메인 아이콘 */}
        <div style={{
          fontSize: 80, marginBottom: 24,
          filter: "drop-shadow(0 0 24px rgba(217,119,6,0.7))",
        }}>
          ☯
        </div>

        {/* 서비스 타이틀 */}
        <div style={{
          fontSize: 52, fontWeight: 700, color: "#fef3c7",
          marginBottom: 16, letterSpacing: "-0.01em",
        }}>
          사주 분석 결과
        </div>

        {/* 서브타이틀 */}
        <div style={{
          fontSize: 22, color: "rgba(217,119,6,0.85)",
          letterSpacing: "0.05em",
        }}>
          오행의 흐름으로 읽는 나의 운명
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
