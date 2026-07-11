import type { Metadata } from "next";
import { Fraunces, Manrope, IBM_Plex_Mono } from "next/font/google";
import SiteChrome from "@/components/SiteChrome";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  style: ["normal", "italic"],
  weight: ["400", "500", "600"],
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  weight: ["400", "500", "600", "700"],
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-plex-mono",
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "The Moonlit Margins Sisterhood | Virtual Book Club",
  description:
    "More than a book club. A sisterhood of readers across the country, connected through stories, monthly reads, and real community.",
  metadataBase: new URL("https://www.themoonlitmarginssisterhood.com"),
  openGraph: {
    title: "The Moonlit Margins Sisterhood",
    description:
      "A home for your reading life. Join a sisterhood of readers across the country.",
    url: "https://www.themoonlitmarginssisterhood.com",
    siteName: "The Moonlit Margins Sisterhood",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${fraunces.variable} ${manrope.variable} ${plexMono.variable}`}>
      <body className="bg-ink text-parchment antialiased">
        <SiteChrome>{children}</SiteChrome>
      </body>
    </html>
  );
}
