import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";

const memberSchema = z.object({
  fullName: z.string().min(2),
  role: z.string().optional(),
  bio: z.string().optional(),
  email: z.string().optional(),
  photoUrl: z.string().optional(),
  photoZoom: z.number().min(1).max(3).optional(),
  photoOffsetX: z.number().min(-50).max(50).optional(),
  photoOffsetY: z.number().min(-50).max(50).optional(),
  tier: z.enum(["founder", "council", "junior_council", "member"]).optional(),
  socials: z.record(z.string()).optional(),
});

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = supabaseServer();
  const { error } = await supabase.from("members").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: "Could not delete member" }, { status: 500 });
  }

  revalidatePath("/sisterhood");
  return NextResponse.json({ success: true });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const parsed = memberSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { fullName, role, bio, email, photoUrl, photoZoom, photoOffsetX, photoOffsetY, tier, socials } = parsed.data;
  const supabase = supabaseServer();
  const { error } = await supabase
    .from("members")
    .update({
      full_name: fullName,
      role: role || null,
      bio: bio || null,
      email: email || null,
      photo_url: photoUrl || null,
      photo_zoom: photoZoom ?? 1,
      photo_offset_x: photoOffsetX ?? 0,
      photo_offset_y: photoOffsetY ?? 0,
      tier: tier ?? "member",
      is_leadership: tier ? tier !== "member" : false,
      socials: socials ?? {},
    })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: "Could not update member" }, { status: 500 });
  }

  revalidatePath("/sisterhood");
  return NextResponse.json({ success: true });
}
