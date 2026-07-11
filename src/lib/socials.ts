import { FaTiktok, FaInstagram, FaFacebookF, FaXTwitter, FaYoutube, FaThreads, FaGoodreads } from "react-icons/fa6";
import type { IconType } from "react-icons";

export type SocialPlatformKey =
  | "tiktok" | "instagram" | "facebook" | "twitter" | "youtube" | "threads" | "goodreads";

export type SocialsMap = Partial<Record<SocialPlatformKey, string>>;

export const SOCIAL_PLATFORMS: {
  key: SocialPlatformKey;
  label: string;
  placeholder: string;
  Icon: IconType;
  base: string;
}[] = [
  { key: "tiktok", label: "TikTok", placeholder: "@handle", Icon: FaTiktok, base: "https://www.tiktok.com/@" },
  { key: "instagram", label: "Instagram", placeholder: "@handle", Icon: FaInstagram, base: "https://www.instagram.com/" },
  { key: "facebook", label: "Facebook", placeholder: "profile or page name", Icon: FaFacebookF, base: "https://www.facebook.com/" },
  { key: "twitter", label: "X", placeholder: "@handle", Icon: FaXTwitter, base: "https://x.com/" },
  { key: "youtube", label: "YouTube", placeholder: "@handle", Icon: FaYoutube, base: "https://www.youtube.com/@" },
  { key: "threads", label: "Threads", placeholder: "@handle", Icon: FaThreads, base: "https://www.threads.net/@" },
  { key: "goodreads", label: "Goodreads", placeholder: "profile name or full URL", Icon: FaGoodreads, base: "https://www.goodreads.com/" },
];

// Accepts either a bare handle (with or without a leading @) or a full URL
// someone pasted in directly — Goodreads profiles in particular are often
// numeric IDs that don't fit a clean "@handle" pattern, so a full-URL
// escape hatch is worth having for every platform, not just Goodreads.
export function buildSocialUrl(base: string, value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `${base}${trimmed.replace(/^@/, "")}`;
}
