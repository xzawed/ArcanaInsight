import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        arcana: {
          bg: "#0a0a1a",
          surface: "#12122a",
          card: "#1a1a3e",
          border: "#2a2a5e",
          purple: "#8b5cf6",
          indigo: "#6366f1",
          gold: "#f59e0b",
          silver: "#c0c0c0",
          text: "#e2e8f0",
          muted: "#94a3b8",
        },
      },
      fontFamily: {
        sans: ["var(--font-noto-sans-kr)", "sans-serif"],
        display: ["var(--font-gothic-a1)", "sans-serif"],
      },
      animation: {
        "float": "float 3s ease-in-out infinite",
        "glow": "glow 2s ease-in-out infinite alternate",
        "blink": "blink 3s ease-in-out infinite",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        glow: {
          "0%": { boxShadow: "0 0 5px rgba(139, 92, 246, 0.3)" },
          "100%": { boxShadow: "0 0 20px rgba(139, 92, 246, 0.6)" },
        },
        blink: {
          "0%, 45%, 55%, 100%": { transform: "scaleY(1)" },
          "50%": { transform: "scaleY(0.1)" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
