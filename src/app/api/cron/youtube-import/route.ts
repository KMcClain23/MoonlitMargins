import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { getSyncState, setSyncState } from "@/lib/googleCalendar";
import { getChannelUploadsPlaylistId, listRecentUploads } from "@/lib/youtubeImport";
import { detectMediaType } from "@/lib/videoEmbed";

// Deliberately outside /api/admin -- same reasoning as planner-sync/
// route.ts and planner-notifications/route.ts: Vercel Cron has no admin
// session to send, so middleware.ts's normal auth gate doesn't (and
// can't) apply here. Protected instead by the same CRON_SECRET
// shared-secret bearer header those routes use (see vercel.json).
//
// Reuses app_sync_state's getSyncState/setSyncState (already built for
// the planner's Google Calendar sync token) as a generic last-check
// timestamp store -- that's exactly what this table exists for, not
// planner-specific.

const LAST_CHECK_KEY = "youtube_import_last_check";

function watchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }

  const playlistId = await getChannelUploadsPlaylistId();
  if (!playlistId) {
    return NextResponse.json({ error: "Could not resolve the channel's uploads playlist" }, { status: 502 });
  }

  const lastCheck = await getSyncState(LAST_CHECK_KEY);
  const uploads = await listRecentUploads(playlistId, lastCheck ?? undefined);

  const supabase = supabaseServer();
  let created = 0;
  let skipped = 0;

  for (const video of uploads) {
    const imageUrl = watchUrl(video.videoId);

    // Matches by the exact watch URL stored in image_url -- the same
    // value MemoryForm's own MediaUpload field would store for someone
    // pasting this same link in by hand, so an auto-imported video and a
    // manually-added one for the same upload can never both exist as
    // separate rows.
    const { data: existing } = await supabase.from("memories").select("id").eq("image_url", imageUrl).maybeSingle();
    if (existing) {
      skipped += 1;
      continue;
    }

    const { error } = await supabase.from("memories").insert({
      media_type: detectMediaType(imageUrl),
      image_url: imageUrl,
      thumbnail_url: video.thumbnailUrl,
      title: video.title,
      published_at: video.publishedAt,
    });

    if (error) {
      console.error("[youtube-import] Could not insert memory for", video.videoId, error);
      skipped += 1;
    } else {
      created += 1;
    }
  }

  // Advances to "now," not to the newest video's own publishedAt -- this
  // run may have found zero videos (channel quiet for a while), and "now"
  // still correctly bounds the next run's window either way without ever
  // re-scanning a period this run already covered.
  await setSyncState(LAST_CHECK_KEY, new Date().toISOString());

  return NextResponse.json({ success: true, created, skipped });
}
