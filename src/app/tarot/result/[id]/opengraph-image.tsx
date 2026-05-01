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
          background: "linear-gradient(135deg, #0F0A2E 0%, #1a0f3e 50%, #0a0618 100%)",
          fontFamily: "sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* 별 장식 레이어 */}
        {[
          { top: "8%", left: "7%", size: 3 }, { top: "15%", left: "88%", size: 2 },
          { top: "22%", left: "45%", size: 2 }, { top: "75%", left: "12%", size: 3 },
          { top: "60%", left: "92%", size: 2 }, { top: "85%", left: "55%", size: 2 },
          { top: "35%", left: "3%", size: 2 },  { top: "48%", left: "96%", size: 3 },
        ].map((s, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              top: s.top, left: s.left,
              width: s.size * 4, height: s.size * 4,
              borderRadius: "50%",
              background: "rgba(212,175,55,0.6)",
              boxShadow: `0 0 ${s.size * 6}px rgba(167,139,250,0.5)`,
            }}
          />
        ))}

        {/* 중앙 방사형 글로우 */}
        <div style={{
          position: "absolute", inset: 0,
          background: "radial-gradient(ellipse 60% 50% at 50% 55%, rgba(88,28,135,0.45) 0%, transparent 70%)",
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
          filter: "drop-shadow(0 0 24px rgba(167,139,250,0.8))",
        }}>
          ✦
        </div>

        {/* 서비스 타이틀 */}
        <div style={{
          fontSize: 52, fontWeight: 700, color: "#e2e8f0",
          marginBottom: 16, letterSpacing: "-0.01em",
        }}>
          타로 리딩 결과
        </div>

        {/* 서브타이틀 */}
        <div style={{
          fontSize: 22, color: "rgba(167,139,250,0.85)",
          letterSpacing: "0.05em",
        }}>
          카드가 속삭이는 당신의 이야기
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
