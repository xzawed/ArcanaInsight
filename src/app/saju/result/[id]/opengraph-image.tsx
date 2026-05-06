import { makeResultOgResponse } from "@/app/_og/ResultOgBase";
export { OG_SIZE as size } from "@/app/_og/ResultOgBase";

export const runtime = "edge";
export const contentType = "image/png";

const TRIGRAMS = ["☰", "☱", "☲", "☳", "☴", "☵", "☶", "☷"];

export default function Image() {
  return makeResultOgResponse({
    background: "linear-gradient(160deg, #1A1209 0%, #231708 50%, #0d0b04 100%)",
    decorationLayer: (
      <>
        <div style={{
          position: "absolute", inset: 0,
          background: "radial-gradient(ellipse 70% 40% at 50% 95%, rgba(217,119,6,0.4) 0%, transparent 65%)",
        }} />
        <div style={{
          position: "absolute", inset: 0,
          background: "radial-gradient(ellipse 40% 25% at 50% 5%, rgba(6,95,70,0.25) 0%, transparent 60%)",
        }} />
        {TRIGRAMS.map((trigram, i) => (
          <div key={trigram} style={{
            position: "absolute", top: "50%", left: "50%",
            fontSize: 20, color: "rgba(217,119,6,0.12)",
            transform: `rotate(${i * 45}deg) translateY(-260px) rotate(-${i * 45}deg)`,
          }}>
            {trigram}
          </div>
        ))}
      </>
    ),
    accentColor: "rgba(217,119,6,0.85)",
    iconEmoji: "☯",
    iconGlow: "0 0 24px rgba(217,119,6,0.7)",
    title: "Saju Analysis Result",
    titleColor: "#fef3c7",
    subtitle: "Your four pillars reveal your destiny",
  });
}
