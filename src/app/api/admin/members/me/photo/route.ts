import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { getSessionFromRequest } from "@/lib/adminAuth";

const photoSchema = z.object({
  photoUrl: z.string(),
  photoZoom: z.number().min(1).max(3).optional(),
  photoOffsetX: z.number().min(-50).max(50).optional(),
  photoOffsetY: z.number().min(-50).max(50).optional(),
});

// Self-service exception to the "members" section gate (see middleware.ts's
// isOwnPhotoUpdateRequest) -- any admin_user with a linked member profile
// can update THEIR OWN photo here, regardless of whether they have roster-
// management access. Deliberately narrow: only photo_* columns on only
// session.memberId's own row are ever touched, unlike the full
// /api/admin/members/[id] PATCH route.
export async function PATCH(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  if (!session.memberId) {
    return NextResponse.json({ error: "No linked member profile to attach a photo to" }, { status: 400 });
  }

  const parsed = photoSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { photoUrl, photoZoom, photoOffsetX, photoOffsetY } = parsed.data;
  const supabase = supabaseServer();

  const update = {
    photo_url: photoUrl || null,
    photo_zoom: photoZoom ?? 1,
    photo_offset_x: photoOffsetX ?? 0,
    photo_offset_y: photoOffsetY ?? 0,
  };

  const { error } = await supabase.from("members").update(update).eq("id", session.memberId);

  if (error) {
    return NextResponse.json({ error: "Could not update your photo" }, { status: 500 });
  }

  // The public sisterhood page shows this same photo -- same
  // revalidation the full members PATCH route does for photo_* changes.
  revalidatePath("/sisterhood");

  return NextResponse.json({
    photoUrl: update.photo_url,
    photoZoom: update.photo_zoom,
    photoOffsetX: update.photo_offset_x,
    photoOffsetY: update.photo_offset_y,
  });
}
