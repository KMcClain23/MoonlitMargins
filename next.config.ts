import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
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
};

export default nextConfig;
