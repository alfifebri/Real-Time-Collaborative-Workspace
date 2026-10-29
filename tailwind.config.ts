import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: {
          DEFAULT: "rgb(var(--canvas) / <alpha-value>)",
          soft: "rgb(var(--canvas-soft) / <alpha-value>)",
          raised: "rgb(var(--surface-raised) / <alpha-value>)",
          overlay: "rgb(var(--surface-overlay) / <alpha-value>)",
        },
        surface: {
          DEFAULT: "rgb(var(--surface) / <alpha-value>)",
          raised: "rgb(var(--surface-raised) / <alpha-value>)",
        },
        line: {
          DEFAULT: "rgb(var(--line) / <alpha-value>)",
          bright: "rgb(var(--line-bright) / <alpha-value>)",
        },
        ink: {
          DEFAULT: "rgb(var(--ink) / <alpha-value>)",
          muted: "rgb(var(--ink-muted) / <alpha-value>)",
          faint: "rgb(var(--ink-faint) / <alpha-value>)",
          strong: "rgb(var(--ink-strong) / <alpha-value>)",
        },
        tint: {
          1: "rgb(var(--tint-base) / var(--tint-1-alpha))",
          2: "rgb(var(--tint-base) / var(--tint-2-alpha))",
          3: "rgb(var(--tint-base) / var(--tint-3-alpha))",
          4: "rgb(var(--tint-base) / var(--tint-4-alpha))",
          5: "rgb(var(--tint-base) / var(--tint-5-alpha))",
        },
        neon: {
          cyan: "rgb(var(--neon-cyan) / <alpha-value>)",
          indigo: "rgb(var(--neon-indigo) / <alpha-value>)",
          coral: "rgb(var(--neon-coral) / <alpha-value>)",
          violet: "rgb(var(--neon-violet) / <alpha-value>)",
          emerald: "rgb(var(--neon-emerald) / <alpha-value>)",
          amber: "rgb(var(--neon-amber) / <alpha-value>)",
        },
      },
      fontFamily: {
        sans: ["var(--font-geist)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      boxShadow: {
        glow: "0 0 0 1px rgb(var(--neon-cyan) / 0.14), 0 0 32px rgb(var(--neon-cyan) / 0.08)",
        panel:
          "0 28px 80px -36px rgb(var(--shadow-base) / 0.9), 0 0 0 1px rgb(var(--line-bright) / 0.55)",
        float:
          "0 16px 48px -20px rgb(var(--shadow-base) / 0.75), 0 0 0 1px rgb(var(--line-bright) / 0.5)",
        "soft-inset": "inset 0 1px 0 rgb(var(--tint-base) / 0.045)",
      },
      backgroundImage: {
        "grid-faint":
          "linear-gradient(to right, rgb(var(--tint-base) / 0.022) 1px, transparent 1px), linear-gradient(to bottom, rgb(var(--tint-base) / 0.022) 1px, transparent 1px)",
        "radial-spot":
          "radial-gradient(ellipse 70% 55% at 50% 0%, rgb(var(--neon-cyan) / 0.08), transparent 72%)",
      },
      keyframes: {
        "pulse-ring": {
          "0%": { transform: "scale(0.9)", opacity: "0.8" },
          "70%": { transform: "scale(1.6)", opacity: "0" },
          "100%": { transform: "scale(1.6)", opacity: "0" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "pulse-ring": "pulse-ring 2.2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        shimmer: "shimmer 2.4s linear infinite",
        "fade-up": "fade-up 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
      },
      transitionTimingFunction: {
        smooth: "cubic-bezier(0.16, 1, 0.3, 1)",
      },
    },
  },
  plugins: [require("@tailwindcss/typography"), require("tailwindcss-animate")],
};

export default config;
