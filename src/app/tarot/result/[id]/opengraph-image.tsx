import { makeResultOgResponse } from "@/app/_og/ResultOgBase";
export { OG_SIZE as size } from "@/app/_og/ResultOgBase";

export const runtime = "edge";
export const contentType = "image/png";

const STARS = [
  { top: "8%",  left: "7%",  size: 3 }, { top: "15%", left: "88%", size: 2 },
  { top: "22%", left: "45%", size: 2 }, { top: "75%", left: "12%", size: 3 },
  { top: "60%", left: "92%", size: 2 }, { top: "85%", left: "55%", size: 2 },
  { top: "35%", left: "3%",  size: 2 }, { top: "48%", left: "96%", size: 3 },
];

export default function Image() {
  return makeResultOgResponse({
    background: "linear-gradient(135deg, #0F0A2E 0%, #1a0f3e 50%, #0a0618 100%)",
    decorationLayer: (
      <>
        {STARS.map((s) => (
          <div key={`${s.top}-${s.left}`} style={{
            position: "absolute", top: s.top, left: s.left,
            width: s.size * 4, height: s.size * 4, borderRadius: "50%",
            background: "rgba(212,175,55,0.6)",
            boxShadow: `0 0 ${s.size * 6}px rgba(167,139,250,0.5)`,
          }} />
        ))}
        <div style={{
          position: "absolute", inset: 0,
          background: "radial-gradient(ellipse 60% 50% at 50% 55%, rgba(88,28,135,0.45) 0%, transparent 70%)",
        }} />
      </>
    ),
    accentColor: "rgba(167,139,250,0.85)",
    iconEmoji: "✦",
    iconGlow: "0 0 24px rgba(167,139,250,0.8)",
    title: "Tarot Reading Result",
    titleColor: "#e2e8f0",
    subtitle: "Your cards tell your story",
  });
}
