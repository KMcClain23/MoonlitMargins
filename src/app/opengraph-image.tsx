import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "The Moonlit Margins Sisterhood";

export default function OpengraphImage() {
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
          backgroundColor: "#0A0A14",
        }}
      >
        <svg width="120" height="120" viewBox="0 0 32 32" fill="none">
          <path
            d="M20 4C13.4 4 8 9.4 8 16s5.4 12 12 12c1.4 0 2.7-.2 4-.7-4.7-1.7-8-6.1-8-11.3s3.3-9.6 8-11.3c-1.3-.5-2.6-.7-4-.7z"
            fill="#C7CAD1"
          />
          <path
            d="M18.5 12c.3 1.4-.6 2-.9 3.1-.4 1.3.2 2.3 1.2 2.7-.1-1 .3-1.5.7-2 .1.6.5.9.9 1.4.5.7.5 1.6-.1 2.3-.9 1-2.5 1-3.6.2-1.4-1-1.9-2.9-1.2-4.5.4-1 1.4-1.8 3-3.2z"
            fill="#E8973D"
          />
        </svg>

        <div
          style={{
            marginTop: 32,
            fontSize: 64,
            color: "#EDEDF2",
            fontWeight: 600,
            textAlign: "center",
          }}
        >
          The Moonlit Margins Sisterhood
        </div>

        <div
          style={{
            marginTop: 20,
            fontSize: 28,
            color: "#E8973D",
            textAlign: "center",
          }}
        >
          A home for your reading life.
        </div>
      </div>
    ),
    { ...size }
  );
}
