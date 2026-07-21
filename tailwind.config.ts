import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0A0A14",
        surface: "#131320",
        surfaceRaised: "#1B1B2C",
        parchment: "#EDEDF2",
        muted: "#9497AC",
        lilac: {
          DEFAULT: "#E8973D",
          soft: "#F2C177",
          deep: "#B8701F",
        },
        candle: {
          DEFAULT: "#D9662E",
          soft: "#E8916A",
        },
        hairline: "rgba(237, 237, 242, 0.12)",
      },
      fontFamily: {
        display: ["var(--font-fraunces)", "Georgia", "serif"],
        body: ["var(--font-manrope)", "system-ui", "sans-serif"],
        mono: ["var(--font-plex-mono)", "monospace"],
      },
      letterSpacing: {
        eyebrow: "0.14em",
      },
      maxWidth: {
        prose: "68ch",
      },
      backgroundImage: {
        "moon-glow":
          "radial-gradient(circle at 50% 0%, rgba(232,151,61,0.14), transparent 60%)",
      },
    },
  },
  plugins: [],
};

export default config;
