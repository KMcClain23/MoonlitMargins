import type { Metadata } from "next";
import { Fraunces, Manrope, IBM_Plex_Mono } from "next/font/google";
import SiteChrome from "@/components/SiteChrome";
import { DEFAULT_OG_IMAGE, SITE_NAME, SITE_URL } from "@/lib/seo";
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

// NOTE: metadataBase resolves any relative URLs in metadata into absolute
// ones. Driven by SITE_URL (see src/lib/seo.ts for the full
// NEXT_PUBLIC_SITE_URL -> VERCEL_PROJECT_PRODUCTION_URL -> hardcoded
// fallback chain, and why it exists) rather than hardcoded here.
export const metadata: Metadata = {
  title: {
    template: `%s | ${SITE_NAME}`,
    default: `${SITE_NAME} | Virtual Book Club`,
  },
  description:
    "More than a book club. A sisterhood of readers across the country, connected through stories, monthly reads, and real community.",
  metadataBase: new URL(SITE_URL),
  alternates: { canonical: "/" },
  openGraph: {
    title: SITE_NAME,
    description:
      "A home for your reading life. Join a sisterhood of readers across the country.",
    url: SITE_URL,
    siteName: SITE_NAME,
    type: "website",
    images: [DEFAULT_OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description:
      "A home for your reading life. Join a sisterhood of readers across the country.",
    images: [DEFAULT_OG_IMAGE.url],
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
