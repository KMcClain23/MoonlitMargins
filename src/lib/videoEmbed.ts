// Distinguishes an external video platform link (YouTube, Vimeo) from a
// direct video file URL (e.g. one uploaded to R2), and builds the right
// embeddable URL for the former.

export function getVideoEmbed(url: string): { provider: "youtube" | "vimeo"; embedUrl: string } | null {
  const youtubeMatch = url.match(
    /(?:youtube\.com\/watch\?v=|youtube\.com\/shorts\/|youtu\.be\/)([a-zA-Z0-9_-]{6,})/
  );
  if (youtubeMatch) {
    return { provider: "youtube", embedUrl: `https://www.youtube.com/embed/${youtubeMatch[1]}` };
  }

  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) {
    return { provider: "vimeo", embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}` };
  }

  return null;
}

/**
 * Pulls the real screencap for a YouTube/Vimeo link so the admin panel can
 * show something better than a generic placeholder icon while composing or
 * browsing memories. YouTube's thumbnail URL can be built directly from the
 * video ID (no network call needed); Vimeo doesn't expose a predictable URL
 * pattern, so this calls Vimeo's public oEmbed endpoint instead.
 */
const VIDEO_EXTENSIONS = [".mp4", ".webm", ".mov", ".m4v"];

/**
 * Auto-detects image vs video from the URL alone -- an embed link
 * (YouTube/Vimeo) or a file extension is enough, so the person adding a
 * memory never has to manually pick a type.
 */
export function detectMediaType(url: string): "image" | "video" {
  if (!url) return "image";
  if (getVideoEmbed(url)) return "video";
  const path = url.toLowerCase().split("?")[0];
  return VIDEO_EXTENSIONS.some((ext) => path.endsWith(ext)) ? "video" : "image";
}

export async function resolveVideoThumbnail(url: string): Promise<string | null> {
  const youtubeMatch = url.match(
    /(?:youtube\.com\/watch\?v=|youtube\.com\/shorts\/|youtu\.be\/)([a-zA-Z0-9_-]{6,})/
  );
  if (youtubeMatch) {
    return `https://img.youtube.com/vi/${youtubeMatch[1]}/hqdefault.jpg`;
  }

  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) {
    try {
      const res = await fetch(`https://vimeo.com/api/oembed.json?url=${encodeURIComponent(url)}`);
      if (!res.ok) return null;
      const data = await res.json();
      return data.thumbnail_url ?? null;
    } catch {
      return null;
    }
  }

  return null;
}
