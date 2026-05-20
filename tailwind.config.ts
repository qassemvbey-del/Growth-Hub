import type { Config } from "tailwindcss";

export default {
  darkMode: 'class',
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "var(--color-primary, #efffe3)",
        secondary: "#ebb2ff",
        background: "#131313",
        "neon-green": "var(--color-neon-green, #39ff14)",
        "neon-purple": "#b600f8",
        foreground: "#e5e2e1",
        surface: "#131313",
        "surface-accent": "#201f1f",
      },
      fontFamily: {
        space: ["Space Grotesk", "sans-serif"],
        inter: ["Inter", "sans-serif"],
        arabic: ["Tajawal", "sans-serif"],
        marker: ["Permanent Marker", "cursive"],
        exo: ["var(--font-exo2)", "sans-serif"],
      },
      borderRadius: {
        DEFAULT: "0.125rem",
      },
      animation: {
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        flicker: "flicker 0.15s infinite",
        wave: "wave 5s infinite linear",
        scanline: "scanline 8s linear infinite",
      },
      keyframes: {
        "pulse-glow": {
          "0%, 100%": { opacity: "0.5" },
          "50%": { opacity: "1" },
        },
        flicker: {
          "0%": { opacity: "0.97" },
          "5%": { opacity: "0.95" },
          "10%": { opacity: "0.9" },
          "15%": { opacity: "0.95" },
          "20%": { opacity: "0.98" },
          "25%": { opacity: "0.95" },
          "30%": { opacity: "0.99" },
          "35%": { opacity: "0.95" },
          "40%": { opacity: "0.9" },
          "45%": { opacity: "0.95" },
          "50%": { opacity: "0.98" },
          "55%": { opacity: "0.95" },
          "60%": { opacity: "0.99" },
          "65%": { opacity: "0.95" },
          "70%": { opacity: "0.9" },
          "75%": { opacity: "0.95" },
          "80%": { opacity: "0.98" },
          "85%": { opacity: "0.95" },
          "90%": { opacity: "0.99" },
          "95%": { opacity: "0.95" },
          "100%": { opacity: "0.97" },
        },
        wave: {
          "0%": { transform: "translateX(-50%) rotate(0deg)" },
          "100%": { transform: "translateX(-50%) rotate(360deg)" },
        },
        scanline: {
          "0%": { left: "-100%" },
          "100%": { left: "100%" },
        }
      },
    },
  },
  plugins: [],
} satisfies Config;
