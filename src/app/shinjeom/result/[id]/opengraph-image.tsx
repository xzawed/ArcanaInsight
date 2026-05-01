import { makeResultOgResponse } from "@/app/_og/ResultOgBase";
export { OG_SIZE as size } from "@/app/_og/ResultOgBase";

export const runtime = "edge";
export const contentType = "image/png";

const OBANGSAEK = [
  { color: "rgba(30,58,138,0.5)",   angle: 135 },
  { color: "rgba(153,27,27,0.45)",  angle: 225 },
  { color: "rgba(146,64,14,0.35)",  angle: 315 },
  { color: "rgba(28,25,23,0.4)",    angle: 45  },
  { color: "rgba(209,213,219,0.2)", angle: 180 },
];

export default function Image() {
  return makeResultOgResponse({
    background: "#120A18",
    decorationLayer: (
      <>
        {OBANGSAEK.map((layer) => (
          <div key={layer.angle} style={{
            position: "absolute", inset: 0,
            background: `linear-gradient(${layer.angle}deg, ${layer.color} 0%, transparent 55%)`,
          }} />
        ))}
        <div style={{
          position: "absolute", inset: 0,
          background: "radial-gradient(ellipse 50% 40% at 50% 50%, rgba(139,92,246,0.2) 0%, transparent 60%)",
        }} />
      </>
    ),
    accentColor: "rgba(209,213,219,0.8)",
    iconEmoji: "🔮",
    iconGlow: "0 0 20px rgba(153,27,27,0.8)",
    title: "신점 결과",
    titleColor: "#f5e6ff",
    subtitle: "신령의 기운으로 읽는 오늘의 운세",
  });
}
