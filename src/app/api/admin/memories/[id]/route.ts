import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { detectMediaType } from "@/lib/videoEmbed";

const memorySchema = z.object({
  imageUrl: z.string().min(5),
  thumbnailUrl: z.string().optional(),
  title: z.string().optional(),
  caption: z.string().optional(),
});

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = supabaseServer();
  const { error } = await supabase.from("memories").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: "Could not delete memory" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const parsed = memorySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { imageUrl, thumbnailUrl, title, caption } = parsed.data;
  const supabase = supabaseServer();
  const { error } = await supabase
    .from("memories")
    .update({
      media_type: detectMediaType(imageUrl),
      image_url: imageUrl,
      thumbnail_url: thumbnailUrl || null,
      title: title || null,
      caption: caption || null,
    })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: "Could not update memory" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
