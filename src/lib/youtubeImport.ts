// Resolves the sisterhood's YouTube channel handle to its auto-generated
// "uploads" playlist, then lists recent videos from it -- both via the
// public YouTube Data API v3 with just an API key (YOUTUBE_API_KEY),
// no OAuth/service account needed, since this only ever reads public
// channel data. Used by /api/cron/youtube-import to auto-create Memory
// rows for new uploads.

const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3";

// channels.list's forHandle expects the handle in the same "@name" form
// users see on youtube.com (confirmed against the current Data API v3
// reference for channels.list -- forHandle is the dedicated parameter for
// @handle-style identifiers, distinct from the older, username-only
// forUsername). YOUTUBE_CHANNEL_HANDLE could reasonably be set either
// with or without the leading "@", so this normalizes to exactly one
// regardless of which was configured.
function normalizeHandle(handle: string): string {
  const trimmed = handle.trim();
  return trimmed.startsWith("@") ? trimmed : `@${trimmed}`;
}

/** Resolves YOUTUBE_CHANNEL_HANDLE to its channel's "uploads" playlist ID.
 * Returns null on any failure (missing config, network error, non-2xx
 * response, or a handle that doesn't resolve to a channel) -- callers
 * treat null as "import didn't run this time," never as a reason to
 * throw. */
export async function getChannelUploadsPlaylistId(): Promise<string | null> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  const rawHandle = process.env.YOUTUBE_CHANNEL_HANDLE;
  if (!apiKey || !rawHandle) {
    console.warn("[youtubeImport] Missing YOUTUBE_API_KEY or YOUTUBE_CHANNEL_HANDLE");
    return null;
  }

  const handle = normalizeHandle(rawHandle);

  try {
    const params = new URLSearchParams({ part: "contentDetails", forHandle: handle, key: apiKey });
    const res = await fetch(`${YOUTUBE_API_BASE}/channels?${params.toString()}`);
    if (!res.ok) {
      console.error("[youtubeImport] channels.list failed:", res.status, await res.text());
      return null;
    }
    const data = await res.json();
    const playlistId = data.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
    if (typeof playlistId !== "string") {
      console.error("[youtubeImport] channels.list returned no uploads playlist for handle", handle, data);
      return null;
    }
    return playlistId;
  } catch (err) {
    console.error("[youtubeImport] channels.list request threw:", err);
    return null;
  }
}

export interface YoutubeUploadItem {
  videoId: string;
  title: string;
  /** ISO 8601, as returned by the API. */
  publishedAt: string;
  thumbnailUrl: string | null;
}

// playlistItems.list has no publishedAfter-style query parameter (that's
// a search.list-only filter) -- YouTube's auto-generated "uploads"
// playlist is always newest-first by upload date, though, so filtering
// happens here by paging through and stopping the moment an item at or
// before the cutoff is seen, rather than fetching everything every run.
// MAX_PAGES is a ceiling (250 videos) so a first-ever run with no
// publishedAfter yet -- or a stale/corrupted cutoff -- can't page forever;
// a normal run on this cron's own cadence only ever needs page one.
const MAX_PAGES = 5;
const PAGE_SIZE = 50;

/** Lists uploads from `playlistId`, newest first. When `publishedAfter`
 * is given (an ISO timestamp), stops as soon as it reaches a video
 * published at or before that time -- everything returned is strictly
 * newer. Returns whatever was successfully collected before any failure
 * (including none, on a fully failed first request) rather than
 * throwing. */
export async function listRecentUploads(playlistId: string, publishedAfter?: string): Promise<YoutubeUploadItem[]> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    console.warn("[youtubeImport] Missing YOUTUBE_API_KEY");
    return [];
  }

  const cutoff = publishedAfter ? new Date(publishedAfter).getTime() : null;
  const results: YoutubeUploadItem[] = [];
  let pageToken: string | undefined;
  let page = 0;

  try {
    do {
      const params = new URLSearchParams({
        part: "snippet",
        playlistId,
        maxResults: String(PAGE_SIZE),
        key: apiKey,
      });
      if (pageToken) params.set("pageToken", pageToken);

      const res = await fetch(`${YOUTUBE_API_BASE}/playlistItems?${params.toString()}`);
      if (!res.ok) {
        console.error("[youtubeImport] playlistItems.list failed:", res.status, await res.text());
        break;
      }

      const data = await res.json();
      const items: unknown[] = Array.isArray(data.items) ? data.items : [];

      let hitCutoff = false;
      for (const raw of items) {
        const item = raw as { snippet?: Record<string, unknown> };
        const snippet = item.snippet;
        const resourceId = snippet?.resourceId as { videoId?: string } | undefined;
        const videoId = resourceId?.videoId;
        const publishedAt = snippet?.publishedAt;
        if (typeof videoId !== "string" || typeof publishedAt !== "string") continue;

        if (cutoff !== null && new Date(publishedAt).getTime() <= cutoff) {
          hitCutoff = true;
          break;
        }

        const thumbnails = (snippet?.thumbnails ?? {}) as Record<string, { url?: string } | undefined>;
        const thumbnailUrl =
          thumbnails.maxres?.url ?? thumbnails.high?.url ?? thumbnails.medium?.url ?? thumbnails.default?.url ?? null;

        results.push({
          videoId,
          title: typeof snippet?.title === "string" ? snippet.title : "Untitled video",
          publishedAt,
          thumbnailUrl,
        });
      }

      if (hitCutoff) break;
      pageToken = data.nextPageToken;
      page += 1;
    } while (pageToken && page < MAX_PAGES);

    return results;
  } catch (err) {
    console.error("[youtubeImport] playlistItems.list request threw:", err);
    return results;
  }
}
