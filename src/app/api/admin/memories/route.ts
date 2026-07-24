import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { detectMediaType, getVideoEmbed, resolveVideoThumbnail } from "@/lib/videoEmbed";

const memorySchema = z.object({
  imageUrl: z.string().min(5),
  thumbnailUrl: z.string().optional(),
  title: z.string().optional(),
  caption: z.string().optional(),
  publishedAt: z.string().optional(),
});

export async function GET() {
  const supabase = supabaseServer();
  const { data: memories } = await supabase
    .from("memories")
    .select("id, media_type, image_url, thumbnail_url, title, caption, published_at, created_at")
    .order("created_at", { ascending: false });

  // Same fallback the public /memories page already applies for a
  // YouTube/Vimeo memory with no manually-set thumbnail_url -- but unlike
  // that page (which re-resolves fresh, accepting the network cost, on
  // every single request), the resolved value is persisted back to
  // thumbnail_url below so this only ever needs to happen once per
  // memory. Resolution itself is awaited (the caller needs the real
  // value in this response), but the DB write-back is fire-and-forget --
  // it must not delay the response or fail it if the write itself fails.
  const resolvedThumbnails = new Map<string, string | null>();
  await Promise.all(
    (memories ?? [])
      .filter((m) => !m.thumbnail_url && getVideoEmbed(m.image_url))
      .map(async (m) => {
        const resolved = await resolveVideoThumbnail(m.image_url);
        resolvedThumbnails.set(m.id, resolved);
        if (resolved) {
          void supabase
            .from("memories")
            .update({ thumbnail_url: resolved })
            .eq("id", m.id)
            .then(({ error }) => {
              if (error) console.error("Could not persist resolved video thumbnail", m.id, error);
            });
        }
      })
  );

  // Mirrors the effective-date sort both /memories and /admin/memories
  // apply client-side (published_at when set, otherwise created_at) --
  // Supabase's query builder can't express a COALESCE-based order-by, so
  // the sort happens here instead of at the query level.
  const sorted = [...(memories ?? [])].sort((a, b) => {
    const aDate = a.published_at ?? a.created_at;
    const bDate = b.published_at ?? b.created_at;
    return new Date(bDate).getTime() - new Date(aDate).getTime();
  });

  return NextResponse.json({
    memories: sorted.map((m) => ({
      id: m.id,
      mediaType: m.media_type,
      imageUrl: m.image_url,
      // Never null for a resolvable video link -- either the stored
      // value, or whatever was just resolved above.
      thumbnailUrl: m.thumbnail_url ?? resolvedThumbnails.get(m.id) ?? null,
      title: m.title,
      caption: m.caption,
      publishedAt: m.published_at,
      createdAt: m.created_at,
    })),
  });
}

export async function POST(request: NextRequest) {
  const parsed = memorySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { imageUrl, thumbnailUrl, title, caption, publishedAt } = parsed.data;
  const supabase = supabaseServer();
  const { error } = await supabase.from("memories").insert({
    media_type: detectMediaType(imageUrl),
    image_url: imageUrl,
    thumbnail_url: thumbnailUrl || null,
    title: title || null,
    caption: caption || null,
    published_at: publishedAt || null,
  });

  if (error) {
    return NextResponse.json({ error: "Could not add memory" }, { status: 500 });
  }

  revalidatePath("/memories");
  return NextResponse.json({ success: true });
}
