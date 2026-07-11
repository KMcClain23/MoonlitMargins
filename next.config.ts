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
};

export default nextConfig;
