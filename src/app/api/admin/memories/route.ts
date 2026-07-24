import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { detectMediaType } from "@/lib/videoEmbed";

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
      thumbnailUrl: m.thumbnail_url,
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
