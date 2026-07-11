import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { detectMediaType } from "@/lib/videoEmbed";

const memorySchema = z.object({
  imageUrl: z.string().min(5),
  thumbnailUrl: z.string().optional(),
  caption: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const parsed = memorySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { imageUrl, thumbnailUrl, caption } = parsed.data;
  const supabase = supabaseServer();
  const { error } = await supabase.from("memories").insert({
    media_type: detectMediaType(imageUrl),
    image_url: imageUrl,
    thumbnail_url: thumbnailUrl || null,
    caption: caption || null,
  });

  if (error) {
    return NextResponse.json({ error: "Could not add memory" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
