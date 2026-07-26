import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Next.js only serves image-optimizer requests whose `q=` value is in
    // this list -- 75 is next/image's own implicit default (used by every
    // <Image> in this app that doesn't pass a `quality` prop), 85 is what
    // MemberAvatarImage requests explicitly for its manually-built
    // /_next/image URL. Without this, any request for q=85 400s with
    // INVALID_IMAGE_OPTIMIZE_REQUEST.
    qualities: [75, 85],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "pub-*.r2.dev",
      },
      {
        // Temporary: imported member photos still point at Wix's CDN
        // until they're migrated to R2. Safe to remove once that's done.
        protocol: "https",
        hostname: "static.wixstatic.com",
      },
      {
        // YouTube's static thumbnail CDN, used for auto-pulled video screencaps.
        protocol: "https",
        hostname: "img.youtube.com",
      },
      {
        // Vimeo's thumbnail CDN, returned by their oEmbed API.
        protocol: "https",
        hostname: "i.vimeocdn.com",
      },
    ],
  },

  // Pre-configured ahead of the planned migration off the current live Wix
  // site onto this domain -- these old-site paths were confirmed by
  // fetching the live Wix site on 2026-07-26, and have no effect until
  // this app is actually serving that domain (Wix is still live there
  // right now). The moment DNS cutover happens, these 301s start
  // preserving whatever search ranking/backlinks the old Wix URLs
  // accumulated, redirecting them straight to their equivalent page here.
  async redirects() {
    return [
      { source: "/services-3", destination: "/join", permanent: true },
      { source: "/about-5-1", destination: "/interview", permanent: true },
      { source: "/about-1-1", destination: "/collab", permanent: true },
      { source: "/event-list", destination: "/events", permanent: true },
      { source: "/about-the-sisterhood", destination: "/sisterhood", permanent: true },
      { source: "/about-5", destination: "/memories", permanent: true },
    ];
  },
};

export default nextConfig;
