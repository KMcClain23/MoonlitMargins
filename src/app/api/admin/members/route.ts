import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { getSessionFromRequest } from "@/lib/adminAuth";

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
  hideFromDirectory: z.boolean().optional(),
});

// Full member fields -- also backs the mobile app's assignment picker,
// which only reads id/fullName and simply ignores the rest.
export async function GET(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const supabase = supabaseServer();
  const { data: members } = await supabase
    .from("members")
    .select(
      "id, full_name, role, bio, email, photo_url, photo_zoom, photo_offset_x, photo_offset_y, tier, socials, hide_from_directory"
    )
    .order("full_name", { ascending: true });

  return NextResponse.json({
    members: (members ?? []).map((m) => ({
      id: m.id,
      fullName: m.full_name,
      role: m.role,
      bio: m.bio,
      email: m.email,
      photoUrl: m.photo_url,
      photoZoom: m.photo_zoom,
      photoOffsetX: m.photo_offset_x,
      photoOffsetY: m.photo_offset_y,
      tier: m.tier,
      socials: m.socials,
      hideFromDirectory: m.hide_from_directory,
    })),
  });
}

export async function POST(request: NextRequest) {
  const parsed = memberSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { fullName, role, bio, email, photoUrl, photoZoom, photoOffsetX, photoOffsetY, tier, socials, hideFromDirectory } =
    parsed.data;
  const supabase = supabaseServer();
  const { error } = await supabase.from("members").insert({
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
    hide_from_directory: hideFromDirectory ?? false,
  });

  if (error) {
    return NextResponse.json({ error: "Could not add member" }, { status: 500 });
  }

  revalidatePath("/sisterhood");
  return NextResponse.json({ success: true });
}
