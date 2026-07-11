import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#141227",
        surface: "#1E1B38",
        surfaceRaised: "#241F42",
        parchment: "#F3EFE6",
        muted: "#9C98B8",
        lilac: {
          DEFAULT: "#8E86E5",
          soft: "#B8B2F0",
          deep: "#5C51B8",
        },
        candle: {
          DEFAULT: "#E8A33D",
          soft: "#F2C87A",
        },
        hairline: "rgba(243, 239, 230, 0.12)",
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
          "radial-gradient(circle at 50% 0%, rgba(142,134,229,0.16), transparent 60%)",
      },
    },
  },
  plugins: [],
};

export default config;
