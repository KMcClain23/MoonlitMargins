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
  const path = url.toLowerCase().split("?")[0] ?? "";
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

function getYoutubeVideoId(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/watch\?v=|youtube\.com\/shorts\/|youtu\.be\/)([a-zA-Z0-9_-]{6,})/
  );
  return match ? (match[1] ?? null) : null;
}

type YoutubeMetadata = {
  title: string | null;
  description: string | null;
  publishedAt: string | null;
};

// The full YouTube Data API v3 -- unlike oEmbed, this returns a real
// description and the video's actual upload date, but needs an API key
// (free tier, generous quota for a site this size). Returns null entirely
// if YOUTUBE_API_KEY isn't configured, so every caller below falls back to
// oEmbed automatically when it's absent.
async function resolveYoutubeMetadata(videoId: string): Promise<YoutubeMetadata | null> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=snippet&key=${apiKey}`
    );
    if (!res.ok) return null;
    const data = await res.json();
    const snippet = data.items?.[0]?.snippet;
    if (!snippet) return null;

    return {
      title: typeof snippet.title === "string" ? snippet.title : null,
      description: typeof snippet.description === "string" ? snippet.description : null,
      publishedAt: typeof snippet.publishedAt === "string" ? snippet.publishedAt : null,
    };
  } catch {
    return null;
  }
}

export async function resolveVideoTitle(url: string): Promise<string | null> {
  const embed = getVideoEmbed(url);
  if (!embed) return null;

  if (embed.provider === "youtube") {
    const videoId = getYoutubeVideoId(url);
    const viaDataApi = videoId ? await resolveYoutubeMetadata(videoId) : null;
    if (viaDataApi?.title) return viaDataApi.title;
  }

  const oembedUrl =
    embed.provider === "youtube"
      ? `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`
      : `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(url)}`;

  try {
    const res = await fetch(oembedUrl);
    if (!res.ok) return null;
    const data = await res.json();
    return typeof data.title === "string" ? data.title : null;
  } catch {
    return null;
  }
}

/**
 * Pulls the video's description, when the source platform provides one.
 * For YouTube, this needs YOUTUBE_API_KEY configured (see resolveYoutubeMetadata) --
 * YouTube's oEmbed alone has no description field at all. Vimeo's oEmbed
 * does include a description, so that path needs no API key.
 */
export async function resolveVideoDescription(url: string): Promise<string | null> {
  const embed = getVideoEmbed(url);
  if (!embed) return null;

  if (embed.provider === "youtube") {
    const videoId = getYoutubeVideoId(url);
    const viaDataApi = videoId ? await resolveYoutubeMetadata(videoId) : null;
    return viaDataApi?.description ?? null;
  }

  try {
    const res = await fetch(`https://vimeo.com/api/oembed.json?url=${encodeURIComponent(url)}`);
    if (!res.ok) return null;
    const data = await res.json();
    return typeof data.description === "string" ? data.description : null;
  } catch {
    return null;
  }
}

/**
 * Pulls the video's real publish/upload date. Currently YouTube-only (via
 * the Data API, needs YOUTUBE_API_KEY) -- Vimeo's oEmbed doesn't expose an
 * upload date either, so this returns null for Vimeo links.
 */
export async function resolveVideoPublishedAt(url: string): Promise<string | null> {
  const embed = getVideoEmbed(url);
  if (!embed || embed.provider !== "youtube") return null;

  const videoId = getYoutubeVideoId(url);
  if (!videoId) return null;

  const metadata = await resolveYoutubeMetadata(videoId);
  return metadata?.publishedAt ?? null;
}
